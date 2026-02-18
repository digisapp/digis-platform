import { db } from '@/lib/data/system';
import { vodTranscripts, vods } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { TranscriptSegment, TranscriptChapter } from '@/db/schema/transcripts';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

interface TranscriptionResult {
  fullText: string;
  segments: TranscriptSegment[];
  language: string;
  durationSeconds: number;
  wordCount: number;
}

/**
 * TranscriptionService
 *
 * Handles VOD transcription (Deepgram) and chapter generation (Grok).
 * Provider-agnostic: swap transcription provider via TRANSCRIPTION_PROVIDER env var.
 */
export class TranscriptionService {

  /**
   * Process a VOD: transcribe audio → generate chapters → save results
   */
  static async processVod(transcriptId: string): Promise<void> {
    try {
      // Get transcript record with VOD info
      const transcript = await db.query.vodTranscripts.findFirst({
        where: eq(vodTranscripts.id, transcriptId),
        with: { vod: true },
      });

      if (!transcript || !transcript.vod) {
        throw new Error('Transcript or VOD not found');
      }

      const videoUrl = transcript.vod.videoUrl;
      if (!videoUrl) {
        throw new Error('VOD has no video URL');
      }

      // Step 1: Transcribe
      await db.update(vodTranscripts)
        .set({ status: 'transcribing' })
        .where(eq(vodTranscripts.id, transcriptId));

      const result = await this.transcribeAudio(videoUrl, transcript.vod.duration || 0);

      // Step 2: Generate chapters
      await db.update(vodTranscripts)
        .set({ status: 'generating' })
        .where(eq(vodTranscripts.id, transcriptId));

      const chapters = await this.generateChapters(
        result.fullText,
        result.segments,
        transcript.vod.title,
        result.durationSeconds
      );

      // Step 3: Save completed result
      const costCents = Math.ceil((result.durationSeconds / 60) * 0.43); // Deepgram: $0.0043/min = 0.43 cents/min

      await db.update(vodTranscripts)
        .set({
          status: 'completed',
          fullText: result.fullText,
          segments: result.segments,
          chapters,
          language: result.language,
          durationSeconds: result.durationSeconds,
          wordCount: result.wordCount,
          provider: 'deepgram',
          costCents,
          completedAt: new Date(),
        })
        .where(eq(vodTranscripts.id, transcriptId));

      console.log(`[Transcription] Completed for VOD ${transcript.vodId} (${result.durationSeconds}s, ${result.wordCount} words, ${chapters.length} chapters)`);

    } catch (error: any) {
      console.error(`[Transcription] Failed for transcript ${transcriptId}:`, error.message);
      await db.update(vodTranscripts)
        .set({
          status: 'failed',
          errorMessage: error.message?.substring(0, 500),
        })
        .where(eq(vodTranscripts.id, transcriptId));
    }
  }

  /**
   * Transcribe audio using Deepgram Nova-2
   */
  private static async transcribeAudio(videoUrl: string, estimatedDuration: number): Promise<TranscriptionResult> {
    if (!DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    // Deepgram accepts a URL directly — no need to download the file
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true&utterances=true&detect_language=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const result = data.results?.channels?.[0]?.alternatives?.[0];

    if (!result) {
      throw new Error('No transcription result from Deepgram');
    }

    // Build timestamped segments from paragraphs
    const segments: TranscriptSegment[] = [];

    if (result.paragraphs?.paragraphs) {
      for (const paragraph of result.paragraphs.paragraphs) {
        for (const sentence of paragraph.sentences) {
          segments.push({
            start: sentence.start,
            end: sentence.end,
            text: sentence.text.trim(),
          });
        }
      }
    } else if (result.words) {
      // Fallback: group words into ~10-second segments
      let currentSegment: TranscriptSegment | null = null;

      for (const word of result.words) {
        if (!currentSegment || word.start - currentSegment.start > 10) {
          if (currentSegment) {
            currentSegment.text = currentSegment.text.trim();
            segments.push(currentSegment);
          }
          currentSegment = { start: word.start, end: word.end, text: '' };
        }
        currentSegment.end = word.end;
        currentSegment.text += (currentSegment.text ? ' ' : '') + word.punctuated_word || word.word;
      }

      if (currentSegment && currentSegment.text.trim()) {
        currentSegment.text = currentSegment.text.trim();
        segments.push(currentSegment);
      }
    }

    const fullText = result.transcript || segments.map(s => s.text).join(' ');
    const detectedLang = data.results?.channels?.[0]?.detected_language || 'en';
    const duration = data.metadata?.duration || estimatedDuration;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      segments,
      language: detectedLang,
      durationSeconds: Math.round(duration),
      wordCount,
    };
  }

  /**
   * Generate chapters from transcript using Grok-3-mini
   */
  private static async generateChapters(
    fullText: string,
    segments: TranscriptSegment[],
    vodTitle: string,
    durationSeconds: number
  ): Promise<TranscriptChapter[]> {
    if (!XAI_API_KEY) {
      console.warn('[Transcription] XAI_API_KEY not set, skipping chapter generation');
      return [];
    }

    // Don't generate chapters for very short content
    if (durationSeconds < 120) {
      return [];
    }

    // Build a condensed version with timestamps for the LLM
    const timestampedText = segments.map(s => {
      const mins = Math.floor(s.start / 60);
      const secs = Math.floor(s.start % 60);
      return `[${mins}:${secs.toString().padStart(2, '0')}] ${s.text}`;
    }).join('\n');

    // Truncate if very long (keep first ~12000 chars to stay within token limits)
    const truncated = timestampedText.length > 12000
      ? timestampedText.substring(0, 12000) + '\n[... transcript continues ...]'
      : timestampedText;

    const durationMins = Math.round(durationSeconds / 60);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: `You analyze video transcripts and generate chapters (topic segments). Return a JSON array only, no other text. Each chapter has: title (short, 3-8 words), summary (1 sentence), startSeconds (number), endSeconds (number). Generate 3-10 chapters depending on content length. The video is ${durationMins} minutes long. Chapters must cover the full duration without gaps or overlaps.`,
          },
          {
            role: 'user',
            content: `Video title: "${vodTitle}"\n\nTimestamped transcript:\n${truncated}\n\nGenerate chapters as a JSON array:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('[Transcription] Grok chapter generation failed:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return [];

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const chapters: TranscriptChapter[] = JSON.parse(jsonMatch[0]);

      // Validate and clean
      return chapters
        .filter((c: any) =>
          typeof c.title === 'string' &&
          typeof c.startSeconds === 'number' &&
          typeof c.endSeconds === 'number' &&
          c.startSeconds >= 0 &&
          c.endSeconds > c.startSeconds
        )
        .map((c: any) => ({
          title: c.title.substring(0, 100),
          summary: (c.summary || '').substring(0, 200),
          startSeconds: Math.round(c.startSeconds),
          endSeconds: Math.min(Math.round(c.endSeconds), durationSeconds),
        }));
    } catch {
      console.error('[Transcription] Failed to parse chapter JSON');
      return [];
    }
  }
}

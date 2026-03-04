import { db } from '@/lib/data/system';
import { aiTwinSettings, users, contentItems, vodTranscripts, messages } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MANAGEMENT_API_KEY = process.env.XAI_MANAGEMENT_API_KEY;
const MANAGEMENT_API_URL = 'https://management-api.x.ai/v1';
const API_URL = 'https://api.x.ai/v1';

interface SyncResult {
  success: boolean;
  documentCount: number;
  error?: string;
}

interface SearchResult {
  text: string;
  score?: number;
}

/**
 * xAI Collections Service
 * Manages RAG knowledge bases for AI Twins using xAI Collections API
 */
export class XaiCollectionsService {
  /**
   * Create a new xAI collection for a creator
   */
  static async createCollection(creatorId: string, creatorName: string): Promise<string | null> {
    if (!XAI_MANAGEMENT_API_KEY) {
      console.error('[xAI Collections] XAI_MANAGEMENT_API_KEY not configured');
      return null;
    }

    try {
      const response = await fetch(`${MANAGEMENT_API_URL}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_MANAGEMENT_API_KEY}`,
        },
        body: JSON.stringify({
          collection_name: `digis-creator-${creatorId.substring(0, 8)}-${creatorName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20)}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[xAI Collections] Failed to create collection:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      const collectionId = data.id || data.collection_id;

      if (!collectionId) {
        console.error('[xAI Collections] No collection ID in response:', data);
        return null;
      }

      // Save collection ID to creator's settings
      await db
        .update(aiTwinSettings)
        .set({ xaiCollectionId: collectionId, updatedAt: new Date() })
        .where(eq(aiTwinSettings.creatorId, creatorId));

      console.log(`[xAI Collections] Created collection ${collectionId} for creator ${creatorId}`);
      return collectionId;
    } catch (error) {
      console.error('[xAI Collections] Error creating collection:', error);
      return null;
    }
  }

  /**
   * Upload a document to a collection (two-step: upload file, then add to collection)
   */
  static async uploadDocument(collectionId: string, filename: string, content: string): Promise<boolean> {
    if (!XAI_API_KEY || !XAI_MANAGEMENT_API_KEY) return false;

    try {
      // Step 1: Upload file to xAI
      const blob = new Blob([content], { type: 'text/markdown' });
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('purpose', 'assistants');

      const uploadResponse = await fetch(`${API_URL}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`[xAI Collections] Failed to upload file ${filename}:`, uploadResponse.status, errorText);
        return false;
      }

      const fileData = await uploadResponse.json();
      const fileId = fileData.id;

      if (!fileId) {
        console.error('[xAI Collections] No file ID in upload response:', fileData);
        return false;
      }

      // Step 2: Add file to collection
      const addResponse = await fetch(`${MANAGEMENT_API_URL}/collections/${collectionId}/documents/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_MANAGEMENT_API_KEY}`,
        },
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.error(`[xAI Collections] Failed to add file to collection:`, addResponse.status, errorText);
        return false;
      }

      console.log(`[xAI Collections] Uploaded ${filename} to collection ${collectionId}`);
      return true;
    } catch (error) {
      console.error(`[xAI Collections] Error uploading document ${filename}:`, error);
      return false;
    }
  }

  /**
   * Sync all creator data to their xAI collection
   */
  static async syncCreatorData(creatorId: string): Promise<SyncResult> {
    // Get creator's AI settings
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!settings) {
      return { success: false, documentCount: 0, error: 'AI Twin settings not found' };
    }

    // Get or create collection
    let collectionId = settings.xaiCollectionId;
    if (!collectionId) {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, creatorId),
        columns: { displayName: true, username: true },
      });
      const creatorName = creator?.displayName || creator?.username || 'creator';
      collectionId = await this.createCollection(creatorId, creatorName);
      if (!collectionId) {
        return { success: false, documentCount: 0, error: 'Failed to create collection' };
      }
    }

    // Gather all data in parallel
    const [creator, creatorContent, transcripts, realMessages] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, creatorId),
        columns: { displayName: true, username: true, bio: true },
      }),
      db.query.contentItems.findMany({
        where: and(
          eq(contentItems.creatorId, creatorId),
          eq(contentItems.isPublished, true)
        ),
        columns: { title: true, description: true, contentType: true },
        orderBy: [desc(contentItems.createdAt)],
      }),
      db.query.vodTranscripts.findMany({
        where: and(
          eq(vodTranscripts.creatorId, creatorId),
          eq(vodTranscripts.status, 'completed')
        ),
        columns: { fullText: true },
        orderBy: [desc(vodTranscripts.createdAt)],
        limit: 20,
      }),
      db.query.messages.findMany({
        where: and(
          eq(messages.senderId, creatorId),
          eq(messages.isAiGenerated, false)
        ),
        orderBy: [desc(messages.createdAt)],
        limit: 50,
        columns: { content: true },
      }),
    ]);

    let documentCount = 0;

    // 1. Bio document
    const bioContent = this.buildBioDocument(creator, settings);
    if (bioContent) {
      const uploaded = await this.uploadDocument(collectionId, 'bio.md', bioContent);
      if (uploaded) documentCount++;
    }

    // 2. Knowledge base document
    if (settings.knowledgeBase) {
      const uploaded = await this.uploadDocument(collectionId, 'knowledge-base.md',
        `# Creator's Knowledge Base\n\n${settings.knowledgeBase}`
      );
      if (uploaded) documentCount++;
    }

    // 3. Content catalog document
    if (creatorContent.length > 0) {
      const catalogContent = this.buildContentCatalog(creatorContent);
      const uploaded = await this.uploadDocument(collectionId, 'content-catalog.md', catalogContent);
      if (uploaded) documentCount++;
    }

    // 4. Stream transcripts document
    if (transcripts.length > 0) {
      const transcriptContent = this.buildTranscriptsDocument(transcripts);
      if (transcriptContent) {
        const uploaded = await this.uploadDocument(collectionId, 'transcripts.md', transcriptContent);
        if (uploaded) documentCount++;
      }
    }

    // 5. Message style document
    if (realMessages.length > 0) {
      const styleContent = this.buildMessageStyleDocument(realMessages.map(m => m.content));
      const uploaded = await this.uploadDocument(collectionId, 'message-style.md', styleContent);
      if (uploaded) documentCount++;
    }

    // Update sync timestamp
    await db
      .update(aiTwinSettings)
      .set({ collectionSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiTwinSettings.creatorId, creatorId));

    console.log(`[xAI Collections] Synced ${documentCount} documents for creator ${creatorId}`);
    return { success: true, documentCount };
  }

  /**
   * Search a creator's collection for relevant context
   * Returns null on any error (graceful degradation)
   */
  static async searchForContext(creatorId: string, query: string): Promise<string | null> {
    if (!XAI_API_KEY) return null;

    // Get creator's collection ID
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
      columns: { xaiCollectionId: true },
    });

    if (!settings?.xaiCollectionId) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${API_URL}/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          source: { collection_ids: [settings.xaiCollectionId] },
          retrieval_mode: { type: 'hybrid' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[xAI Collections] Search failed:', response.status);
        return null;
      }

      const data = await response.json();
      const results: SearchResult[] = data.results || data.data || [];

      if (results.length === 0) return null;

      // Format top results into a context string (max ~2000 chars)
      const contextParts = results
        .slice(0, 5)
        .map(r => r.text?.trim())
        .filter((t): t is string => !!t && t.length > 10);

      if (contextParts.length === 0) return null;

      let context = contextParts.join('\n\n');
      if (context.length > 2000) {
        context = context.substring(0, 2000) + '...';
      }

      return context;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[xAI Collections] Search timed out');
      } else {
        console.error('[xAI Collections] Search error:', error);
      }
      return null;
    }
  }

  // --- Document builders ---

  private static buildBioDocument(
    creator: { displayName: string | null; username: string | null; bio: string | null } | undefined,
    settings: { knowledgeLocation: string | null; knowledgeExpertise: string[] | null }
  ): string | null {
    if (!creator) return null;

    const parts: string[] = [];
    parts.push(`# About ${creator.displayName || creator.username}`);

    if (creator.bio) {
      parts.push(`\n## Bio\n${creator.bio}`);
    }

    if (settings.knowledgeLocation) {
      parts.push(`\n## Location\n${settings.knowledgeLocation}`);
    }

    if (settings.knowledgeExpertise && settings.knowledgeExpertise.length > 0) {
      parts.push(`\n## Areas of Expertise\n${settings.knowledgeExpertise.join(', ')}`);
    }

    return parts.length > 1 ? parts.join('\n') : null;
  }

  private static buildContentCatalog(
    content: Array<{ title: string; description: string | null; contentType: string }>
  ): string {
    let doc = '# Content Catalog\n\n';
    doc += `Total published items: ${content.length}\n\n`;

    for (const item of content) {
      const type = item.contentType === 'video' ? 'Video' : item.contentType === 'gallery' ? 'Gallery' : 'Photo';
      doc += `- [${type}] ${item.title}`;
      if (item.description) {
        doc += `: ${item.description.substring(0, 200)}`;
      }
      doc += '\n';
    }

    return doc;
  }

  private static buildTranscriptsDocument(
    transcripts: Array<{ fullText: string | null }>
  ): string | null {
    const texts = transcripts
      .map(t => t.fullText)
      .filter((t): t is string => !!t && t.length > 50);

    if (texts.length === 0) return null;

    let doc = '# Stream Transcripts\n\n';
    let totalLength = doc.length;
    const MAX_LENGTH = 80000; // ~80KB cap

    for (let i = 0; i < texts.length; i++) {
      const header = `## Stream ${i + 1}\n`;
      const text = texts[i];

      if (totalLength + header.length + text.length > MAX_LENGTH) {
        // Add truncated version
        const remaining = MAX_LENGTH - totalLength - header.length - 50;
        if (remaining > 200) {
          doc += header + text.substring(0, remaining) + '\n[truncated]\n\n';
        }
        break;
      }

      doc += header + text + '\n\n';
      totalLength += header.length + text.length + 2;
    }

    return doc;
  }

  private static buildMessageStyleDocument(messageTexts: string[]): string {
    // Pick diverse messages (similar to AiTextService.pickDiverseExamples)
    const valid = messageTexts.filter(m => m.length >= 5 && m.length <= 200);
    const selected = valid.slice(0, 30);

    let doc = '# How I Text (Real Message Examples)\n\n';
    doc += 'These are real messages showing my texting style, slang, and emoji usage:\n\n';

    for (let i = 0; i < selected.length; i++) {
      doc += `${i + 1}. "${selected[i]}"\n`;
    }

    return doc;
  }
}

import { execFile } from 'child_process';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';

interface WatermarkOptions {
  inputPath: string;
  outputPath: string;
  logoPath: string;
  username: string;
  maxDuration?: number;
}

/**
 * Apply Digis watermark to a video clip using FFmpeg.
 * Overlays the Digis logo + "digis.cc/@username" in the bottom-right corner.
 * Always outputs MP4 with faststart for web playback.
 * Trims to maxDuration seconds (default 30).
 */
export function applyWatermark(opts: WatermarkOptions): Promise<void> {
  const { inputPath, outputPath, logoPath, username, maxDuration = 30 } = opts;

  // Sanitize username for FFmpeg drawtext (escape special chars)
  const safeUsername = username.replace(/[':]/g, '\\$&');

  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-i', logoPath,
      '-filter_complex',
      // Scale logo to 40px height, semi-transparent
      `[1:v]scale=-1:40,format=rgba,colorchannelmixer=aa=0.75[logo];` +
      // Overlay logo bottom-right with padding
      `[0:v][logo]overlay=W-w-20:H-h-60[bg];` +
      // Draw username text below logo
      `[bg]drawtext=text='digis.cc/@${safeUsername}':fontsize=18:fontcolor=white@0.85:x=W-tw-20:y=H-28:shadowcolor=black@0.5:shadowx=1:shadowy=1`,
      // Output options
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', String(maxDuration),
      '-movflags', '+faststart',
      '-y', // Overwrite output
      outputPath,
    ];

    execFile(ffmpegPath, args, { timeout: 90_000 }, (error, _stdout, stderr) => {
      if (error) {
        console.error('[Watermark] FFmpeg error:', stderr);
        reject(new Error(`FFmpeg failed: ${error.message}`));
        return;
      }
      resolve();
    });
  });
}

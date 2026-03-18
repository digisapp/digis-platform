import sharp from 'sharp';
import { execFile } from 'child_process';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { writeFile, unlink, mkdtemp, readFile, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * MediaProcessingService
 *
 * Generates optimized thumbnails and previews for Cloud uploads.
 * - Images: sharp (fast, works on Vercel)
 * - Videos: ffmpeg (poster frame extraction)
 */

interface ProcessedMedia {
  thumbnail: Buffer;      // Small grid thumbnail (400px wide, webp)
  thumbnailMime: string;
  preview: Buffer;        // Medium preview (800px wide, webp for images / jpg for video poster)
  previewMime: string;
}

/**
 * Process an image file into thumbnail + preview
 */
export async function processImage(fileBuffer: Buffer): Promise<ProcessedMedia> {
  const [thumbnail, preview] = await Promise.all([
    sharp(fileBuffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 75 })
      .toBuffer(),

    sharp(fileBuffer)
      .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  return {
    thumbnail,
    thumbnailMime: 'image/webp',
    preview,
    previewMime: 'image/webp',
  };
}

/**
 * Remux a video file to MP4 container (lossless, no re-encoding).
 * Fixes .mov files that won't play in Chrome/Firefox.
 *
 * Tries copy first (instant). If that fails (e.g. HEVC codec),
 * falls back to transcode to H.264/AAC.
 *
 * Returns null if remux is unnecessary or fails entirely.
 */
export async function remuxToMp4(fileBuffer: Buffer): Promise<Buffer | null> {
  const tempDir = await mkdtemp(join(tmpdir(), 'cloud-remux-'));
  const inputPath = join(tempDir, 'input.mov');
  const outputPath = join(tempDir, 'output.mp4');

  try {
    await writeFile(inputPath, fileBuffer);

    // Try lossless remux first (just container swap, instant)
    const remuxSuccess = await new Promise<boolean>((resolve) => {
      execFile(
        ffmpegPath,
        [
          '-i', inputPath,
          '-c', 'copy',        // No re-encoding
          '-movflags', '+faststart',
          '-y',
          outputPath,
        ],
        { timeout: 60000 },
        (error) => resolve(!error),
      );
    });

    if (!remuxSuccess) {
      // Remux failed — try transcode (HEVC → H.264)
      const transcodeSuccess = await new Promise<boolean>((resolve) => {
        execFile(
          ffmpegPath,
          [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            outputPath,
          ],
          { timeout: 180000 }, // 3 min for transcoding
          (error) => resolve(!error),
        );
      });

      if (!transcodeSuccess) {
        return null;
      }
    }

    const outputBuffer = await readFile(outputPath);

    // Sanity check — output should be reasonable size
    if (outputBuffer.length < 1000) {
      return null;
    }

    return outputBuffer;
  } finally {
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);
    await rmdir(tempDir).catch(() => {});
  }
}

/**
 * Process a video file — extract a poster frame for thumbnail + preview
 * Uses ffmpeg to grab a frame at 1 second (or 0 if very short)
 */
export async function processVideo(fileBuffer: Buffer, extension: string): Promise<ProcessedMedia> {
  const tempDir = await mkdtemp(join(tmpdir(), 'cloud-video-'));
  const inputPath = join(tempDir, `input.${extension}`);
  const posterPath = join(tempDir, 'poster.jpg');

  try {
    await writeFile(inputPath, fileBuffer);

    // Extract a single frame at 1 second
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegPath,
        [
          '-i', inputPath,
          '-ss', '1',
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          posterPath,
        ],
        { timeout: 30000 },
        (error, _stdout, _stderr) => {
          if (error) {
            // If 1s fails (video too short), try 0s
            execFile(
              ffmpegPath,
              [
                '-i', inputPath,
                '-ss', '0',
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                posterPath,
              ],
              { timeout: 30000 },
              (err2) => {
                if (err2) reject(new Error(`FFmpeg poster extraction failed: ${err2.message}`));
                else resolve();
              }
            );
          } else {
            resolve();
          }
        }
      );
    });

    const posterBuffer = await readFile(posterPath);

    // Use sharp to create optimized thumbnail + preview from the poster
    const [thumbnail, preview] = await Promise.all([
      sharp(posterBuffer)
        .resize(400, 400, { fit: 'cover', position: 'centre' })
        .webp({ quality: 75 })
        .toBuffer(),

      sharp(posterBuffer)
        .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer(),
    ]);

    return {
      thumbnail,
      thumbnailMime: 'image/webp',
      preview,
      previewMime: 'image/jpeg',
    };
  } finally {
    // Clean up temp files
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(posterPath).catch(() => {}),
    ]);
    await rmdir(tempDir).catch(() => {});
  }
}

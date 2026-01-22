/**
 * Video Thumbnail Generator
 * Extracts a frame from a video file to use as a thumbnail
 * Works entirely client-side using video element and canvas
 */

export interface ThumbnailResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Generate a thumbnail from a video file
 * @param videoFile - The video file to extract thumbnail from
 * @param seekTime - Time in seconds to capture (default: 1 second, or 10% into video)
 * @param maxWidth - Maximum width of thumbnail (default: 640)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 */
export async function generateVideoThumbnail(
  videoFile: File,
  seekTime?: number,
  maxWidth: number = 640,
  quality: number = 0.8
): Promise<ThumbnailResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Create object URL for the video
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    // Mute and set attributes for autoplay policies
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    // Handle metadata loaded - we need duration to seek
    video.onloadedmetadata = () => {
      // Calculate seek time: use provided time, or 10% into video, or 1 second
      const duration = video.duration;
      const targetTime = seekTime !== undefined
        ? Math.min(seekTime, duration)
        : Math.min(duration * 0.1, 1);

      video.currentTime = targetTime;
    };

    // Handle seek complete - capture frame
    video.onseeked = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;
        let width = Math.min(video.videoWidth, maxWidth);
        let height = width / aspectRatio;

        // Ensure minimum dimensions
        if (width < 100) width = 100;
        if (height < 100) height = 100;

        canvas.width = width;
        canvas.height = height;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            // Clean up
            URL.revokeObjectURL(videoUrl);
            video.src = '';

            if (!blob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }

            // Also create data URL for preview
            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            resolve({
              blob,
              dataUrl,
              width,
              height,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(videoUrl);
        reject(err);
      }
    };

    // Handle errors
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    // Start loading
    video.load();
  });
}

/**
 * Generate thumbnail and upload it to storage
 * Returns the public URL of the uploaded thumbnail
 */
export async function generateAndUploadThumbnail(
  videoFile: File,
  uploadEndpoint: string = '/api/upload/thumbnail'
): Promise<string> {
  // Generate thumbnail
  const thumbnail = await generateVideoThumbnail(videoFile);

  // Create form data with thumbnail
  const formData = new FormData();
  formData.append('file', thumbnail.blob, `thumbnail-${Date.now()}.jpg`);

  // Upload
  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload thumbnail');
  }

  const result = await response.json();
  return result.data?.url || result.url;
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

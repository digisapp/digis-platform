/**
 * Supabase Storage utilities for uploading images
 */

import { createClient } from '@/lib/supabase/client';

export type ImageKind = 'avatar' | 'banner' | 'creator-card' | 'show-cover';

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param kind - Type of image (avatar, banner, creator-card, or show-cover)
 * @param userId - User ID for folder organization
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  kind: ImageKind,
  userId: string
): Promise<string> {
  const supabase = createClient();

  // Map image kind to bucket
  let bucket: string;
  if (kind === 'avatar') {
    bucket = 'avatars';
  } else if (kind === 'show-cover') {
    bucket = 'show-covers';
  } else {
    bucket = 'banners'; // banner and creator-card go to banners bucket
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '31536000', // 1 year cache
      upsert: false, // New filename each time to bust cache
      contentType: file.type,
    });

  if (upErr) {
    console.error('Upload error:', upErr);
    throw new Error(`Failed to upload ${kind}: ${upErr.message}`);
  }

  // Get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Validate image file type only (no size check - for images that will be resized)
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateImageType(
  file: File
): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.',
    };
  }
  return { valid: true };
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @param kind - Type of image (avatar, banner, creator-card, or show-cover)
 * @returns Validation result
 */
export function validateImageFile(
  file: File,
  kind: ImageKind
): { valid: boolean; error?: string } {
  // Check file type
  const typeValidation = validateImageType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Skip size check for avatars - they get auto-resized to 512x512
  if (kind === 'avatar') {
    return { valid: true };
  }

  // Check file size - show-covers 10MB, others 5MB (generous limits)
  let maxSize: number;
  if (kind === 'show-cover') {
    maxSize = 10 * 1024 * 1024; // 10MB for show covers
  } else {
    maxSize = 5 * 1024 * 1024; // 5MB for banner/creator-card
  }

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Get the natural dimensions of an image file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image client-side before upload
 * @param mode 'fit' = scale down to fit within bounds (default, for avatars/general)
 * @param mode 'fill' = crop-to-fill exact dimensions (for banners - always outputs exact size)
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  mode: 'fit' | 'fill' = 'fit'
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let drawWidth: number;
      let drawHeight: number;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (mode === 'fill') {
        // Crop-to-fill: always output exact target dimensions
        // Scales image to cover the target area, then center-crops
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        const targetRatio = maxWidth / maxHeight;
        const srcRatio = img.width / img.height;

        if (srcRatio > targetRatio) {
          // Source is wider than target — crop sides
          sh = img.height;
          sw = Math.round(img.height * targetRatio);
          sx = Math.round((img.width - sw) / 2);
        } else {
          // Source is taller than target — crop top/bottom
          sw = img.width;
          sh = Math.round(img.width / targetRatio);
          sy = Math.round((img.height - sh) / 2);
        }

        drawWidth = maxWidth;
        drawHeight = maxHeight;
      } else {
        // Fit-within: scale down maintaining aspect ratio
        drawWidth = img.width;
        drawHeight = img.height;

        if (drawWidth > maxWidth) {
          drawHeight = (drawHeight * maxWidth) / drawWidth;
          drawWidth = maxWidth;
        }
        if (drawHeight > maxHeight) {
          drawWidth = (drawWidth * maxHeight) / drawHeight;
          drawHeight = maxHeight;
        }

        canvas.width = drawWidth;
        canvas.height = drawHeight;
      }

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      ctx?.drawImage(img, sx, sy, sw, sh, 0, 0, drawWidth, drawHeight);

      URL.revokeObjectURL(img.src);

      const outputType = 'image/webp';
      const baseName = file.name.replace(/\.[^.]+$/, '');

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          const resizedFile = new File([blob], `${baseName}.webp`, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        outputType,
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

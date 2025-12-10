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
 * Resize image client-side before upload (optional optimization)
 * @param file - The image file to resize
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Resized image as File
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        file.type,
        0.9 // Quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { logger } from './logger';

// ============================================================
// Cloudinary Configuration & Upload Helper
// ============================================================

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image buffer to Cloudinary.
 * @param buffer - Image file buffer
 * @param folder - Cloudinary folder path
 * @returns Cloudinary secure URL
 */
export const uploadImageToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed:', error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary returned no result'));
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Uploads a QR code buffer (no transformation needed).
 */
export const uploadQrToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        format: 'png',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary QR upload failed:', error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary returned no result'));
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary by public ID (also drops its derived
 * thumbnails and purges the CDN cache). Never throws.
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
    logger.info(`Cloudinary image deleted: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete failed:', error);
  }
};

/** Every app folder in CLOUDINARY_FOLDERS lives under this root. */
const CLOUDINARY_ROOT_FOLDER = 'qr-menu';

/**
 * Extracts the public ID from one of OUR Cloudinary URLs, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/qr-menu/dishes/abc.webp → qr-menu/dishes/abc
 * Returns null for anything else (other clouds, external links, non-app folders).
 */
export const publicIdFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const marker = `res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const segments = url.slice(at + marker.length).split(/[?#]/)[0].split('/');
  const root = segments.indexOf(CLOUDINARY_ROOT_FOLDER);
  if (root < 0 || root === segments.length - 1) return null;
  return segments.slice(root).join('/').replace(/\.[a-z0-9]+$/i, '');
};

export { cloudinary };

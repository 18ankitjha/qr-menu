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
 * Deletes an image from Cloudinary by public ID.
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary image deleted: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete failed:', error);
  }
};

export { cloudinary };

import { Request, Response } from 'express';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, CLOUDINARY_FOLDERS, APP_CONSTANTS } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { uploadImageToCloudinary } from '../../../utils/cloudinary.util';
import * as ImageCleanupDM from '../dm/image-cleanup.dm';

// ============================================================
// Upload Controller
// ============================================================

/**
 * POST /upload/image
 * Upload an image to Cloudinary. Uses multer for multipart parsing.
 * Query param: folder = 'dishes' | 'categories' | 'logos'
 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }

  // Validate file type
  if (!(APP_CONSTANTS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(req.file.mimetype)) {
    sendError(res, ERROR_MESSAGES.INVALID_IMAGE_TYPE, 400);
    return;
  }

  // Determine folder
  const folderParam = req.query.folder as string;
  let folder: string = CLOUDINARY_FOLDERS.DISH_IMAGES; // default

  if (folderParam === 'categories') {
    folder = CLOUDINARY_FOLDERS.CATEGORY_IMAGES;
  } else if (folderParam === 'logos') {
    folder = CLOUDINARY_FOLDERS.RESTAURANT_LOGOS;
  } else if (folderParam === 'backgrounds') {
    folder = CLOUDINARY_FOLDERS.BACKGROUNDS;
  }

  const result = await uploadImageToCloudinary(req.file.buffer, folder);

  sendSuccess(
    res,
    {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    },
    SUCCESS_MESSAGES.IMAGE_UPLOADED
  );
});

/**
 * DELETE /upload/image  body: { url }
 * Discard an uploaded image the owner never saved (e.g. cancelled the dish form).
 * Only deletes our own upload-folder images that no dish/category/logo/background uses.
 */
export const discardImage = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await ImageCleanupDM.releaseImage(req.body.url as string);
  sendSuccess(res, { deleted }, deleted ? 'Image discarded' : 'Image kept (in use or not ours)');
});

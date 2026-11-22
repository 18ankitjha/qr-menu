import { DishModel } from '../../menu/dm/dish.model';
import { CategoryModel } from '../../menu/dm/category.model';
import { MenuModel } from '../../menu/dm/menu.model';
import { RestaurantModel } from '../../restaurant/dm/restaurant.model';
import { CLOUDINARY_FOLDERS } from '../../../config/constants';
import { deleteImageFromCloudinary, publicIdFromUrl } from '../../../utils/cloudinary.util';
import { logger } from '../../../utils/logger';

// ============================================================
// Image Cleanup — removes uploaded Cloudinary images that nothing points to
// ============================================================

/** Folders holding user-uploaded images (QR codes are managed by the table service). */
const UPLOAD_FOLDERS: string[] = [
  CLOUDINARY_FOLDERS.DISH_IMAGES,
  CLOUDINARY_FOLDERS.CATEGORY_IMAGES,
  CLOUDINARY_FOLDERS.RESTAURANT_LOGOS,
  CLOUDINARY_FOLDERS.BACKGROUNDS,
];

/** True if any dish, category, restaurant logo or menu background still uses this URL. */
export const isImageInUse = async (url: string): Promise<boolean> => {
  const [dish, category, restaurant, menu] = await Promise.all([
    DishModel.exists({ imageUrl: url }),
    CategoryModel.exists({ imageUrl: url }),
    RestaurantModel.exists({ logoUrl: url }),
    MenuModel.exists({ 'theme.backgroundImageUrl': url }),
  ]);
  return !!(dish || category || restaurant || menu);
};

/**
 * Deletes an uploaded image from Cloudinary if it's ours (app upload folder) and nothing references it.
 * Returns true if a delete was issued. Never throws.
 */
export const releaseImage = async (url?: string | null): Promise<boolean> => {
  try {
    const publicId = publicIdFromUrl(url);
    if (!url || !publicId) return false;
    if (!UPLOAD_FOLDERS.some((folder) => publicId.startsWith(`${folder}/`))) return false;
    if (await isImageInUse(url)) return false;
    await deleteImageFromCloudinary(publicId);
    return true;
  } catch (error) {
    logger.error('Image cleanup failed:', error);
    return false;
  }
};

/**
 * Call AFTER the DB write: fire-and-forget release of the old image when it was replaced or cleared.
 * `fieldUpdated` = the image field was part of this update (otherwise nothing changes).
 */
export const releaseIfReplaced = (oldUrl: string | null | undefined, newUrl: string | null | undefined, fieldUpdated: boolean): void => {
  if (fieldUpdated && oldUrl && oldUrl !== newUrl) void releaseImage(oldUrl);
};

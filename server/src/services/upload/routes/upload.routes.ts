import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../auth/middlewares/auth.middleware';
import { APP_CONSTANTS } from '../../../config/constants';
import { validateBody } from '../../../middlewares/validate.middleware';
import { discardImageSchema } from '../validators/upload.validator';
import * as UploadController from '../controllers/upload.controller';

const router = Router();

// Multer setup — memory storage (buffer) for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: APP_CONSTANTS.MAX_IMAGE_SIZE_MB * 1024 * 1024,
  },
});

// All upload routes require auth
router.use(authMiddleware);

// POST /upload/image?folder=dishes|categories|logos|backgrounds
router.post('/image', upload.single('image'), UploadController.uploadImage);

// DELETE /upload/image  { url } — discard an upload that was never saved
router.delete('/image', validateBody(discardImageSchema), UploadController.discardImage);

export default router;

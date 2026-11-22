import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../auth/middlewares/auth.middleware';
import { APP_CONSTANTS } from '../../../config/constants';
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

// POST /upload/image?folder=dishes|categories|logos
router.post('/image', upload.single('image'), UploadController.uploadImage);

export default router;

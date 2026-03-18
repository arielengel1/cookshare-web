import express from 'express';
import { getProfile, updateProfile, getUserPosts } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, upload.single('profilePic'), updateProfile);
router.get('/:userId/posts', authenticate, getUserPosts);

export default router;

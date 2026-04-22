import express from 'express';
import { getProfile, updateProfile, getUserPosts, getLikedPosts, getTopChefs } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, upload.single('profilePic'), updateProfile);
router.get('/top-chefs', authenticate, getTopChefs);
router.get('/:userId/posts', authenticate, getUserPosts);
router.get('/:userId/liked-posts', authenticate, getLikedPosts);

export default router;

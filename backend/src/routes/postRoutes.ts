import express from 'express';
import { createPost, getFeed, updatePost, deletePost, smartSearch } from '../controllers/postController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.get('/feed', authenticate, getFeed);
router.get('/search', authenticate, smartSearch);
router.post('/', authenticate, upload.single('image'), createPost);
router.put('/:id', authenticate, upload.single('image'), updatePost);
router.delete('/:id', authenticate, deletePost);

export default router;

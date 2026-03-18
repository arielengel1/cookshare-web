import express from 'express';
import { addComment, getComments } from '../controllers/commentController';
import { authenticate } from '../middleware/auth';

const router = express.Router({ mergeParams: true }); // to access postId from parent router

router.post('/', authenticate, addComment);
router.get('/', authenticate, getComments);

export default router;

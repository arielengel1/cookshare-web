import express from 'express';
import { toggleLike, checkLikeStatus } from '../controllers/likeController';
import { authenticate } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

router.post('/', authenticate, toggleLike);
router.get('/status', authenticate, checkLikeStatus);

export default router;

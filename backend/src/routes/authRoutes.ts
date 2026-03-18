import express from 'express';
import { register, login, refresh, googleAuth, logout } from '../controllers/authController';

const router = express.Router();

export const authControllerDocsList = {
  // Can be filled later for auto swagger generation if needed
};

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/google', googleAuth);
router.post('/logout', logout);

export default router;

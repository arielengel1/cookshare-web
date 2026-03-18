import { Response } from 'express';
import Like from '../models/Like';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    const existingLike = await Like.findOne({ postId, userId });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      res.json({ message: 'Unliked successfully', liked: false });
    } else {
      const like = new Like({ postId, userId });
      await like.save();
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
      res.json({ message: 'Liked successfully', liked: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const checkLikeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    const like = await Like.findOne({ postId, userId });
    res.json({ liked: !!like });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

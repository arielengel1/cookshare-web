import { Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const comment = new Comment({
      postId,
      author: req.user?._id,
      text,
    });
    await comment.save();
    
    // Increment post's comment count
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    
    // Populate author info before returning
    await comment.populate('author', 'name profilePic');
    
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 }).populate('author', 'name profilePic');
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

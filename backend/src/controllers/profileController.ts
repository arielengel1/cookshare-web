import { Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    let profilePic = req.file?.filename;

    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (profilePic) user.profilePic = profilePic;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { _id: user._id, email: user.email, name: user.name, profilePic: user.profilePic }});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUserPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ author: userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

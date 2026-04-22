import { Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Like from '../models/Like';
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
    const posts = await Post.find({ author: userId }).sort({ createdAt: -1 }).populate('author', 'name profilePic').lean();
    
    let likedPostIds = new Set<string>();
    const currentUserId = req.user?._id;
    if (currentUserId) {
      const postIds = posts.map(p => p._id);
      const likes = await Like.find({ userId: currentUserId, postId: { $in: postIds } });
      likedPostIds = new Set(likes.map(l => l.postId.toString()));
    }

    const postsWithLike = posts.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p._id.toString())
    }));

    res.json(postsWithLike);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getLikedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const likes = await Like.find({ userId }).sort({ createdAt: -1 });
    const postIds = likes.map(l => l.postId);
    const posts = await Post.find({ _id: { $in: postIds } }).populate('author', 'name profilePic').lean();
    
    const sortedPostsObj = posts.sort((a, b) => {
      const indexA = postIds.findIndex(id => id.toString() === a._id.toString());
      const indexB = postIds.findIndex(id => id.toString() === b._id.toString());
      return indexA - indexB;
    });

    let likedPostIds = new Set<string>();
    const currentUserId = req.user?._id;
    if (currentUserId) {
      if (currentUserId.toString() === userId) {
        likedPostIds = new Set(postIds.map(id => id.toString()));
      } else {
        const currentUserLikes = await Like.find({ userId: currentUserId, postId: { $in: postIds } });
        likedPostIds = new Set(currentUserLikes.map(l => l.postId.toString()));
      }
    }

    const postsWithLike = sortedPostsObj.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p._id.toString())
    }));

    res.json(postsWithLike);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

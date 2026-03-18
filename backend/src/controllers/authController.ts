import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ _id: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ _id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, user: { _id: user._id, email: user.email, name: user.name, profilePic: user.profilePic } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as { _id: string };
    const user = await User.findById(payload._id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    let { googleId, email, name, profilePic, token } = req.body;
    
    if (token) {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        email = decoded.email || email;
        name = decoded.name || name;
        profilePic = decoded.picture || profilePic;
        googleId = decoded.sub || googleId;
      }
    }

    if (!email || !name) {
      return res.status(400).json({ message: 'Invalid Google token, missing email or name' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email, name, profilePic, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (profilePic && !user.profilePic) user.profilePic = profilePic;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, user: { _id: user._id, email: user.email, name: user.name, profilePic: user.profilePic } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as { _id: string };
      await User.findByIdAndUpdate(payload._id, { refreshToken: null });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Even if token is invalid, we return success for logout
    res.json({ message: 'Logged out successfully' });
  }
};

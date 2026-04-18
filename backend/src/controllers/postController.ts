import { Response } from 'express';
import Post from '../models/Post';
import Chunk from '../models/Chunk';
import { AuthRequest } from '../middleware/auth';
import { generateEmbedding, chunkText, cosineSimilarity } from '../services/aiService';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    let image = req.file?.filename;

    const post = new Post({
      author: req.user?._id,
      text,
      image,
    });
    await post.save();

    // AI Indexing
    if (text) {
      const chunks = chunkText(text);
      const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c, 'RETRIEVAL_DOCUMENT')));
      const docs = chunks
        .map((t, i) => ({ docId: post._id.toString(), chunkIndex: i, text: t, embedding: embeddings[i] }))
        .filter(d => d.embedding);
      if (docs.length) await Chunk.insertMany(docs);
    }

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name profilePic');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user?._id) return res.status(403).json({ message: 'Unauthorized' });

    post.text = text || post.text;
    if (req.file?.filename) post.image = req.file.filename;
    await post.save();

    // Re-index AI Chunks
    if (text) {
      await Chunk.deleteMany({ docId: post._id.toString() });
      const chunks = chunkText(text);
      const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c, 'RETRIEVAL_DOCUMENT')));
      const docs = chunks
        .map((t, i) => ({ docId: post._id.toString(), chunkIndex: i, text: t, embedding: embeddings[i] }))
        .filter(d => d.embedding);
      if (docs.length) await Chunk.insertMany(docs);
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user?._id) return res.status(403).json({ message: 'Unauthorized' });

    await Post.findByIdAndDelete(id);
    await Chunk.deleteMany({ docId: id });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const smartSearch = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') return res.status(400).json({ message: 'Query required' });

    const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');
    if (!queryEmbedding) return res.status(500).json({ message: 'Failed to generate embedding' });

    const allChunks = await Chunk.find({ embedding: { $exists: true, $ne: [] } }, { docId: 1, embedding: 1 }).lean();
    
    // Calculate similarities
    const results = allChunks.map(chunk => ({
      docId: chunk.docId,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .filter(res => res.similarity > 0.4)
    .slice(0, 10);

    // Get unique matched post IDs
    const matchedDocIds = [...new Set(results.map(r => r.docId))];
    const posts = await Post.find({ _id: { $in: matchedDocIds } }).populate('author', 'name profilePic');
    
    // Build a map from docId to best similarity score
    const similarityMap = new Map<string, number>();
    for (const r of results) {
      const existing = similarityMap.get(r.docId.toString());
      if (existing === undefined || r.similarity > existing) {
        similarityMap.set(r.docId.toString(), r.similarity);
      }
    }

    // Sort posts to match search priority
    const sortedPosts = posts.sort((a, b) => {
      const indexA = matchedDocIds.indexOf(a._id.toString());
      const indexB = matchedDocIds.indexOf(b._id.toString());
      return indexA - indexB;
    }).map(post => ({
      ...post.toObject(),
      similarity: similarityMap.get(post._id.toString()) ?? 0
    }));

    res.json(sortedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

import { Response } from 'express';
import Post from '../models/Post';
import Chunk from '../models/Chunk';
import Like from '../models/Like';
import { AuthRequest } from '../middleware/auth';
import { generateEmbedding, chunkText, cosineSimilarity } from '../services/aiService';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, ingredients, instructions, text } = req.body;
    let image = req.file?.filename;

    const post = new Post({
      author: req.user?._id,
      title,
      description,
      ingredients,
      instructions,
      text,
      image,
    });
    await post.save();

    // AI Indexing
    let embeddingWarning = false;
    const aiTextPayload = [title, description, ingredients, instructions, text].filter(Boolean).join('\n\n');
    if (aiTextPayload) {
      try {
        const chunks = chunkText(aiTextPayload);
        const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c, 'RETRIEVAL_DOCUMENT')));
        const docs = chunks
          .map((t, i) => ({ docId: post._id.toString(), chunkIndex: i, text: t, embedding: embeddings[i] }))
          .filter(d => d.embedding);
        if (docs.length) await Chunk.insertMany(docs);
      } catch {
        embeddingWarning = true;
      }
    }

    res.status(201).json({ ...post.toObject(), embeddingWarning });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort as string || 'newest';

    let sortOption: any = { createdAt: -1 };
    if (sortParam === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sortParam === 'popular') {
      sortOption = { likesCount: -1, createdAt: -1 };
    }

    const posts = await Post.find().sort(sortOption).skip(skip).limit(limit).populate('author', 'name profilePic').lean();
    
    let likedPostIds = new Set<string>();
    const userId = req.user?._id;
    if (userId) {
      const postIds = posts.map(p => p._id);
      const likes = await Like.find({ userId, postId: { $in: postIds } });
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

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, ingredients, instructions, text } = req.body;
    
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user?._id) return res.status(403).json({ message: 'Unauthorized' });

    post.text = text || post.text;
    if (title !== undefined) post.title = title;
    if (description !== undefined) post.description = description;
    if (ingredients !== undefined) post.ingredients = ingredients;
    if (instructions !== undefined) post.instructions = instructions;
    
    if (req.file?.filename) post.image = req.file.filename;
    await post.save();

    // Re-index AI Chunks
    let embeddingWarning = false;
    const aiTextPayload = [title, description, ingredients, instructions, text].filter(Boolean).join('\n\n');
    if (aiTextPayload) {
      try {
        await Chunk.deleteMany({ docId: post._id.toString() });
        const chunks = chunkText(aiTextPayload);
        const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c, 'RETRIEVAL_DOCUMENT')));
        const docs = chunks
          .map((t, i) => ({ docId: post._id.toString(), chunkIndex: i, text: t, embedding: embeddings[i] }))
          .filter(d => d.embedding);
        if (docs.length) await Chunk.insertMany(docs);
      } catch {
        embeddingWarning = true;
      }
    }

    res.json({ ...post.toObject(), embeddingWarning });
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

    let queryEmbedding: number[] | null = null;
    let embeddingsFailed = false;
    try {
      queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');
    } catch (embErr: any) {
      console.error(`\x1b[31m[AI Search]\x1b[0m Failed to generate embedding:`, embErr?.message);
      embeddingsFailed = true;
    }
    
    if (!queryEmbedding) {
      console.log(`\x1b[33m[AI Search]\x1b[0m queryEmbedding is null. Falling back to text search...`);
      embeddingsFailed = true;
    }

    let matchedDocIds: string[] = [];
    const similarityMap = new Map<string, number>();

    if (!embeddingsFailed && queryEmbedding) {
      const allChunks = await Chunk.find({ embedding: { $exists: true, $ne: [] } }, { docId: 1, embedding: 1 }).lean();
      
      const results = allChunks.map(chunk => ({
        docId: chunk.docId.toString(),
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
      })).sort((a, b) => b.similarity - a.similarity);

      const filteredResults = results.filter(res => res.similarity > 0.15).slice(0, 10);
      matchedDocIds = [...new Set(filteredResults.map(r => r.docId))];
      
      for (const r of filteredResults) {
        const existing = similarityMap.get(r.docId);
        if (existing === undefined || r.similarity > existing) {
          similarityMap.set(r.docId, r.similarity);
        }
      }
    }

    // Fallback or union with regex text search
    console.log(`\x1b[35m[Text Search]\x1b[0m Running regex fallback...`);
    const regexResults = await Post.find({ text: { $regex: query, $options: 'i' } }, { _id: 1 }).lean();
    for (const p of regexResults) {
      const pid = p._id.toString();
      if (!matchedDocIds.includes(pid)) {
        matchedDocIds.push(pid);
        similarityMap.set(pid, 1.0); // Arbitrary score for regex match
      }
    }

    const posts = await Post.find({ _id: { $in: matchedDocIds } }).populate('author', 'name profilePic');

    // Sort posts to match search priority
    const sortedPostsObj = posts.sort((a, b) => {
      const indexA = matchedDocIds.indexOf(a._id.toString());
      const indexB = matchedDocIds.indexOf(b._id.toString());
      return indexA - indexB;
    }).map(post => post.toObject());

    let likedPostIds = new Set<string>();
    const userId = req.user?._id;
    if (userId) {
      const postIds = sortedPostsObj.map(p => p._id);
      const likes = await Like.find({ userId, postId: { $in: postIds } });
      likedPostIds = new Set(likes.map(l => l.postId.toString()));
    }

    const sortedPosts = sortedPostsObj.map(post => ({
      ...post,
      similarity: similarityMap.get(post._id.toString()) ?? 0,
      isLiked: likedPostIds.has(post._id.toString())
    }));

    res.json(sortedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

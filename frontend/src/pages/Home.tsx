import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState('newest');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/posts/feed?limit=20&sort=${sortMode}`);
      setPosts(data);
    } catch (error) {
      console.error('Error fetching feed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortMode]);

  const handleLike = async (postId: string) => {
    try {
      const { data } = await axiosClient.post(`/posts/${postId}/likes`);
      setPosts(posts.map(p => {
        if (p._id === postId) {
          return {...p, likesCount: p.likesCount + (data.liked ? 1 : -1), isLiked: data.liked};
        }
        return p;
      }));
    } catch (error) {
    }
  };

  return (
    <div className="pb-8">
      <div className="p-4 pb-0 flex justify-between items-center mt-2">
        <h2 className="font-extrabold text-2xl tracking-tight text-gray-800 pl-2">Feed</h2>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="bg-white shadow-sm border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div></div>
      ) : posts.length === 0 ? (
        <div className="text-center p-10 text-gray-500">No recipes found. Be the first to post!</div>
      ) : (
        <div className="flex flex-col gap-6 p-4">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 p-[2px]">
                  <img src={post.author?.profilePic ? `${import.meta.env.VITE_API_URL}/uploads/${post.author.profilePic}` : "https://via.placeholder.com/150"} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-white" />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight">{post.author?.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-400">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</div>
                </div>
              </div>
              
              {post.image && (
                <div className="w-full bg-gray-100">
                  <img src={`${import.meta.env.VITE_API_URL}/uploads/${post.image}`} alt="Recipe" className="w-full h-auto object-cover max-h-96" />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex gap-4 mb-3">
                  <button onClick={() => handleLike(post._id)} className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                    <FiHeart size={24} className={post.isLiked ? 'fill-rose-500 text-rose-500' : ''}/>
                    <span className="font-semibold text-sm">{post.likesCount || 0}</span>
                  </button>
                  <button onClick={() => navigate(`/posts/${post._id}/comments`)} className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                    <FiMessageCircle size={24} />
                    <span className="font-semibold text-sm">{post.commentsCount || 0}</span>
                  </button>
                </div>
                <div className="text-sm">
                  {post.title ? (
                    <div className="mt-2 text-gray-800 flex flex-col gap-2">
                       <h3 className="font-extrabold text-lg text-black-500 block">{post.title}</h3>
                       {post.description && <p className="text-gray-600 block">{post.description}</p>}
                       {post.ingredients && (
                         <div className="bg-rose-50 p-3 rounded-xl mt-2 border border-rose-100">
                           <h4 className="font-bold text-gray-800 mb-1">Ingredients</h4>
                           <p className="whitespace-pre-wrap leading-relaxed">{post.ingredients}</p>
                         </div>
                       )}
                       {post.instructions && (
                         <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                           <h4 className="font-bold text-gray-800 mb-1">Instructions</h4>
                           <p className="whitespace-pre-wrap leading-relaxed">{post.instructions}</p>
                         </div>
                       )}
                    </div>
                  ) : (
                    <span className="text-gray-800 leading-relaxed">{post.text}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;

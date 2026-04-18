import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { FiSearch, FiHeart, FiMessageCircle } from 'react-icons/fi';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLike = async (postId: string) => {
    try {
      const { data } = await axiosClient.post(`/posts/${postId}/likes`);
      setResults(results.map(p => {
        if (p._id === postId) {
          return {...p, likesCount: p.likesCount + (data.liked ? 1 : -1)};
        }
        return p;
      }));
    } catch (error) {
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearchError(null);
    try {
      const { data } = await axiosClient.get(`/posts/search?query=${encodeURIComponent(query)}`);
      setResults(data);
    } catch (error: any) {
      const errData = error?.response?.data;
      const msg = errData?.error || errData?.message || 'שגיאה בחיפוש';
      const details = errData?.details ? ` (${JSON.stringify(errData.details)})` : '';
      setSearchError(msg + details);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="sticky top-0 bg-gray-50 pt-2 pb-4 z-10">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="Ask AI for recipes... (e.g. 'Healthy vegan breakfast')" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm focus:ring-2 focus:ring-rose-400 outline-none transition-all placeholder:text-gray-400"
          />
          <FiSearch className="absolute left-4 top-3.5 text-rose-400" size={20} />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-pulse flex space-x-2"><div className="h-3 w-3 bg-rose-400 rounded-full"></div><div className="h-3 w-3 bg-rose-400 rounded-full"></div><div className="h-3 w-3 bg-rose-400 rounded-full"></div></div></div>
        ) : searchError ? (
          <div className="text-center p-6 text-red-500 text-sm break-words">{searchError}</div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-6">
            <h2 className="font-bold text-gray-700 ml-1">AI Matches</h2>
            {results.map((post) => (
             <div key={post._id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 flex items-center gap-3">
               <div>
                 <div className="font-bold text-sm">{post.author?.name || 'Unknown'}</div>
               </div>
             </div>
             
             {post.image && (
               <div className="w-full bg-gray-100">
                 <img src={`${import.meta.env.VITE_API_URL}/uploads/${post.image}`} alt="Recipe" className="w-full h-auto object-cover max-h-64" />
               </div>
             )}
             
             <div className="p-4">
               <div className="flex gap-4 mb-3">
                  <button onClick={() => handleLike(post._id)} className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                    <FiHeart size={24} className={post.likesCount ? 'fill-rose-500 text-rose-500' : ''}/>
                    <span className="font-semibold text-sm">{post.likesCount || 0}</span>
                  </button>
                  <button onClick={() => navigate(`/posts/${post._id}/comments`)} className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                    <FiMessageCircle size={24} />
                    <span className="font-semibold text-sm">{post.commentsCount || 0}</span>
                  </button>
                </div>
               <div className="text-sm">
                 <span className="font-bold mr-2">{post.author?.name || 'Unknown'}</span>
                 <span className="text-gray-800">{post.text}</span>
               </div>
             </div>
           </div>
            ))}
          </div>
        ) : (query && <div className="text-center p-10 text-gray-500">No matching recipes found</div>)}
      </div>
    </div>
  );
};

export default Search;

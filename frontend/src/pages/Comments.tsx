import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const Comments = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    try {
      const { data } = await axiosClient.get(`/posts/${id}/comments`);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      const { data } = await axiosClient.post(`/posts/${id}/comments`, { text });
      setComments([data, ...comments]);
      setText('');
    } catch (error) {
      console.error('Error posting comment', error);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="flex items-center p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold ml-2 tracking-tight">Comments</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div></div>
      ) : (
        <div className="p-4 space-y-6">
          {comments.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No comments yet. Start the conversation!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0">
                  <img src={comment.author?.profilePic ? `${import.meta.env.VITE_API_URL}/uploads/${comment.author.profilePic}` : "https://via.placeholder.com/150"} alt="User" className="w-full h-full rounded-full object-cover" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm tracking-tight">{comment.author?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed mt-0.5">{comment.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="fixed bottom-[65px] w-full max-w-md bg-white border-t border-gray-100 p-3 z-20">
        <form onSubmit={handlePostComment} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Comments;

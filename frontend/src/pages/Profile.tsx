import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { FiEdit2, FiLogOut, FiCheck, FiTrash2, FiEdit, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingPost, setEditingPost] = useState<any>(null);
  
  const [editingPostText, setEditingPostText] = useState('');
  const [editingPostTitle, setEditingPostTitle] = useState('');
  const [editingPostDescription, setEditingPostDescription] = useState('');
  const [editingPostIngredients, setEditingPostIngredients] = useState('');
  const [editingPostInstructions, setEditingPostInstructions] = useState('');

  const [editingPostImage, setEditingPostImage] = useState<File | null>(null);
  const [deletingPost, setDeletingPost] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts'|'likes'>('posts');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('profilePic', file);
      const { data } = await axiosClient.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.profilePic = data.user.profilePic;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      setProfile((prev: any) => ({ ...prev, profilePic: data.user.profilePic }));
      showSuccess('Profile picture updated!');
    } catch (error) {
      console.error('Failed to update profile pic', error);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === profile.name) {
      setEditingName(false);
      return;
    }
    
    try {
      const { data } = await axiosClient.put('/profile', { name: newName });
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.name = data.user.name;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      setProfile((prev: any) => ({ ...prev, name: data.user.name }));
      setEditingName(false);
      showSuccess('Username updated!');
    } catch (error) {
      console.error('Failed to update name', error);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost) return;
    try {
      await axiosClient.delete(`/posts/${deletingPost._id}`);
      setPosts(posts.filter(p => p._id !== deletingPost._id));
      setDeletingPost(null);
      showSuccess('Recipe deleted!');
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    try {
      const formData = new FormData();
      if (editingPostText.trim()) formData.append('text', editingPostText);
      formData.append('title', editingPostTitle);
      formData.append('description', editingPostDescription);
      formData.append('ingredients', editingPostIngredients);
      formData.append('instructions', editingPostInstructions);

      if (editingPostImage) {
        formData.append('image', editingPostImage);
      }
      
      const { data } = await axiosClient.put(`/posts/${editingPost._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPosts(posts.map(p => p._id === editingPost._id ? { ...p, ...data } : p));
      setEditingPost(null);
      setEditingPostImage(null);
      showSuccess('Recipe updated!');
    } catch (error) {
      console.error('Failed to update post', error);
    }
  };

  useEffect(() => {
    fetchProfileAndPosts();
  }, [activeTab]);

  const fetchProfileAndPosts = async () => {
    try {
      const { data } = await axiosClient.get('/profile');
      setProfile(data);
      const postsRes = await axiosClient.get(`/profile/${data._id}/${activeTab === 'posts' ? 'posts' : 'liked-posts'}`);
      setPosts(postsRes.data);
      setNewName(data.name);
    } catch (error) {
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await axiosClient.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  if (!profile) return <div className="p-10 text-center text-gray-400">Loading profile...</div>;

  return (
    <div className="bg-white min-h-screen pb-safe">
      <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gray-50">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleProfileImageChange} 
          accept="image/*" 
          className="hidden" 
        />
        <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 p-[3px]">
            <img src={profile.profilePic ? `${import.meta.env.VITE_API_URL}/uploads/${profile.profilePic}` : 'https://via.placeholder.com/150'} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white bg-white" />
          </div>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <FiEdit2 className="text-white" size={24} />
          </div>
        </div>
        
        {editingName ? (
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              className="px-3 py-1 text-center font-bold text-lg border-b-2 border-rose-400 focus:outline-none bg-transparent w-40"
              autoFocus
            />
            <button onClick={handleUpdateName} className="p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600">
              <FiCheck />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingName(true)}>
            <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
            <FiEdit2 className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
        
        <button onClick={handleLogout} className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
          <FiLogOut /> Logout
        </button>
      </div>

      <div className="p-1">
        <div className="grid grid-cols-2 text-sm font-bold text-gray-400 tracking-wider uppercase text-center bg-white sticky top-0 z-10 border-b border-gray-100">
          <button 
            className={`p-3 transition-colors ${activeTab === 'posts' ? 'text-rose-500 border-b-2 border-rose-500' : 'hover:text-gray-600'}`}
            onClick={() => setActiveTab('posts')}
          >
            My Recipes
          </button>
          <button 
            className={`p-3 transition-colors ${activeTab === 'likes' ? 'text-rose-500 border-b-2 border-rose-500' : 'hover:text-gray-600'}`}
            onClick={() => setActiveTab('likes')}
          >
            Liked Recipes
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {posts.map(post => (
            <div key={post._id} className="aspect-square bg-gray-200 group relative">
              {post.image ? (
                <img src={`${import.meta.env.VITE_API_URL}/uploads/${post.image}`} alt="Post" className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center p-4 text-xs text-center text-gray-500 leading-tight bg-white border border-gray-100 overflow-hidden break-words">
                   <span className="line-clamp-4 font-semibold text-gray-700">{post.title || post.text || post.description || 'Recipe'}</span>
                 </div>
              )}
              
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button onClick={() => { 
                  setEditingPost(post); 
                  setEditingPostText(post.text || ''); 
                  setEditingPostTitle(post.title || '');
                  setEditingPostDescription(post.description || post.text || '');
                  setEditingPostIngredients(post.ingredients || '');
                  setEditingPostInstructions(post.instructions || '');
                  setEditingPostImage(null); 
                }} className="p-2 bg-white rounded-full text-blue-500 hover:scale-110 transition-transform">
                  <FiEdit size={18} />
                </button>
                <button onClick={() => setDeletingPost(post)} className="p-2 bg-white rounded-full text-rose-500 hover:scale-110 transition-transform">
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {posts.length === 0 && <div className="text-center p-10 text-gray-400">You haven't posted any recipes yet.</div>}
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium z-50 animate-bounce">
          {successMsg}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingPost && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl transform scale-100 transition-transform">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={24} />
            </div>
            <h3 className="font-extrabold text-xl text-center mb-2 tracking-tight">Delete Recipe?</h3>
            <p className="text-gray-500 text-center text-sm mb-6">This action cannot be undone. Are you sure you want to permanently remove this recipe from your profile?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeletingPost(null)} className="flex-1 py-3 px-4 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors">Cancel</button>
              <button onClick={handleDeletePost} className="flex-1 py-3 px-4 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl transition-colors shadow-lg shadow-rose-200">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recipe Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all py-10">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-full overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 tracking-tight">Edit Recipe</h3>
            
            <div className="mb-4">
              <div 
                className="w-full h-32 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer overflow-hidden group relative"
                onClick={() => editFileInputRef.current?.click()}
              >
                {editingPostImage ? (
                  <img src={URL.createObjectURL(editingPostImage)} alt="Preview" className="w-full h-full object-cover" />
                ) : editingPost.image ? (
                  <img src={`${import.meta.env.VITE_API_URL}/uploads/${editingPost.image}`} alt="Current" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <FiPlus size={24} className="mb-2" />
                    <span className="text-sm font-semibold">Change Photo</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold">
                  Change Photo
                </div>
              </div>
              <input 
                type="file" 
                ref={editFileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setEditingPostImage(e.target.files[0]);
                  }
                }}
                accept="image/*" 
                className="hidden" 
              />
            </div>


            
            <input 
              type="text"
              placeholder="Recipe Title" 
              value={editingPostTitle}
              onChange={(e) => setEditingPostTitle(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none font-bold text-lg mb-3"
            />
            <textarea 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm resize-none mb-3"
              value={editingPostDescription}
              onChange={e => setEditingPostDescription(e.target.value)}
              placeholder="Short Description..."
            />
            <textarea 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm resize-none mb-3"
              value={editingPostIngredients}
              onChange={e => setEditingPostIngredients(e.target.value)}
              placeholder="Ingredients..."
            />
            <textarea 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm resize-none"
              value={editingPostInstructions}
              onChange={e => setEditingPostInstructions(e.target.value)}
              placeholder="Instructions..."
            />

            <div className="flex gap-3 justify-end mt-5">
              <button 
                onClick={() => { setEditingPost(null); setEditingPostImage(null); }} 
                className="px-5 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePost} 
                className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-full transition-colors shadow-lg shadow-rose-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

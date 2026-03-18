import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { FiImage, FiUpload } from 'react-icons/fi';

const AddPost = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', text);
      if (image) formData.append('image', image);

      await axiosClient.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate('/');
    } catch (error) {
      console.error('Error creating post', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white min-h-full">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Share a Recipe</h1>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Image Upload Area */}
        <div className="relative w-full h-64 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => document.getElementById('imageUpload')?.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400 group-hover:text-rose-400 transition-colors">
              <FiImage size={48} className="mb-2" />
              <span className="font-semibold text-sm">Tap to upload photo</span>
            </div>
          )}
          <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Recipe Text Input */}
        <div>
          <textarea 
            placeholder="Write your recipe or cooking tips here..." 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-4 h-32 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none resize-none"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || (!text && !image)}
          className="flex items-center justify-center gap-2 w-full py-4 mt-4 font-bold text-white rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-rose-200"
        >
          {loading ? 'Publishing...' : <><FiUpload /> Publish Recipe</>}
        </button>
      </form>
    </div>
  );
};

export default AddPost;

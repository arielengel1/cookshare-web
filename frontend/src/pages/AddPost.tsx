import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { FiImage, FiUpload } from 'react-icons/fi';

const AddPost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnMsg, setWarnMsg] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !description && !image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (title.trim()) formData.append('title', title);
      if (description.trim()) formData.append('description', description);
      if (ingredients.trim()) formData.append('ingredients', ingredients);
      if (instructions.trim()) formData.append('instructions', instructions);
      if (image) formData.append('image', image);

      const { data } = await axiosClient.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.embeddingWarning) {
        setWarnMsg('השמירה הצליחה אך עקב בעיה טכנית הפוסט לא יופיע בחיפוש');
        setTimeout(() => navigate('/'), 3000);
      } else {
        navigate('/');
      }
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
        <div className="flex flex-col gap-4">
          <input 
            type="text"
            placeholder="Recipe Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none font-bold text-lg"
            required
          />
          <textarea 
            placeholder="Short Description..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 h-24 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none resize-none text-sm"
          />
          <textarea 
            placeholder="Ingredients (e.g. 1 cup flour, 2 eggs)" 
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            className="w-full p-4 h-32 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none resize-none text-sm"
          />
          <textarea 
            placeholder="Instructions (Step by Step)" 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-4 h-40 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-rose-400 outline-none resize-none text-sm"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || (!title && !description && !image)}
          className="flex items-center justify-center gap-2 w-full py-4 mt-4 font-bold text-white rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-rose-200"
        >
          {loading ? 'Publishing...' : <><FiUpload /> Publish Recipe</>}
        </button>
      </form>

      {warnMsg && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium z-50 animate-bounce whitespace-nowrap">
          {warnMsg}
        </div>
      )}
    </div>
  );
};

export default AddPost;

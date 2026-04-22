import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const RightSidebar = () => {
  const [topChefs, setTopChefs] = useState<any[]>([]);
  const navigate = useNavigate();

  const categories = ['Breakfast', 'Vegan', 'Dinner', 'Dessert', 'Quick', 'Healthy'];

  useEffect(() => {
    const fetchTopChefs = async () => {
      try {
        const { data } = await axiosClient.get('/profile/top-chefs');
        setTopChefs(data);
      } catch (error) {
        console.error('Failed to load top chefs', error);
      }
    };
    fetchTopChefs();
  }, []);

  return (
    <aside className="hidden xl:flex flex-col w-80 p-6 border-l border-gray-100 bg-white h-screen sticky top-0 overflow-y-auto shrink-0">
      <h3 className="font-extrabold text-xl mb-4 tracking-tight text-gray-800 pt-2">Categories</h3>
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => navigate(`/?category=${cat}`)}
            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-bold hover:bg-rose-100 transition-colors"
          >
            {cat}
          </button>
        ))}
        <button 
          onClick={() => navigate(`/`)}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
        >
          All
        </button>
      </div>

      <h3 className="font-extrabold text-xl mb-4 tracking-tight text-gray-800">Top Chefs Leaderboard</h3>
      <div className="flex flex-col gap-4">
        {topChefs.map((chef, index) => (
          <div key={chef._id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow bg-gray-50/50">
            <div className="font-bold text-rose-400 text-lg w-4 text-center">{index + 1}</div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 p-[2px]">
              <img src={chef.profilePic ? `${import.meta.env.VITE_API_URL}/uploads/${chef.profilePic}` : "https://via.placeholder.com/150"} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-white bg-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm tracking-tight">{chef.name}</div>
              <div className="text-xs text-gray-400 font-semibold">{chef.totalLikes} total likes</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default RightSidebar;

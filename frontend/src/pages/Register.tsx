import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axiosClient from '../api/axiosClient';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const { data } = await axiosClient.post('/auth/google', { token: credentialResponse.credential });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err: any) {
      console.error('Google Auth Error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Google login failed');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-6 bg-gradient-to-tr from-orange-50 to-rose-50">
      <div className="w-full max-w-sm glass-panel p-8 rounded-3xl shadow-2xl">
        <div className="text-center pb-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent italic">CookShare</h1>
          <p className="text-gray-500 mt-2 text-sm">Create an account to share recipes!</p>
        </div>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
            required 
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
            required 
          />
          <button type="submit" className="w-full py-3 mt-2 font-bold text-white rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 hover:opacity-90 transition-opacity shadow-lg shadow-orange-200">
            Sign Up
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-orange-500 font-semibold hover:underline">Log in</Link>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-2">
           <span className="w-1/4 border-b border-gray-300"></span>
           <span className="text-xs text-gray-400 uppercase">Or sign up with</span>
           <span className="w-1/4 border-b border-gray-300"></span>
        </div>
        
        <div className="mt-4 flex justify-center">
            <GoogleLogin
               onSuccess={handleGoogleSuccess}
               onError={() => setError('Google Sign Up Failed')}
            />
        </div>
      </div>
    </div>
  );
};

export default Register;

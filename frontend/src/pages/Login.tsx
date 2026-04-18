import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axiosClient from '../api/axiosClient';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axiosClient.post('/auth/login', { email, password });
      saveTokensAndRedirect(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const { data } = await axiosClient.post('/auth/google', { token: credentialResponse.credential });
      saveTokensAndRedirect(data);
    } catch (err: any) {
      console.error('Google Auth Error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Google login failed');
    }
  };

  const saveTokensAndRedirect = (data: any) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/');
  };

  return (
    <div className="flex h-screen items-center justify-center p-6 bg-gradient-to-br from-rose-50 to-orange-50">
      <div className="w-full max-w-sm glass-panel p-8 rounded-3xl shadow-2xl">
        <div className="text-center pb-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent italic">CookShare</h1>
          <p className="text-gray-500 mt-2 text-sm">Welcome back! Please login to your account.</p>
        </div>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            id='galtal' 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-rose-400 outline-none transition-all"
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-rose-400 outline-none transition-all"
            required 
          />
          <button type="submit" className="w-full py-3 mt-2 font-bold text-white rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 hover:opacity-90 transition-opacity shadow-lg shadow-rose-200">
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/register" className="text-rose-500 font-semibold hover:underline">Sign up</Link>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-2">
           <span className="w-1/4 border-b border-gray-300"></span>
           <span className="text-xs text-gray-400 uppercase">Or continue with</span>
           <span className="w-1/4 border-b border-gray-300"></span>
        </div>
        <div className="mt-4 flex justify-center">
            <GoogleLogin
               onSuccess={handleGoogleSuccess}
               onError={() => setError('Google Login Failed')}
            />
        </div>
      </div>
    </div>
  );
};

export default Login;

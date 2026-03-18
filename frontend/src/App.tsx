import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';

import Home from './pages/Home';
import Search from './pages/Search';
import AddPost from './pages/AddPost';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Comments from './pages/Comments';

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="add" element={<AddPost />} />
          <Route path="profile" element={<Profile />} />
          <Route path="posts/:id/comments" element={<Comments />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;

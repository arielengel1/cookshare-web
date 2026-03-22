import { Navigate } from 'react-router-dom';
import React from "react"; // if not already present

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default AuthGuard;

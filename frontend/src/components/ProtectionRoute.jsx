import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectionRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userString) {
    try {
      const user = JSON.parse(userString);
      if (!allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/barbeiro'} replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectionRoute;

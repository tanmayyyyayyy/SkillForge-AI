import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Loading SkillForge AI session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

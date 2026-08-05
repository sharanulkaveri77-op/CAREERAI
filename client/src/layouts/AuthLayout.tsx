import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const AuthLayout = () => {
  const { token } = useAuthStore();

  // If user is already logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          CareerAI
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

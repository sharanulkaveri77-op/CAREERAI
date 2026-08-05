import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User as UserIcon } from 'lucide-react';

export const DashboardLayout = () => {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();

  // If user is not logged in, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (simplified for now) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">CareerAI</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="flex items-center px-4 py-2 bg-primary/10 text-primary rounded-md cursor-pointer font-medium">
            Dashboard
          </div>
          {/* Add more links here later */}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-slate-100 p-2 rounded-full">
                <UserIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate w-24">
                {user?.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile header placeholder */}
        <header className="h-16 bg-white border-b border-slate-200 md:hidden flex items-center justify-between px-4">
          <h1 className="text-xl font-bold text-slate-900">CareerAI</h1>
          <button onClick={handleLogout} className="text-slate-500">
            <LogOut className="w-5 h-5" />
          </button>
        </header>
        <div className="p-6 lg:p-8 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

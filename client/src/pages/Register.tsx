import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import { Loader2 } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    targetJobRole: '',
    experienceLevel: 'Entry',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', formData);
      const { token, ...user } = response.data;
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-center text-slate-800 mb-6">Create an account</h3>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Full Name</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email address</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Target Job Role</label>
          <input
            type="text"
            name="targetJobRole"
            placeholder="e.g. Frontend Developer"
            value={formData.targetJobRole}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Experience Level</label>
          <select
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white"
          >
            <option value="Entry">Entry Level</option>
            <option value="Mid">Mid Level</option>
            <option value="Senior">Senior Level</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <Link to="/login" className="font-medium text-primary hover:text-primary/80">
          Sign in
        </Link>
      </div>
    </div>
  );
};

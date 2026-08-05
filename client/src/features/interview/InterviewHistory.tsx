import { useState, useEffect } from 'react';
import { History, MessageSquare } from 'lucide-react';
import api from '../../lib/axios';

export const InterviewHistory = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/interview/history');
        setSessions(response.data.sessions);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="h-24 animate-pulse bg-slate-100 rounded-xl"></div>;

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No mock interviews completed yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <History className="w-5 h-5 text-slate-500 mr-2" />
        <h3 className="font-bold text-slate-900">Past Interviews</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {sessions.map((session: any) => (
          <div key={session._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div>
              <p className="font-bold text-slate-800">{session.targetRole}</p>
              <p className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {session.status}
              </span>
              {session.averageScore !== undefined && (
                <span className="font-bold text-primary">{session.averageScore}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

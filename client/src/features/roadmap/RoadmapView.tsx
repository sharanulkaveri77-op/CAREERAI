import { useState, useEffect } from 'react';
import { Loader2, Map, Trophy } from 'lucide-react';
import api from '../../lib/axios';
import { RoadmapMonthCard } from './RoadmapMonthCard';

export const RoadmapView = () => {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRoadmap = async () => {
    setLoading(true);
    try {
      const response = await api.get('/roadmap');
      setRoadmap(response.data.roadmap);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load roadmap');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleToggleTask = async (monthId: string, taskId: string) => {
    try {
      // Optimistic UI update
      const updatedRoadmap = { ...roadmap };
      let completed = 0;
      let total = 0;

      updatedRoadmap.months.forEach((m: any) => {
        m.tasks.forEach((t: any) => {
          if (t._id === taskId) {
            t.isCompleted = !t.isCompleted;
          }
          total++;
          if (t.isCompleted) completed++;
        });
      });
      
      updatedRoadmap.overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
      setRoadmap(updatedRoadmap);

      // Background API call
      await api.put(`/roadmap/task/${monthId}/${taskId}`);
    } catch (err) {
      // Revert on error
      fetchRoadmap();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!roadmap) {
    return null; // Don't render anything if no roadmap exists (JobMatcher will handle generation)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <Map className="w-6 h-6 mr-2 text-primary" /> 
              Your Learning Roadmap
            </h2>
            <p className="text-slate-500 mt-1">
              Target Role: <span className="font-semibold text-slate-700">{roadmap.targetRole}</span>
            </p>
          </div>
          
          <div className="w-full md:w-64 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-700 flex items-center">
                <Trophy className="w-4 h-4 mr-1 text-amber-500" /> Progress
              </span>
              <span className="text-sm font-bold text-primary">{roadmap.overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${roadmap.overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {roadmap.months.map((month: any) => (
            <div key={month._id} className="relative z-10">
              <RoadmapMonthCard month={month} onToggleTask={handleToggleTask} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

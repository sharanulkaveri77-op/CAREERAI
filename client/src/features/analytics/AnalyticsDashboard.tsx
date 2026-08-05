import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Loader2, TrendingUp, Award, Target, Rocket } from 'lucide-react';
import api from '../../lib/axios';

export const AnalyticsDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        setData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const radialData = [
    { name: 'Completion', value: data.roadmapCompletion, fill: '#0f172a' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Stat Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 font-medium text-sm">Resume ATS Score</p>
            <h3 className="text-3xl font-bold mt-1">
              {data.resumeTrend[data.resumeTrend.length - 1]?.score || 0}<span className="text-lg opacity-75">/100</span>
            </h3>
          </div>
          <Award className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-20" />
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 font-medium text-sm">Skills Mastered</p>
            <h3 className="text-3xl font-bold mt-1">
              {data.resumeTrend[data.resumeTrend.length - 1]?.skillsCount || 0}
            </h3>
          </div>
          <TrendingUp className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-20" />
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-orange-100 font-medium text-sm">Avg Interview Score</p>
            <h3 className="text-3xl font-bold mt-1">
              {data.interviewTrend[data.interviewTrend.length - 1]?.score || 0}<span className="text-lg opacity-75">%</span>
            </h3>
          </div>
          <Target className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-20" />
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 font-medium text-sm">Roadmap Progress</p>
            <h3 className="text-3xl font-bold mt-1">
              {data.roadmapCompletion}<span className="text-lg opacity-75">%</span>
            </h3>
          </div>
          <Rocket className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Resume Score Area Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Resume Score Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.resumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Growth Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Skill Acquisition Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.resumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="skillsCount" name="Skills" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interview Performance Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Mock Interview Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.interviewTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="score" name="Avg Score" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Roadmap Completion Radial Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-slate-800 mb-2">Roadmap Completion</h3>
          <div className="h-56 relative flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} 
                data={radialData} startAngle={90} endAngle={-270}
              >
                <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">{data.roadmapCompletion}%</span>
              <span className="text-sm text-slate-500 font-medium mt-1">Completed</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

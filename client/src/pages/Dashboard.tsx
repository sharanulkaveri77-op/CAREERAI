import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Briefcase, Target, Award, Play } from 'lucide-react';
import { ResumeUploader } from '../features/resume/ResumeUploader';
import { ResumeFeedback } from '../features/resume/ResumeFeedback';
import { JobMatcher } from '../features/jobs/JobMatcher';
import { RoadmapView } from '../features/roadmap/RoadmapView';
import { InterviewSimulator } from '../features/interview/InterviewSimulator';
import { AnalyticsDashboard } from '../features/analytics/AnalyticsDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [showInterview, setShowInterview] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {showInterview && <InterviewSimulator onClose={() => setShowInterview(false)} />}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back, {user?.name}! 👋</h2>
        <p className="text-slate-500">Here's an overview of your career progress.</p>
      </div>

      <ErrorBoundary fallback={<div className="p-6 bg-white rounded-xl border border-slate-200"><h3 className="font-bold text-red-500">Failed to load analytics</h3></div>}>
        <AnalyticsDashboard />
      </ErrorBoundary>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-start space-x-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Target Role</p>
              <p className="text-lg font-bold text-slate-900">{user?.targetJobRole || 'Not set'}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInterview(true)}
            className="w-full flex items-center justify-center py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Play className="w-4 h-4 mr-2" /> Start Mock Interview
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start space-x-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Experience</p>
            <p className="text-lg font-bold text-slate-900">{user?.experienceLevel || 'Entry'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start space-x-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Current Skills</p>
            <p className="text-lg font-bold text-slate-900">{user?.currentSkills?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <RoadmapView />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-4 border-t border-slate-200">
        <div className="lg:col-span-1 space-y-6">
          <ResumeUploader onAnalysisComplete={(data) => setAnalysis(data)} />
        </div>
        
        <div className="lg:col-span-2">
          {analysis ? (
            <ResumeFeedback analysis={analysis} />
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 shadow-sm h-full flex flex-col items-center justify-center text-center min-h-[500px]">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No Resume Analyzed</h3>
              <p className="text-slate-500 mt-2 max-w-sm">
                Upload your resume (PDF or DOCX) in the panel to the left to get deep AI feedback, scoring, and targeted rewrite suggestions powered by Groq AI.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200">
        <JobMatcher />
      </div>
    </div>
  );
};

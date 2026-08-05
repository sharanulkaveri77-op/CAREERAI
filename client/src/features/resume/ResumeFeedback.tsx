import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Zap } from 'lucide-react';

interface ResumeFeedbackProps {
  analysis: {
    overallScore: number;
    detectedSkills: string[];
    sectionFeedback: Array<{ section: string; feedback: string }>;
    bulletRewrites: Array<{ original: string; suggestion: string; reason: string }>;
  };
}

export const ResumeFeedback = ({ analysis }: ResumeFeedbackProps) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a'; // green-600
    if (score >= 60) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  const scoreColor = getScoreColor(analysis.overallScore);
  // Calculate SVG stroke dasharray for the gauge
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analysis.overallScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Top Row: Score and Skills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Score Gauge */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm col-span-1 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Claude AI Score</h3>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={scoreColor}
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-800" style={{ color: scoreColor }}>
                {analysis.overallScore}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Overall strength and ATS compatibility.
          </p>
        </div>

        {/* Skills List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-slate-900">Detected Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.detectedSkills.map((skill, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section Feedback Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-slate-900">Section-by-Section Feedback</h3>
        </div>
        <div className="space-y-3">
          {analysis.sectionFeedback.map((item, index) => (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedSection(expandedSection === index ? null : index)}
              >
                <span className="font-semibold text-slate-800">{item.section}</span>
                {expandedSection === index ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </button>
              {expandedSection === index && (
                <div className="p-4 bg-white text-slate-600 text-sm leading-relaxed border-t border-slate-200">
                  {item.feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bullet Rewrites */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900">Bullet Point Rewrites</h3>
        </div>
        
        <div className="space-y-4">
          {analysis.bulletRewrites.map((item, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-amber-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Original Text</p>
                  <p className="text-sm text-slate-600 line-through decoration-red-300/50">{item.original}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-amber-600 uppercase mb-2 flex items-center">
                    Claude's Suggestion
                  </p>
                  <p className="text-sm text-slate-900 font-medium">{item.suggestion}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Why it works:</span> {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

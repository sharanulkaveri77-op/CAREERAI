import { Check, X } from 'lucide-react';

interface SkillGapCardProps {
  job: {
    title: string;
    company: string;
    description: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
}

export const SkillGapCard = ({ job }: SkillGapCardProps) => {
  const matchPercentage = Math.round(job.matchScore * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
          <p className="text-sm font-medium text-primary">{job.company}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
          matchPercentage >= 75 ? 'bg-green-100 text-green-700' :
          matchPercentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {matchPercentage}% Match
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-6">{job.description}</p>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
            <Check className="w-3 h-3 mr-1 text-green-500" /> Matched Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {job.matchedSkills.length > 0 ? (
              job.matchedSkills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">None</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
            <X className="w-3 h-3 mr-1 text-red-500" /> Missing Skills (Gap)
          </h4>
          <div className="flex flex-wrap gap-2">
            {job.missingSkills.length > 0 ? (
              job.missingSkills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">None! You're a perfect fit.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

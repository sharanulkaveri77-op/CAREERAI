import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileSearch, ClipboardList } from 'lucide-react';
import api from '../../lib/axios';

interface AtsCheck {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
}

interface AtsReport {
  score: number;
  keywordMatchRate: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  checks: AtsCheck[];
  resumeWordCount: number;
  comparedAgainstJd: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 60) return '#ca8a04'; // yellow-600
  return '#dc2626'; // red-600
};

export const ATSReport = () => {
  const [report, setReport] = useState<AtsReport | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);
  const [error, setError] = useState('');

  const runCheck = async (description: string) => {
    setLoading(true);
    setError('');
    setNeedsResume(false);
    try {
      const { data } = await api.post('/resume/ats', { jobDescription: description });
      setReport(data.report);
      window.dispatchEvent(new Event('gamification-updated'));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNeedsResume(true);
        setReport(null);
      } else {
        setError(err.response?.data?.message || 'Failed to run ATS check. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreColor = getScoreColor(report?.score ?? 0);
  const rate = report?.keywordMatchRate ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-1">
        <FileSearch className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-slate-900">ATS Compatibility Checker</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Simulates how Applicant Tracking Systems parse your resume. Formatting checks are
        rule-based and deterministic; keyword extraction uses AI.
      </p>

      {needsResume && (
        <div className="flex items-start space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Upload and analyze a resume first — the ATS checker runs against your latest analysis.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 font-medium mb-4">{error}</p>}

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center border border-slate-200 rounded-lg p-6">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">ATS Score</span>
              <span className="text-5xl font-black my-2" style={{ color: scoreColor }}>
                {report.score}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
              <span className="text-xs text-slate-400 mt-2">
                {report.resumeWordCount} words extracted ·{' '}
                {report.comparedAgainstJd ? `JD match ${Math.round(rate * 100)}%` : 'structural check only'}
              </span>
            </div>

            <div className="md:col-span-2 space-y-2 max-h-80 overflow-y-auto pr-1">
              {report.checks.map((check) => {
                const keywordPartial = check.key === 'keywords' && !check.passed && rate >= 0.4;
                return (
                  <div key={check.key} className={`border rounded-lg p-3 flex items-start space-x-3 ${keywordPartial ? 'border-amber-200 bg-amber-50/40' : check.passed ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50/40'}`}>
                    {keywordPartial ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${keywordPartial ? 'text-amber-800' : check.passed ? 'text-slate-900' : 'text-red-800'}`}>
                        {check.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {report.comparedAgainstJd && report.matchedKeywords.length + report.missingKeywords.length > 0 && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Keywords Found ({report.matchedKeywords.length})</p>
                <div className="flex flex-wrap gap-2">
                  {report.matchedKeywords.map((word) => (
                    <span key={word} className="px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-full text-sm font-medium">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Missing from Resume ({report.missingKeywords.length})</p>
                <div className="flex flex-wrap gap-2">
                  {report.missingKeywords.map((word) => (
                    <span key={word} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="flex items-center space-x-2 mb-2">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Compare against a job description</p>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste a target job description to check keyword coverage..."
          rows={4}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        <button
          onClick={() => runCheck(jobDescription)}
          disabled={loading}
          className="mt-3 inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking ATS compatibility...
            </>
          ) : (
            'Run ATS Check'
          )}
        </button>
      </div>
    </div>
  );
};
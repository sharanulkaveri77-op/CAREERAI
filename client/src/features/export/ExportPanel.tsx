import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import api from '../../lib/axios';

const downloadCloud = async (path: string, filename: string): Promise<void> => {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const ExportPanel = () => {
  const [busy, setBusy] = useState<'report' | 'roadmap' | null>(null);
  const [message, setMessage] = useState('');

  const handleDownload = async (kind: 'report' | 'roadmap', path: string, filename: string) => {
    setBusy(kind);
    setMessage('');
    try {
      await downloadCloud(path, filename);
      setMessage(`${kind === 'report' ? 'Resume report' : 'Roadmap'} downloaded as PDF.`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Nothing to export yet — analyze a resume or generate a roadmap first.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Export as PDF</h2>
        <p className="text-sm text-slate-500">
          Download your resume report or career roadmap as a shareable document.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleDownload('report', '/export/resume-report', 'careerai-resume-report.pdf')}
          disabled={busy !== null}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {busy === 'report' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Resume Report
        </button>
        <button
          onClick={() => handleDownload('roadmap', '/export/roadmap', 'careerai-roadmap.pdf')}
          disabled={busy !== null}
          className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {busy === 'roadmap' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Career Roadmap
        </button>
      </div>
      {message && <p className="w-full text-sm text-slate-600">{message}</p>}
    </div>
  );
};
import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, X } from 'lucide-react';
import api from '../../lib/axios';

interface ResumeUploaderProps {
  onAnalysisComplete: (analysis: any) => void;
}

export const ResumeUploader = ({ onAnalysisComplete }: ResumeUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(selected.type)) {
        setError('Please upload a PDF or DOCX file.');
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await api.post('/resume/analyze', formData);

      onAnalysisComplete(response.data.analysis);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      const backendError = err.response?.data?.error;
      const backendMessage = err.response?.data?.message;
      setError(backendError ? `${backendMessage}: ${backendError}` : (backendMessage || err.message || 'Failed to analyze resume. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Upload Resume</h3>
      
      {!file ? (
        <div 
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Click to upload your resume</p>
          <p className="text-xs text-slate-500 mt-1">Supports PDF & DOCX up to 10MB</p>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="truncate w-48 sm:w-64">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={() => setFile(null)}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full flex items-center justify-center py-2 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claude AI is Analyzing...
              </>
            ) : (
              'Analyze with Claude AI'
            )}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};

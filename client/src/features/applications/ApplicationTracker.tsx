import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Plus, Trash2, Loader2, KanbanSquare } from 'lucide-react';
import api from '../../lib/axios';
import { useTrackerStore } from '../../store/useTrackerStore';

const COLUMNS = [
  { status: 'SAVED', label: 'Saved', dotClass: 'bg-slate-400' },
  { status: 'APPLIED', label: 'Applied', dotClass: 'bg-blue-500' },
  { status: 'INTERVIEWING', label: 'Interviewing', dotClass: 'bg-amber-500' },
  { status: 'OFFER', label: 'Offer', dotClass: 'bg-green-500' },
  { status: 'REJECTED', label: 'Rejected', dotClass: 'bg-red-500' },
] as const;

interface Application {
  _id: string;
  job?: string;
  title: string;
  company: string;
  jobUrl: string;
  matchScore: number;
  status: string;
  position: number;
}

const DroppableColumn = ({ status, label, dotClass, children }: { status: string; label: string; dotClass: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[220px] flex-1 bg-slate-50/80 rounded-xl border p-3 transition-colors ${
        isOver ? 'border-primary/60 bg-primary/5' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center space-x-2 px-1 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="space-y-2 flex-1">{children}</div>
    </div>
  );
};

const ApplicationCard = ({ application, onDelete }: { application: Application; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application._id,
    data: { status: application.status },
  });

  const style = transform
    ? { transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-white border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-40 ring-2 ring-primary/40' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <p className="text-sm font-bold text-slate-900 truncate">{application.title}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{application.company}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(application._id);
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-0.5"
          aria-label="Remove from board"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2">
        {application.matchScore > 0 ? (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${scoreBadgeClass(application.matchScore)}`}>
            {application.matchScore}% match
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">manual</span>
        )}
      </div>
    </div>
  );
};

const scoreBadgeClass = (score: number) => {
  if (score >= 70) return 'bg-green-50 text-green-700 border border-green-200';
  if (score >= 40) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-red-50 text-red-700 border border-red-200';
};

export const ApplicationTracker = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', jobUrl: '' });
  const { pendingJob, clearPendingJob } = useTrackerStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/applications');
      setApplications(data.applications);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your tracker');
    } finally {
      setLoading(false);
    }
  };

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Application[]> = {};
    for (const column of COLUMNS) groups[column.status] = [];
    for (const app of applications) {
      groups[app.status]?.push(app);
    }
    return groups;
  }, [applications]);

  const addApplication = async (payload: { title?: string; company?: string; jobUrl?: string; jobId?: string; matchScore?: number }) => {
    try {
      await api.post('/applications', payload);
      await fetchApplications();
      window.dispatchEvent(new Event('gamification-updated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add application');
    }
  };

  // Consume a job queued by the Job Matcher
  useEffect(() => {
    if (pendingJob) {
      addApplication({ jobId: pendingJob.jobId, matchScore: pendingJob.matchScore });
      clearPendingJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJob]);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const app = applications.find((item) => item._id === active.id);
    if (!app) return;
    if (app.status === over.id) return;

    // Optimistic update first for snappy UX; revert with a refetch on failure
    const targetStatus = String(over.id);
    const targetCount = groupedByStatus[targetStatus]?.length ?? 0;
    const previous = applications;
    setApplications(
      applications.map((item) => (item._id === app._id ? { ...item, status: targetStatus, position: targetCount } : item))
    );

    api
      .patch(`/applications/${app._id}`, { status: targetStatus, position: targetCount })
      .then(() => window.dispatchEvent(new Event('gamification-updated')))
      .catch(() => {
        setApplications(previous);
        setError('Failed to move application — check your connection.');
      });
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/applications/${id}`);
      setApplications(applications.filter((item) => item._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove application');
    }
  };

  const handleManualAdd = async () => {
    if (!form.title.trim() || !form.company.trim()) {
      setError('Title and company are required.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await addApplication({ title: form.title, company: form.company, jobUrl: form.jobUrl });
      setForm({ title: '', company: '', jobUrl: '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add application');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <KanbanSquare className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-slate-900">Application Tracker</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">Drag cards between columns — every move is saved to your profile.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Job Manually
        </button>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Job title"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Company"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            value={form.jobUrl}
            onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
            placeholder="Job posting URL (optional)"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleManualAdd}
            disabled={adding}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Add to Board
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map((column) => (
              <DroppableColumn key={column.status} status={column.status} label={column.label} dotClass={column.dotClass}>
                {groupedByStatus[column.status].map((app) => (
                  <ApplicationCard key={app._id} application={app} onDelete={handleDelete} />
                ))}
                {groupedByStatus[column.status].length === 0 && (
                  <div className="text-xs text-slate-400 text-center border border-dashed border-slate-300 rounded-lg py-4">
                    Drop jobs here
                  </div>
                )}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};
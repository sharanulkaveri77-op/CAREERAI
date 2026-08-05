import { BookOpen, Code, Clock, CalendarDays } from 'lucide-react';

interface Task {
  _id: string;
  description: string;
  isCompleted: boolean;
}

interface RoadmapMonth {
  _id: string;
  monthNumber: number;
  focusArea: string;
  estimatedHours: number;
  topics: string[];
  resources: string[];
  projects: string[];
  tasks: Task[];
}

interface RoadmapMonthCardProps {
  month: RoadmapMonth;
  onToggleTask: (monthId: string, taskId: string) => void;
}

export const RoadmapMonthCard = ({ month, onToggleTask }: RoadmapMonthCardProps) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 text-primary p-3 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
            <CalendarDays className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold uppercase">Month {month.monthNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{month.focusArea}</h3>
            <div className="flex items-center text-sm text-slate-500 mt-1">
              <Clock className="w-4 h-4 mr-1" /> {month.estimatedHours} hours / week
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
            <BookOpen className="w-4 h-4 mr-1 text-blue-500" /> Topics & Resources
          </h4>
          <ul className="space-y-2 mb-4">
            {month.topics.map((topic, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start">
                <span className="text-blue-500 mr-2">•</span> {topic}
              </li>
            ))}
          </ul>
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            {month.resources.map((res, i) => (
              <a key={i} href="#" className="block text-sm text-blue-700 hover:underline mb-1 last:mb-0">
                📚 {res}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
            <Code className="w-4 h-4 mr-1 text-purple-500" /> Mini Projects
          </h4>
          <div className="space-y-2">
            {month.projects.map((proj, i) => (
              <div key={i} className="bg-purple-50 border border-purple-100 text-purple-800 text-sm p-3 rounded-lg">
                🚀 {proj}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 bg-slate-50">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Actionable Tasks
        </h4>
        <div className="space-y-3">
          {month.tasks.map((task) => (
            <label 
              key={task._id} 
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                task.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-primary/30'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  checked={task.isCompleted}
                  onChange={() => onToggleTask(month._id, task._id)}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </div>
              <span className={`text-sm ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}>
                {task.description}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

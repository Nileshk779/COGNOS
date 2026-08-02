import { Folder, Clock, MoreVertical, Plus } from 'lucide-react';

const projects = [
  { id: 1, name: 'Time for your daily AI Interview', status: 'Data Structures — 10 minutes', progress: 0, due: 'Just now', color: 'bg-violet-500' },
  { id: 2, name: 'Confidence dropped in Calculus', status: 'Quick review recommended', progress: 0, due: '1 hour ago', color: 'bg-pink-500' },
  { id: 3, name: 'New roadmap milestone unlocked', status: 'Full-Stack Engineer Path', progress: 100, due: 'Today', color: 'bg-emerald-500' },
  { id: 4, name: 'Weekly AI Report ready', status: 'Your progress summary is in', progress: 100, due: 'Yesterday', color: 'bg-blue-500' },
];

export default function Projects() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Smart Learning Nudges</h2>
          <p className="text-sm text-slate-500">Nudges from COGNOS to keep you on track</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus size={16} />
          Mark All Read
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${project.color} rounded-xl flex items-center justify-center text-white`}>
                <Folder size={20} />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical size={16} />
              </button>
            </div>

            <h3 className="font-bold text-slate-800 mb-1">{project.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{project.status}</p>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={12} />
              <span>{project.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

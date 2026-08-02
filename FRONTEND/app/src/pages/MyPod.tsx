import { Folder, CheckCircle2, MoreVertical, Plus } from 'lucide-react';

const projects = [
  { id: 1, name: 'VoiceBridge (Phone Call)', status: 'Connected', progress: 100, due: 'Active', color: 'bg-violet-500' },
  { id: 2, name: 'WhatsApp Nudges', status: 'Connected', progress: 100, due: 'Active', color: 'bg-pink-500' },
  { id: 3, name: 'Web App', status: 'Connected', progress: 100, due: 'Active', color: 'bg-emerald-500' },
  { id: 4, name: 'Offline Mode', status: 'Available', progress: 0, due: 'Not enabled', color: 'bg-blue-500' },
];

export default function Projects() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Learning Channels</h2>
          <p className="text-sm text-slate-500">How you access COGNOS</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus size={16} />
          Add Channel
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
              <CheckCircle2 size={12} />
              <span>{project.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

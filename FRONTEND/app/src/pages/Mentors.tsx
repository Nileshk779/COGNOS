import { Search, Mail, MoreHorizontal } from 'lucide-react';

const contacts = [
  { id: 1, name: 'AIM Assistant', role: 'AI Mentor', email: 'mentor@cognos.ai', phone: '+1 234 567 890', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 2, name: 'Career Coach AI', role: 'AI Career Coach', email: 'coach@cognos.ai', phone: '+1 234 567 891', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 3, name: 'Doubt Solver AI', role: 'AI Doubt Solver', email: 'doubts@cognos.ai', phone: '+1 234 567 892', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 4, name: 'Learner Support', role: 'Human Support', email: 'support@cognos.ai', phone: '+1 234 567 893', avatar: 'https://i.pravatar.cc/150?img=8' },
];

export default function Contacts() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Your Mentors & Support</h2>
          <p className="text-sm text-slate-500">Reach your AI mentors and human support team</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mentors..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
          <div className="col-span-6 sm:col-span-4">Name</div>
          <div className="col-span-6 sm:col-span-3">Role</div>
          <div className="hidden sm:block sm:col-span-3">Contact</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Actions</div>
        </div>
        
        {contacts.map((contact) => (
          <div key={contact.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
            <div className="col-span-6 sm:col-span-4 flex items-center gap-3">
              <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{contact.name}</p>
                <p className="text-xs text-slate-500 sm:hidden">{contact.role}</p>
              </div>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                {contact.role}
              </span>
            </div>
            <div className="hidden sm:block sm:col-span-3">
              <div className="flex flex-col gap-1">
                <a href={`mailto:${contact.email}`} className="text-xs text-slate-600 hover:text-violet-600 flex items-center gap-1">
                  <Mail size={12} /> {contact.email}
                </a>
              </div>
            </div>
            <div className="hidden sm:block sm:col-span-2 text-right">
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
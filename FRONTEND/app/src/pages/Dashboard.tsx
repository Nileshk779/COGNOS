import { useState, useEffect } from 'react';
import {
  House,
  GraduationCap,
  Users,
  MessagesSquare,
  TrendingUp,
  Briefcase,
  Swords,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  CircleUserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import type { ConversationSummary, NotificationItem } from '@/lib/types';

import Home from './Home';
import Teachers from './Teachers';
import Circle from './Circle';
import Messages from './Messages';
import Growth from './Growth';
import Opportunities from './Opportunities';
import Quests from './Quests';
import Marketplace from './Marketplace';
import CalendarPage from './CalendarPage';
import ProfilePage from './ProfilePage';

import SidebarNavItem from '@/components/dashboard/SidebarNavItem';
import SidebarUtilityItem from '@/components/dashboard/SidebarUtilityItem';
import AmbientBackground from '@/components/dashboard/AmbientBackground';
import TopBar from '@/components/dashboard/TopBar';
import SettingsModal from '@/components/dashboard/SettingsModal';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';

import { useApp, type RouteKey } from '@/context/AppContext';

type UserType = {
  id: string;
  email: string;
  name: string;
  pfp?: string;
};

const navItems: { id: RouteKey; icon: any; label: string; subtitle?: string }[] = [
  { id: 'Home', icon: House, label: 'Home' },
  { id: 'Teachers', icon: GraduationCap, label: 'My Teachers' },
  { id: 'Circle', icon: Users, label: 'My Pods (3605)', subtitle: "inspired by IABTM's community space" },
  { id: 'Messages', icon: MessagesSquare, label: 'Messages' },
  { id: 'Growth', icon: TrendingUp, label: 'Growth' },
  { id: 'Opportunities', icon: Briefcase, label: 'Opportunities' },
  { id: 'Quests', icon: Swords, label: 'Quests' },
  { id: 'Marketplace', icon: Package, label: 'The Stash' },
];

const routes: Record<RouteKey, React.ComponentType> = {
  Home,
  Teachers,
  Circle,
  Messages,
  Growth,
  Opportunities,
  Quests,
  Marketplace,
  Calendar: CalendarPage,
  Profile: ProfilePage,
};

const pageTitles: Record<RouteKey, string> = {
  Home: 'Home',
  Teachers: 'My Teachers',
  Circle: 'My Pods',
  Messages: 'Messages',
  Growth: 'Growth',
  Opportunities: 'Opportunities',
  Quests: 'Side Quests',
  Marketplace: 'The Stash',
  Calendar: 'Calendar',
  Profile: 'Profile',
};

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { activeTab, setActiveTab, setUserId, userId, conversations, setConversations } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);

  const unreadCount = notificationItems.filter((n) => !n.read).length;
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  useEffect(() => {
    if (!userId) return;
    apiFetch<NotificationItem[]>(`/notifications/${userId}`)
      .then(setNotificationItems)
      .catch(() => setNotificationItems([]));
    apiFetch<ConversationSummary[]>(`/messages/conversations/${userId}`)
      .then(setConversations)
      .catch(() => setConversations([]));
  }, [userId, setConversations]);

  const markNotificationRead = (id: string) => {
    setNotificationItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };
  const markAllNotificationsRead = () => {
    const unreadIds = notificationItems.filter((n) => !n.read).map((n) => n.id);
    setNotificationItems((prev) => prev.map((n) => ({ ...n, read: true })));
    Promise.all(unreadIds.map((id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }))).catch(() => {});
  };

  const isElectron = (window as any).isElectron === true;

  const CurrentComponent = routes[activeTab] || Home;

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleFocus = () => {
      window.location.reload();
    };

    window.addEventListener('pageshow', handleFocus);

    return () => {
      window.removeEventListener('pageshow', handleFocus);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromURL = params.get('token');

    if (tokenFromURL) {
      localStorage.setItem('token', tokenFromURL);
      window.history.replaceState({}, document.title, '/dashboard');
    }

    const token = localStorage.getItem('token');

    if (!token) {
      window.location.replace('/login');
      return;
    }

    fetch('http://localhost:8000/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setUserId(data.id);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });

    const skipped = sessionStorage.getItem('skippedOnboarding');
    if (skipped) {
      sessionStorage.removeItem('skippedOnboarding');
    } else {
      fetch('http://localhost:8000/onboarded', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((d) => {
          if (!d.onboarded) {
            window.location.replace('/onboarding');
          }
        });
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl" style={{ color: colors.textMain, backgroundColor: colors.bg }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: colors.bg }}>
        <p className="text-lg" style={{ color: colors.textMain }}>
          Not logged in
        </p>
        <a
          href="/login"
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: colors.primary }}
        >
          Go to Login
        </a>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (isElectron) window.location.replace('/splash');
    else window.location.replace('/');
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: colors.bg }}>
      {/* Sidebar */}
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-300 border-r flex-shrink-0',
          isSidebarOpen ? 'w-64' : 'w-16'
        )}
        style={{
          background: 'linear-gradient(180deg, #FBFDFF 0%, #F8FAFC 100%)',
          borderColor: colors.border,
        }}
      >
        {/* HEADER: logo + collapse toggle together, top of sidebar */}
        <div
          className={cn(
            'h-16 flex items-center border-b flex-shrink-0',
            isSidebarOpen ? 'justify-between px-3' : 'justify-center'
          )}
          style={{ borderColor: colors.border }}
        >
          {isSidebarOpen ? (
            <>
              <img src="/logo2.png" className="h-11 object-contain" alt="COGNOS" />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={17} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-hide">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              subtitle={item.subtitle}
              active={activeTab === item.id}
              expanded={isSidebarOpen}
              onClick={() => setActiveTab(item.id)}
              badge={item.id === 'Messages' ? unreadMessagesCount : undefined}
            />
          ))}
        </div>

        {/* FOOTER: utility overlays */}
        <div className="p-2 border-t flex-shrink-0 space-y-0.5" style={{ borderColor: colors.border }}>
          <SidebarUtilityItem
            icon={Settings}
            label="Settings"
            expanded={isSidebarOpen}
            onClick={() => setSettingsOpen(true)}
          />
          <SidebarUtilityItem
            icon={CircleUserRound}
            label={user.name || 'Profile'}
            expanded={isSidebarOpen}
            onClick={() => setActiveTab('Profile')}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <TopBar
          title={pageTitles[activeTab]}
          subtitle={activeTab === 'Circle' ? "inspired by IABTM's own community space" : undefined}
          userName={user.name || 'Learner'}
          unreadCount={unreadCount}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenProfile={() => setActiveTab('Profile')}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenCalendar={() => setActiveTab('Calendar')}
          onLogout={handleLogout}
        />

        <div className="relative flex-1 min-h-0 overflow-hidden">
          <AmbientBackground />
          <div className="relative h-full min-h-0 z-10">
            <CurrentComponent />
          </div>
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={user.name || 'Learner'}
        userEmail={user.email}
      />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={notificationItems}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
      />
    </div>
  );
}

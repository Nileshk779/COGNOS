import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Send, Users, Users2 } from 'lucide-react';
import { accents, colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_META } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import type { Pod, PodDetail, PodMember, PodPostWithAuthor } from '@/lib/types';
import EmptyState from '@/components/dashboard/EmptyState';
import { CardSkeleton, SkeletonBlock } from '@/components/dashboard/CardSkeleton';

const kindStyle: Record<PodPostWithAuthor['post_type'], { bg: string; color: string; label: string }> = {
  win: { bg: '#D1FAE5', color: '#059669', label: 'Win' },
  struggle: { bg: '#FEF3C7', color: '#B45309', label: 'Struggling' },
  update: { bg: '#DBEAFE', color: '#2563EB', label: 'Update' },
};

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.1, backgroundColor: accents.blue.bg, color: accents.blue.color }}
    >
      {initials}
    </div>
  );
}

function PostCard({ post, idx }: { post: PodPostWithAuthor; idx: number }) {
  const kind = kindStyle[post.post_type];
  return (
    <motion.div
      className="rounded-2xl border-2 bg-white p-5"
      style={{ borderColor: colors.border }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.25 }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={post.author_name ?? 'Pod member'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: colors.textMain }}>
              {post.author_name ?? 'Pod member'}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: kind.bg, color: kind.color }}>
              {kind.label}
            </span>
          </div>
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            {new Date(post.created_at).toLocaleString()}
          </span>
        </div>
      </div>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: colors.textMain }}>
        {post.content}
      </p>
    </motion.div>
  );
}

function PodDetailScreen({ pod, onBack }: { pod: Pod; onBack: () => void }) {
  const meta = CATEGORY_META[pod.goal_category];
  const accent = accents[meta?.accent ?? 'blue'];

  const [info, setInfo] = useState<PodDetail | null>(null);
  const [members, setMembers] = useState<PodMember[] | null>(null);
  const [posts, setPosts] = useState<PodPostWithAuthor[] | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [draft, setDraft] = useState('');
  const [postType, setPostType] = useState<PodPostWithAuthor['post_type']>('update');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    apiFetch<PodDetail>(`/pods/${pod.id}/info`).then(setInfo).catch(() => setInfo(null));
    apiFetch<PodMember[]>(`/pods/${pod.id}/members`).then(setMembers).catch(() => setMembers([]));
    apiFetch<PodPostWithAuthor[]>(`/pods/${pod.id}/posts`).then(setPosts).catch(() => setPosts([]));
  }, [pod.id]);

  const visibleMembers = members ? (showAllMembers ? members : members.slice(0, 10)) : [];

  const submitPost = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const saved = await apiFetch<PodPostWithAuthor>(`/pods/${pod.id}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content: draft.trim(), post_type: postType }),
      });
      setPosts((prev) => [saved, ...(prev ?? [])]);
      setDraft('');
    } catch {
      // stays on draft
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" style={{ color: colors.textSecondary }} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
            {pod.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accent.bg, color: accent.color }}>
              {meta?.label}
            </span>
            {info && (
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                {info.member_count} member{info.member_count === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MEMBERS */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textSecondary }}>
          Members
        </h2>
        {members === null ? (
          <SkeletonBlock className="h-16" />
        ) : members.length === 0 ? (
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            No members yet.
          </p>
        ) : (
          <div className="rounded-2xl border-2 bg-white p-4" style={{ borderColor: colors.border }}>
            <div className="flex flex-wrap gap-4">
              {visibleMembers.map((m) => (
                <div key={m.user_id} className="flex flex-col items-center gap-1.5 w-16">
                  <Avatar name={m.name} size={9} />
                  <span className="text-[10px] text-center truncate w-full" style={{ color: colors.textSecondary }}>
                    {m.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            {members.length > 10 && (
              <button
                onClick={() => setShowAllMembers((v) => !v)}
                className="flex items-center gap-1 mt-3 text-xs font-semibold"
                style={{ color: colors.primary }}
              >
                {showAllMembers ? 'Show less' : `View all ${members.length}`}
                <ChevronRight className={`w-3 h-3 transition-transform ${showAllMembers ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* COMPOSER */}
      <div className="rounded-2xl border-2 bg-white p-4" style={{ borderColor: colors.border }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Share a win, a struggle, or an update..."
          rows={2}
          className="w-full text-sm outline-none resize-none"
          style={{ color: colors.textMain }}
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
          <div className="flex gap-1.5">
            {(['win', 'struggle', 'update'] as const).map((t) => {
              const style = kindStyle[t];
              const isActive = postType === t;
              return (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                  style={isActive ? { backgroundColor: style.bg, color: style.color, borderColor: style.color } : { backgroundColor: 'transparent', color: colors.textSecondary, borderColor: colors.border }}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
          <motion.button
            onClick={submitPost}
            disabled={!draft.trim() || posting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: colors.primary }}
            whileHover={draft.trim() ? { scale: 1.03 } : undefined}
            whileTap={draft.trim() ? { scale: 0.97 } : undefined}
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </motion.button>
        </div>
      </div>

      {/* POSTS */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textSecondary }}>
          Updates
        </h2>
        {posts === null ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-28" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState icon={Users2} title="No updates yet" description="Be the first to share a win, struggle, or update in this pod." />
        ) : (
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <PostCard key={post.id} post={post} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Circle() {
  const { userId } = useApp();
  const [pods, setPods] = useState<Pod[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePod, setActivePod] = useState<Pod | null>(null);

  useEffect(() => {
    if (!userId) return;
    setPods(null);
    apiFetch<Pod[]>(`/pods/${userId}`)
      .then(setPods)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load pods'));
  }, [userId]);

  if (activePod) {
    return <PodDetailScreen pod={activePod} onBack={() => setActivePod(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
          My Pods
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Your circle — people chasing the same goals, showing up for each other.
        </p>
        <p className="text-xs mt-1 italic" style={{ color: colors.textSecondary }}>
          Inspired by IABTM's own community space.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: colors.textSecondary }}>
          <Users className="w-4 h-4" />
          My Pods
        </h2>

        {pods === null ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <p className="text-xs" style={{ color: '#DC2626' }}>
            {error}
          </p>
        ) : pods.length === 0 ? (
          <EmptyState icon={Users2} title="No pods yet" description="You haven't joined a pod for any goal yet." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pods.map((pod, idx) => {
              const meta = CATEGORY_META[pod.goal_category];
              const accent = accents[meta?.accent ?? 'blue'];
              return (
                <motion.button
                  key={pod.id}
                  onClick={() => setActivePod(pod)}
                  className="text-left rounded-2xl border-2 bg-white p-5"
                  style={{ borderColor: colors.border }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.25 }}
                  whileHover={{ y: -4, borderColor: accent.color, boxShadow: `0 16px 32px ${accent.bg}90` }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: colors.textMain }}>
                      {pod.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: colors.textSecondary }} />
                  </div>
                  <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accent.bg, color: accent.color }}>
                    {meta?.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

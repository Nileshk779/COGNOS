import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Tag } from 'lucide-react';
import { accents, colors } from '@/lib/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { decodeHtmlEntities } from '@/lib/utils';
import type { MarketplaceItem } from '@/lib/types';
import EmptyState from '@/components/dashboard/EmptyState';
import { SkeletonBlock } from '@/components/dashboard/CardSkeleton';

function ItemCard({ item, idx }: { item: MarketplaceItem; idx: number }) {
  const claimed = item.status === 'claimed';
  return (
    <motion.div
      className="rounded-2xl border-2 bg-white overflow-hidden flex flex-col"
      style={{ borderColor: colors.border }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx, 8) * 0.05, duration: 0.25 }}
    >
      <div className="aspect-[4/3] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F8FAFC' }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8" style={{ color: colors.textSecondary, opacity: 0.4 }} />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          {item.category && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accents.indigo.bg, color: accents.indigo.color }}>
              <Tag className="w-2.5 h-2.5" />
              {item.category}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: claimed ? '#D1FAE5' : '#EFF6FF', color: claimed ? '#059669' : colors.primary }}
          >
            {claimed ? 'Claimed' : 'Assigned'}
          </span>
        </div>
        <h3 className="text-sm font-semibold leading-snug" style={{ color: colors.textMain }}>
          {decodeHtmlEntities(item.title)}
        </h3>
        {item.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.textSecondary }}>
            {decodeHtmlEntities(item.description)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Marketplace() {
  const { userId } = useApp();
  const [items, setItems] = useState<MarketplaceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<MarketplaceItem[]>(`/marketplace/${userId}`)
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load your stash'));
  }, [userId]);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display" style={{ color: colors.textMain }}>
            The Stash
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Items assigned to you
          </p>
        </div>
      </div>

      {items === null && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonBlock className="h-56" />
          <SkeletonBlock className="h-56" />
          <SkeletonBlock className="h-56" />
        </div>
      ) : error ? (
        <p className="text-xs text-center" style={{ color: '#DC2626' }}>
          {error}
        </p>
      ) : items && items.length === 0 ? (
        <EmptyState icon={Package} title="Nothing in your stash yet" description="Items assigned to you will show up here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items ?? []).map((item, idx) => (
            <ItemCard key={item.id} item={item} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

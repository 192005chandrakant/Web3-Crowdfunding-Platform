import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Trash2, Heart, AlertCircle, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiNotification } from '@/lib/api';
import toast from 'react-hot-toast';

type NotificationFilter = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', address],
    queryFn: () => api.listNotifications(address!),
    enabled: !!address,
  });

  const notifications = notificationsData?.notifications ?? [];

  // Filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.readAt;
    if (filter === 'read') return !!notification.readAt;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', address] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    }
  });

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.readAt);
    if (unread.length === 0) return;
    
    // Process all sequentially or parallel depending on backend capability
    // (Assuming backend doesn't have a mark-all endpoint, we'll map over them)
    try {
      await Promise.all(unread.map(n => api.markNotificationRead(n._id)));
      queryClient.invalidateQueries({ queryKey: ['notifications', address] });
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark all as read');
    }
  };

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your wallet to view notifications.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">Notifications</h1>
          <p className="text-slate-400 mt-1">Stay updated on your campaigns and donations</p>
        </div>
        {unreadCount > 0 && (
          <Button
            id="notifications-mark-all-read"
            variant="outline"
            leadingIcon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            id={`notifications-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white shadow-glow-primary'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-white/[0.06]'
            }`}
          >
            {f} {f === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <GlassCard key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-12 h-12" />}
          title={notifications.length === 0 ? "You're all caught up!" : "No notifications found"}
          description={
            notifications.length === 0
              ? "When you receive donations, votes, or campaign updates, they will appear here."
              : "No notifications match your current filter."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard
                className={`p-4 hover:border-white/[0.12] transition-all ${
                  !notification.readAt ? 'border-primary-500/30 bg-primary-500/5' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-full flex-shrink-0 self-start ${
                    !notification.readAt ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {notification.type.includes('donation') ? <Heart className="w-5 h-5" /> :
                     notification.type.includes('milestone') ? <Check className="w-5 h-5" /> :
                     <Bell className="w-5 h-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                      <h3 className={`text-base font-semibold ${!notification.readAt ? 'text-slate-100' : 'text-slate-300'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm ${!notification.readAt ? 'text-slate-300' : 'text-slate-500'}`}>
                      {notification.message}
                    </p>
                  </div>

                  {/* Action */}
                  {!notification.readAt && (
                    <div className="flex-shrink-0 flex self-center">
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-full transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

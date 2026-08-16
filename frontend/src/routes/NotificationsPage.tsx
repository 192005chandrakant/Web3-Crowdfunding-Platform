import React, { useState } from 'react';
import {
  Bell, Check, CheckCheck, Heart, AlertCircle, Clock, Zap, Wifi, Loader2, Radio
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useAccount } from 'wagmi';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useSendTestNotification
} from '@/hooks/useNotifications';
import toast from 'react-hot-toast';

type NotificationFilter = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const { data: notificationsData, isLoading, isLiveStreaming } = useNotifications(address);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead(address);
  const sendTestMutation = useSendTestNotification(address);

  const notifications = notificationsData?.notifications ?? [];

  // Filter list
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.readAt;
    if (filter === 'read') return !!notification.readAt;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id, {
      onError: () => toast.error('Failed to mark notification as read')
    });
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read!'),
      onError: () => toast.error('Failed to mark all as read')
    });
  };

  const handleSendTestNotification = () => {
    sendTestMutation.mutate(
      {
        title: '🎉 Observer Pattern Active!',
        message: 'This real-time test was delivered via backend Observer Engine + Server-Sent Events (SSE) stream with 0ms latency!'
      },
      {
        onSuccess: () => {
          toast.success('Test notification broadcasted via all Observer channels!');
        },
        onError: () => {
          toast.error('Failed to dispatch test notification');
        }
      }
    );
  };

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your Web3 wallet to view live notifications.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-slate-100">Notifications</h1>
            {isLiveStreaming ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                Live SSE Stream Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                <Wifi className="w-3 h-3 text-slate-500" />
                Polling Mode
              </span>
            )}
          </div>
          <p className="text-slate-400 mt-1">Stay updated on your campaigns, milestone votes, and donations in real-time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            id="notifications-test-trigger"
            variant="outline"
            className="border-primary-500/40 hover:bg-primary-500/10 text-primary-300"
            leadingIcon={
              sendTestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />
            }
            onClick={handleSendTestNotification}
            disabled={sendTestMutation.isPending}
          >
            {sendTestMutation.isPending ? "Broadcasting..." : "⚡ Test Live Notification"}
          </Button>

          {unreadCount > 0 && (
            <Button
              id="notifications-mark-all-read"
              variant="outline"
              leadingIcon={<CheckCheck className="w-4 h-4" />}
              onClick={handleMarkAllAsRead}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            id={`notifications-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-primary-600 text-white shadow-glow-primary border border-primary-500'
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
          title={notifications.length === 0 ? "Your inbox is completely clean!" : "No notifications found"}
          description={
            notifications.length === 0
              ? "When you receive contributions, quadratic votes, or milestone updates, they will stream directly here with zero delay."
              : "No notifications match your current filter selection."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification._id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.4) }}
            >
              <GlassCard
                className={`p-4 hover:border-white/[0.12] transition-all duration-200 ${
                  !notification.readAt ? 'border-primary-500/40 bg-primary-500/10 shadow-[0_4px_20px_rgba(14,165,233,0.1)]' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-full flex-shrink-0 self-start ${
                    !notification.readAt ? 'bg-primary-500/20 text-primary-400 shadow-glow-primary' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {notification.type.includes('donation') ? <Heart className="w-5 h-5 text-rose-400" /> :
                     notification.type.includes('milestone') || notification.type.includes('voting') ? <Check className="w-5 h-5 text-emerald-400" /> :
                     <Bell className="w-5 h-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-semibold ${!notification.readAt ? 'text-slate-100 font-bold' : 'text-slate-300'}`}>
                          {notification.title}
                        </h3>
                        {!notification.readAt && (
                          <span className="w-2 h-2 rounded-full bg-primary-400 inline-block animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {new Date(notification.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-sm ${!notification.readAt ? 'text-slate-300' : 'text-slate-400'} leading-relaxed`}>
                      {notification.message}
                    </p>
                  </div>

                  {/* Action */}
                  {!notification.readAt && (
                    <div className="flex-shrink-0 flex self-center">
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-2.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 rounded-full transition-colors"
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

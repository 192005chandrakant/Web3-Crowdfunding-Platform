/**
 * React Query hooks & Server-Sent Events (SSE) stream listener for real-time notifications.
 * Connects directly to backend Observer pattern RealtimeSSEObserver for zero-latency UI updates & toasts.
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiNotification } from "@/lib/api";
import toast from "react-hot-toast";

interface NotificationsResponse {
  success: boolean;
  notifications: ApiNotification[];
}

// ─── All notifications for a wallet with automatic live SSE stream connection ───
export function useNotifications(walletAddress: string | undefined) {
  const queryClient = useQueryClient();
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);

  const queryResult = useQuery<NotificationsResponse, Error>({
    queryKey: ["notifications", walletAddress],
    queryFn: () => {
      if (!walletAddress) throw new Error("No wallet address");
      return api.listNotifications(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 30_000,
    refetchInterval: isLiveStreaming ? 120_000 : 30_000, // Reduce polling when live streaming is established
    retry: false
  });

  // Manage Real-time Server-Sent Events (SSE) streaming connection
  useEffect(() => {
    if (!walletAddress || typeof window === "undefined") {
      setIsLiveStreaming(false);
      return;
    }

    const streamUrl = api.getNotificationStreamUrl(walletAddress);
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connectSSE() {
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("open", () => {
        setIsLiveStreaming(true);
        console.log(`[SSE] Real-time notification streaming active for wallet: ${walletAddress}`);
      });

      eventSource.addEventListener("connected", () => {
        setIsLiveStreaming(true);
      });

      eventSource.addEventListener("notification", (e: MessageEvent) => {
        try {
          const newNotification: ApiNotification = JSON.parse(e.data);
          
          // Instant React Query cache insertion without waiting for network poll
          queryClient.setQueryData<NotificationsResponse>(
            ["notifications", walletAddress],
            (oldData) => {
              const currentList = oldData?.notifications || [];
              // Prevent duplicates if already present
              if (currentList.some((n) => n._id === newNotification._id)) {
                return oldData;
              }
              return {
                success: true,
                notifications: [newNotification, ...currentList]
              };
            }
          );

          // Trigger interactive visual toast notification
          toast(
            `${newNotification.title}\n${newNotification.message}`,
            {
              icon: "🔔",
              duration: 6000,
              style: {
                borderRadius: "10px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #38bdf8",
                boxShadow: "0 4px 20px rgba(56, 189, 248, 0.25)"
              }
            }
          );
        } catch (err) {
          console.error("[SSE] Failed parsing live real-time notification:", err);
        }
      });

      eventSource.addEventListener("error", (e) => {
        setIsLiveStreaming(false);
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          // Attempt automatic reconnection after 5 seconds
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      });
    }

    connectSSE();

    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
      setIsLiveStreaming(false);
    };
  }, [walletAddress, queryClient]);

  return {
    ...queryResult,
    isLiveStreaming
  };
}

// ─── Unread count derived from reactive cached notifications list ───
export function useUnreadNotificationCount(walletAddress: string | undefined): number {
  const { data } = useNotifications(walletAddress);
  if (!data?.notifications) return 0;
  return data.notifications.filter((n: ApiNotification) => !n.readAt).length;
}

// ─── Mark single notification as read mutation ───
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: ["notifications"] },
        (oldData) => {
          if (!oldData?.notifications) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((n) =>
              n._id === id ? { ...n, readAt: new Date().toISOString() } : n
            )
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

// ─── Mark all notifications read for wallet mutation ───
export function useMarkAllNotificationsRead(walletAddress: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!walletAddress) throw new Error("No wallet connected");
      return api.markAllNotificationsRead(walletAddress);
    },
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications", walletAddress],
        (oldData) => {
          if (!oldData?.notifications) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((n) => ({
              ...n,
              readAt: n.readAt || new Date().toISOString()
            }))
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

// ─── Send real-time test notification across all Observers (Toast + InApp + Email) ───
export function useSendTestNotification(walletAddress: string | undefined) {
  return useMutation({
    mutationFn: (customPayload?: { title?: string; message?: string; type?: string; recipientEmail?: string }) => {
      if (!walletAddress) throw new Error("No wallet connected");
      return api.sendTestNotification({ walletAddress, ...customPayload });
    }
  });
}

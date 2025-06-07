import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'transaction' | 'system' | 'alert';
  isRead: boolean;
  metadata?: {
    transactionId?: string;
    action?: string;
    amount?: number;
    currency?: string;
  };
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    const socketInstance = io(`${process.env.NEXT_PUBLIC_API_URL}/${
      isAdmin ? 'admin-notifications' : 'user-notifications'
    }`, {
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to notification socket');
      if (isAdmin) {
        socketInstance.emit('join');
      } else {
        socketInstance.emit('join', user._id);
      }
    });

    socketInstance.on('new_notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    setSocket(socketInstance);

    // Fetch existing notifications
    fetchNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [user, isAdmin]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${
          isAdmin ? 'admin' : 'user'
        }`,
        {
          credentials: 'include',
        }
      );
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${
          isAdmin ? 'admin' : 'user'
        }/mark-read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ notificationIds }),
        }
      );

      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification._id)
            ? { ...notification, isRead: true }
            : notification
        )
      );

      if (socket) {
        socket.emit('mark_read', { notificationIds });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 
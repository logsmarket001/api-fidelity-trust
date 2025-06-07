import React from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return "💰";
      case "system":
        return "⚙️";
      case "alert":
        return "⚠️";
      default:
        return "📢";
    }
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Notifications</h3>
      </div>

      {notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No notifications</div>
      ) : (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 hover:bg-gray-50 ${
                !notification.isRead ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start">
                <span className="text-xl mr-3">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification._id)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;

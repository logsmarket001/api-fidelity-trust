import React, { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { BellIcon } from "@heroicons/react/24/outline";
import NotificationPanel from "./NotificationPanel";

const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isPanelOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <NotificationPanel onClose={() => setIsPanelOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

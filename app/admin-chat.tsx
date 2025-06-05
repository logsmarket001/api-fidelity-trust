"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Search,
  MoreVertical,
  MessageSquare,
  Loader2,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/auth";
import { chatAPI, usersAPI } from "@/lib/api";
import { TimeStamp } from "@/components/ui/time-stamp";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
  status?: string;
}

interface Message {
  _id: string;
  content: string;
  sender: "user" | "admin";
  timestamp: Date;
  isRead: boolean;
  userId: string;
}

export default function AdminChat() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: adminUser } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const NAME_SPACE = "/admin";
  const [userTyping, setUserTyping] = useState(false);

  useEffect(() => {
    console.log("[Admin Chat] Initializing component");
    fetchUsers();
    initializeSocket();
  }, []);

  const initializeSocket = () => {
    console.log("[Admin Chat] Initializing socket connection");
    const newSocket = io(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/admin`,
      {
        withCredentials: true,
        path: "/socket.io",
      }
    );

    newSocket.on("connect", () => {
      console.log("[Admin Chat] Socket connected successfully");
    });

    newSocket.on("connect_error", (error) => {
      console.error("[Admin Chat] Socket connection error:", error);
    });

    newSocket.on("user_status", ({ userId, status }) => {
      console.log("[Admin Chat] User status update:", { userId, status });
      setUsers((prev) =>
        prev.map((user) => (user._id === userId ? { ...user, status } : user))
      );
    });

    newSocket.on("new_message", (message: any) => {
      console.log("[Admin Chat] Received new message:", {
        messageId: message._id,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        isRead: message.isRead,
        userId: message.userId,
      });

      if (selectedUser?._id === message.userId) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }

      updateUserLastMessage(message);
    });

    newSocket.on("user_typing", ({ userId }) => {
      console.log("[Admin Chat] User typing:", userId);
      if (selectedUser?._id === userId) {
        setUserTyping(true);
        setTimeout(() => setUserTyping(false), 3000);
      }
    });

    newSocket.on("user_stopped_typing", ({ userId }) => {
      console.log("[Admin Chat] User stopped typing:", userId);
      if (selectedUser?._id === userId) {
        setUserTyping(false);
      }
    });

    setSocket(newSocket);

    return () => {
      console.log("[Admin Chat] Cleaning up socket connection");
      newSocket.disconnect();
    };
  };

  const updateUserLastMessage = (message: Message) => {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === message.userId
          ? {
              ...u,
              lastMessage: {
                content: message.content,
                timestamp: message.timestamp,
              },
              unreadCount:
                message.sender === "user"
                  ? (u.unreadCount || 0) + 1
                  : u.unreadCount,
            }
          : u
      )
    );
  };

  const fetchUsers = async () => {
    console.log("[Admin Chat] Fetching users list");
    try {
      setIsLoading(true);
      const response = await usersAPI.getAllUsers();
      console.log("[Admin Chat] Users API response:", response);

      if (response.success) {
        console.log("[Admin Chat] Processing users data");
        const usersWithChats = await Promise.all(
          response.data.map(async (user: User) => {
            try {
              console.log(
                `[Admin Chat] Fetching messages for user ${user._id}`
              );
              const chatResponse = await chatAPI.getUserMessagesByUserId(
                user._id
              );
              const messages = chatResponse.data || [];
              const unreadCount = messages.filter(
                (msg: Message) => msg.sender === "user" && !msg.isRead
              ).length;
              const lastMessage = messages[messages.length - 1];

              console.log(`[Admin Chat] User ${user._id} stats:`, {
                unreadCount,
                lastMessage: lastMessage
                  ? {
                      content: lastMessage.message,
                      timestamp: lastMessage.createdAt,
                    }
                  : null,
              });

              return {
                ...user,
                unreadCount,
                lastMessage: lastMessage
                  ? {
                      content: lastMessage.message,
                      timestamp: new Date(lastMessage.createdAt),
                    }
                  : undefined,
              };
            } catch (error) {
              console.error(
                `[Admin Chat] Error fetching messages for user ${user._id}:`,
                error
              );
              return user;
            }
          })
        );
        console.log(
          "[Admin Chat] Setting users with chat data:",
          usersWithChats
        );
        setUsers(usersWithChats);
      }
    } catch (error) {
      console.error("[Admin Chat] Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserMessages = async (userId: string) => {
    console.log(`[Admin Chat] Fetching messages for user ${userId}`);
    try {
      const response = await chatAPI.getUserMessagesByUserId(userId);
      console.log(
        `[Admin Chat] Messages API response for user ${userId}:`,
        response
      );

      if (response.success) {
        const transformedMessages = response.data.map((msg: any) => ({
          _id: msg._id,
          content: msg.message,
          sender: msg.isUser ? ("user" as const) : ("admin" as const),
          timestamp: new Date(msg.createdAt),
          isRead: msg.isRead || false,
          userId: msg.userId,
        }));
        console.log(
          `[Admin Chat] Setting messages for user ${userId}:`,
          transformedMessages
        );
        setMessages(transformedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error(
        `[Admin Chat] Error fetching messages for user ${userId}:`,
        error
      );
    }
  };

  const handleUserSelect = async (user: User) => {
    console.log(`[Admin Chat] User selected:`, user);
    setSelectedUser(user);
    await fetchUserMessages(user._id);

    if (user.unreadCount && user.unreadCount > 0) {
      console.log(`[Admin Chat] Marking messages as read for user ${user._id}`);
      try {
        await chatAPI.markAdminMessagesRead(user._id);
        console.log(
          `[Admin Chat] Messages marked as read for user ${user._id}`
        );
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, unreadCount: 0 } : u))
        );
      } catch (error) {
        console.error(
          `[Admin Chat] Error marking messages as read for user ${user._id}:`,
          error
        );
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Admin Chat] Sending message:", {
      content: message,
      userId: selectedUser?._id,
    });

    if (!message.trim() || !selectedUser || !socket) {
      console.log("[Admin Chat] Message validation failed:", {
        hasMessage: !!message.trim(),
        hasSelectedUser: !!selectedUser,
        hasSocket: !!socket,
      });
      return;
    }

    try {
      console.log("[Admin Chat] Sending message to API");
      const response = await chatAPI.sendAdminMessage(
        selectedUser._id,
        message
      );
      console.log("[Admin Chat] API response:", response);

      if (response.success) {
        console.log("[Admin Chat] Adding message to UI");
        setMessages((prev) => [
          ...prev,
          {
            _id: response.data._id,
            content: message,
            sender: "admin",
            timestamp: new Date(),
            isRead: false,
            userId: selectedUser._id,
          },
        ]);

        console.log("[Admin Chat] Updating user's last message");
        updateUserLastMessage({
          _id: response.data._id,
          content: message,
          sender: "admin",
          timestamp: new Date(),
          isRead: false,
          userId: selectedUser._id,
        });

        console.log("[Admin Chat] Emitting socket message");
        socket.emit("message", {
          userId: selectedUser._id,
          message: {
            _id: response.data._id,
            content: message,
            sender: "admin",
            timestamp: new Date(),
            isRead: false,
            userId: selectedUser._id,
          },
          isAdmin: true,
        });

        setMessage("");
        scrollToBottom();
      }
    } catch (error) {
      console.error("[Admin Chat] Error sending message:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    // Clear admin session
    localStorage.removeItem("adminToken");
    sessionStorage.removeItem("admin-role");

    toast({
      title: "Logged out successfully",
      description: "You have been logged out of the admin panel.",
    });

    router.push("/auth/admin-login");
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <Card className="h-full border-none shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-12 h-full">
              {/* Users List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`col-span-1 md:col-span-4 border-r flex flex-col ${
                  selectedUser ? "hidden md:flex" : "flex"
                }`}
              >
                <CardHeader className="border-b pb-4 bg-white z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Search className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredUsers.map((user) => (
                          <motion.div
                            key={user._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedUser?._id === user._id
                                ? "bg-emerald-50 shadow-sm"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => handleUserSelect(user)}
                          >
                            <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-emerald-100">
                              <AvatarFallback className="bg-emerald-100 text-emerald-600">
                                {user.firstName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                {user.lastMessage && (
                                  <span className="text-xs text-gray-500">
                                    <TimeStamp
                                      timestamp={user.lastMessage.timestamp}
                                    />
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {user.lastMessage?.content || "No messages yet"}
                              </p>
                            </div>
                            {user.unreadCount && user.unreadCount > 0 && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-5 w-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center shadow-sm"
                              >
                                {user.unreadCount}
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </motion.div>

              {/* Chat Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="col-span-1 md:col-span-8 flex flex-col"
              >
                {selectedUser ? (
                  <>
                    <CardHeader className="border-b pb-4 bg-white z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-emerald-100">
                            <AvatarFallback className="bg-emerald-100 text-emerald-600">
                              {selectedUser.firstName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {selectedUser.firstName} {selectedUser.lastName}
                            </CardTitle>
                            <p className="text-sm text-gray-500">
                              {selectedUser.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setSelectedUser(null)}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleLogout}
                          >
                            <LogOut className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                          {messages.map((msg, index) => (
                            <motion.div
                              key={msg._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.1 }}
                              className={`flex ${
                                msg.sender === "admin"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`flex items-end space-x-2 max-w-[80%] ${
                                  msg.sender === "admin"
                                    ? "flex-row-reverse space-x-reverse"
                                    : ""
                                }`}
                              >
                                {msg.sender === "user" && (
                                  <Avatar className="h-8 w-8 ring-2 ring-offset-2 ring-emerald-100">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-600">
                                      {selectedUser.firstName
                                        .charAt(0)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <motion.div
                                  initial={{ scale: 0.95 }}
                                  animate={{ scale: 1 }}
                                  className={`rounded-lg px-4 py-2 shadow-sm ${
                                    msg.sender === "admin"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <TimeStamp timestamp={msg.timestamp} />
                                    {msg.sender === "admin" && (
                                      <span className="text-xs opacity-70">
                                        {msg.isRead ? "Read" : "Delivered"}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="p-4 border-t bg-white">
                      <form
                        onSubmit={handleSendMessage}
                        className="flex space-x-2"
                      >
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          className="bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Select a user to start chatting
                      </h3>
                      <p className="text-gray-500 mt-2">
                        Choose from the list of users on the left
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}

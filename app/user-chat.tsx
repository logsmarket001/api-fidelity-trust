"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Smile } from "lucide-react";
import { TimeStamp } from "@/components/ui/time-stamp";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/auth";
import { chatAPI } from "@/lib/api/chat";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  content: string;
  sender: "user" | "admin";
  timestamp: Date;
  isRead: boolean;
}

function ChatSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b pb-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${
                    i % 2 === 0 ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`flex items-end space-x-2 max-w-[80%] ${
                      i % 2 === 0 ? "" : "flex-row-reverse space-x-reverse"
                    }`}
                  >
                    {i % 2 === 0 && (
                      <Skeleton className="h-8 w-8 rounded-full" />
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        i % 2 === 0 ? "bg-gray-100" : "bg-emerald-500"
                      }`}
                    >
                      <Skeleton
                        className={`h-4 w-48 ${
                          i % 2 === 0 ? "bg-gray-200" : "bg-emerald-400"
                        }`}
                      />
                      <Skeleton
                        className={`h-3 w-24 mt-1 ${
                          i % 2 === 0 ? "bg-gray-200" : "bg-emerald-400"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated, initialized } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const NAME_SPACE = "/user";
  useEffect(() => {
    console.log("[User Chat] Checking initialization state:", {
      initialized,
      isAuthenticated,
      user: user?._id,
    });

    if (!initialized) {
      console.log("[User Chat] Not initialized yet");
      return;
    }

    if (!isAuthenticated) {
      console.log("[User Chat] Not authenticated, redirecting to login");
      router.push("/auth/login");
      return;
    }

    console.log("[User Chat] Initializing socket connection");
    const newSocket = io(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/user`,
      {
        withCredentials: true,
        path: "/socket.io",
      }
    );

    newSocket.on("connect", () => {
      console.log("[User Chat] Socket connected successfully");
      if (user?._id) {
        console.log("[User Chat] Joining user room:", user._id);
        newSocket.emit("join", user._id);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("[User Chat] Socket connection error:", error);
    });

    console.log("[User Chat] Fetching previous messages");
    fetchMessages();

    newSocket.on("new_message", (message: any) => {
      console.log("[User Chat] Received new message:", {
        messageId: message._id,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        isRead: message.isRead,
      });

      console.log(
        "[User Chat] Refetching messages after receiving new message"
      );
      fetchMessages();
    });

    newSocket.on("admin_typing", () => {
      console.log("[User Chat] Admin is typing");
      setAdminTyping(true);
      setTimeout(() => {
        console.log("[User Chat] Admin typing timeout");
        setAdminTyping(false);
      }, 3000);
    });

    newSocket.on("admin_stopped_typing", () => {
      console.log("[User Chat] Admin stopped typing");
      setAdminTyping(false);
    });

    newSocket.on("admin_read_messages", ({ messageIds }) => {
      console.log("[User Chat] Messages marked as read:", messageIds);
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      );
      setUnreadCount(0);
    });

    setSocket(newSocket);

    return () => {
      console.log("[User Chat] Cleaning up socket connection");
      newSocket.disconnect();
    };
  }, [user?._id, isAuthenticated, initialized, router]);

  const fetchMessages = async () => {
    console.log("[User Chat] Fetching messages from API");
    try {
      const response = await chatAPI.getUserMessages();
      console.log("[User Chat] API response:", response);

      if (response.success) {
        const transformedMessages = response.data.map((msg: any) => {
          const transformed = {
            id: msg._id,
            content: msg.message,
            sender: msg.isUser ? "user" : "admin",
            timestamp: new Date(msg.createdAt),
            isRead: msg.isRead || false,
          };
          console.log("[User Chat] Transformed message:", {
            original: msg,
            transformed: transformed,
          });
          return transformed;
        });

        console.log("[User Chat] Setting messages:", transformedMessages);
        setMessages(transformedMessages);

        const unread = transformedMessages.filter(
          (msg) => msg.sender === "admin" && !msg.isRead
        ).length;
        console.log("[User Chat] Unread messages count:", unread);
        setUnreadCount(unread);

        scrollToBottom();
      }
    } catch (error) {
      console.error("[User Chat] Error fetching messages:", error);
      console.log("[User Chat] Setting default welcome message");
      setMessages([
        {
          id: "welcome",
          content:
            "Welcome to Fidelity Trust support! How can we help you today?",
          sender: "admin",
          timestamp: new Date(),
          isRead: true,
        },
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = () => {
    if (!socket || !user?._id) {
      console.log("[User Chat] Cannot send typing status:", {
        hasSocket: !!socket,
        hasUserId: !!user?._id,
      });
      return;
    }

    console.log("[User Chat] Sending typing status");
    setIsTyping(true);
    socket.emit("typing", { userId: user._id, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log("[User Chat] Sending stopped typing status");
      setIsTyping(false);
      socket.emit("typing", { userId: user._id, isTyping: false });
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[User Chat] Sending message:", {
      content: message,
      userId: user?._id,
      socket: !!socket,
    });

    if (!message.trim() || !user?._id || !socket) {
      console.log("[User Chat] Message validation failed:", {
        hasMessage: !!message.trim(),
        hasUserId: !!user?._id,
        hasSocket: !!socket,
      });
      return;
    }

    const tempMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: "user",
      timestamp: new Date(),
      isRead: false,
    };

    try {
      console.log("[User Chat] Adding temporary message to UI:", tempMessage);
      setMessages((prev) => [...prev, tempMessage]);
      setMessage("");
      scrollToBottom();

      console.log("[User Chat] Emitting socket message");
      socket.emit("message", {
        userId: user._id,
        message: {
          _id: tempMessage.id,
          content: message,
          sender: "user",
          timestamp: new Date(),
          isRead: false,
          userId: user._id,
        },
        isAdmin: false,
      });

      console.log("[User Chat] Sending message to API");
      const response = await chatAPI.sendMessage(message);
      console.log("[User Chat] API response:", response);

      if (response.success) {
        console.log(
          "[User Chat] Updating message with server response:",
          response.data
        );
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === tempMessage.id
              ? {
                  id: response.data._id,
                  content: message,
                  sender: "user" as const,
                  timestamp: new Date(),
                  isRead: false,
                }
              : msg
          );
          console.log(
            "[User Chat] Final messages after API update:",
            updatedMessages
          );
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error("[User Chat] Error sending message:", error);
      console.log("[User Chat] Removing temporary message due to error");
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  };

  if (!initialized) {
    return (
      <DashboardLayout>
        <ChatSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Live Chat Support
            </h1>
            <p className="text-gray-500 mt-2">
              Chat with our support team in real-time
            </p>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader className="border-b pb-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/admin-avatar.png" alt="Admin" />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-xl">Support Team</CardTitle>
                    {unreadCount > 0 && (
                      <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {adminTyping
                      ? "Typing..."
                      : "Online • Typically replies instantly"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-6">
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex w-full ${
                          msg.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <motion.div
                          initial={{ x: msg.sender === "user" ? 20 : -20 }}
                          animate={{ x: 0 }}
                          className={`flex items-end space-x-2 max-w-[80%] ${
                            msg.sender === "user"
                              ? "flex-row-reverse space-x-reverse"
                              : ""
                          }`}
                        >
                          {msg.sender === "admin" && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src="/admin-avatar.png"
                                alt="Admin"
                              />
                              <AvatarFallback>AT</AvatarFallback>
                            </Avatar>
                          )}
                          <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className={`rounded-lg px-4 py-2 ${
                              msg.sender === "user"
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <TimeStamp timestamp={msg.timestamp} />
                              {msg.sender === "user" && (
                                <span className="text-xs opacity-70">
                                  {msg.isRead ? "Read" : "Delivered"}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

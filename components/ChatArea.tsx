"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

interface ChatAreaProps {
  currentUser: Doc<"users">;
  conversationId: Id<"conversations"> | null;
  onBack: () => void;
}

export default function ChatArea({
  currentUser,
  conversationId,
  onBack,
}: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messages = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    conversationId
      ? { conversationId, currentUserId: currentUser._id }
      : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const markAsRead = useMutation(api.readReceipts.markAsRead);

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversationId) {
      markAsRead({ conversationId, userId: currentUser._id });
    }
  }, [conversationId, messages]);

  // Auto scroll
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowNewMessage(false);
    } else if (messages && messages.length > 0) {
      setShowNewMessage(true);
    }
  }, [messages]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) setShowNewMessage(false);
  };

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;
    await sendMessage({
      conversationId,
      senderId: currentUser._id,
      content: message.trim(),
    });
    setMessage("");
    setIsAtBottom(true);
  };

  const handleTyping = () => {
    if (!conversationId) return;
    setTyping({ conversationId, userId: currentUser._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isThisYear) {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        ", " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      return (
        date.toLocaleDateString([], {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) +
        ", " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-4xl mb-4">👋</p>
          <p className="text-xl font-medium">Welcome to Tars Chat</p>
          <p className="text-sm mt-2">
            Select a conversation or search for a user to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="md:hidden text-gray-500 hover:text-gray-700 mr-1"
        >
          ← Back
        </button>
        <p className="font-semibold text-gray-800">Chat</p>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {messages?.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-2xl mb-2">🤝</p>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isMe = msg.senderId === currentUser._id;
          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className="group relative max-w-xs md:max-w-md">
                {msg.isDeleted ? (
                  <p className="italic text-gray-400 text-sm px-4 py-2 bg-gray-100 rounded-2xl">
                    This message was deleted
                  </p>
                ) : (
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm ${
                      isMe
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <p
                  className={`text-xs text-gray-400 mt-1 ${
                    isMe ? "text-right" : "text-left"
                  }`}
                >
                  {formatTimestamp(msg._creationTime)}
                </p>
                {isMe && !msg.isDeleted && (
                  <button
                    onClick={() => deleteMessage({ messageId: msg._id })}
                    className="absolute -top-2 -left-6 hidden group-hover:block text-gray-400 hover:text-red-500 text-xs"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-500">
                  {typingUsers[0]?.name} is typing
                </span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* New Message Button */}
      {showNewMessage && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowNewMessage(false);
              setIsAtBottom(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm shadow-lg hover:bg-blue-600"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
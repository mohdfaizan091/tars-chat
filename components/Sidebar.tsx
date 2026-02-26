"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";

interface SidebarProps {
  currentUser: Doc<"users">;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export default function Sidebar({
  currentUser,
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const { signOut } = useClerk();
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  const conversations = useQuery(api.conversations.getUserConversations, {
    userId: currentUser._id,
  });

  const allUsers = useQuery(api.users.getAllUsers, {
    currentClerkId: currentUser.clerkId,
  });

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation
  );

  const filteredUsers = allUsers?.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUserClick = async (otherUserId: Id<"users">) => {
    const convId = await getOrCreateConversation({
      currentUserId: currentUser._id,
      otherUserId,
    });
    onSelectConversation(convId);
    setShowUsers(false);
    setSearch("");
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col w-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img
              src={currentUser.imageUrl || "/default-avatar.png"}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full"
            />
            <span className="font-semibold text-gray-800">
              {currentUser.name}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowUsers(true);
            }}
            onFocus={() => setShowUsers(true)}
            // ✅ Added text-gray-900 for better contrast
            className="flex-1 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            +
          </button>
        </div>
      </div>

      {/* Users List */}
      {showUsers && (
        <div className="border-b border-gray-200 max-h-48 overflow-y-auto">
          {filteredUsers?.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">
              No users found
            </p>
          ) : (
            filteredUsers?.map((u) => (
              <div
                key={u._id}
                onClick={() => handleUserClick(u._id)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={u.imageUrl || "/default-avatar.png"}
                    alt={u.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      u.isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {u.name}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations?.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Search for a user to start chatting</p>
          </div>
        ) : (
          conversations?.map((conv) => (
            <ConversationItem
              key={conv._id}
              conv={conv}
              currentUser={currentUser}
              isSelected={selectedConversationId === conv._id}
              onClick={() => onSelectConversation(conv._id)}
              formatTime={formatTime}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conv,
  currentUser,
  isSelected,
  onClick,
  formatTime,
}: {
  conv: any;
  currentUser: Doc<"users">;
  isSelected: boolean;
  onClick: () => void;
  formatTime: (t: number) => string;
}) {
  const unreadCount = useQuery(api.readReceipts.getUnreadCount, {
    conversationId: conv._id,
    userId: currentUser._id,
  });

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
        isSelected ? "bg-blue-50" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={conv.otherUser?.imageUrl || "/default-avatar.png"}
          alt={conv.otherUser?.name}
          className="w-10 h-10 rounded-full"
        />
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            conv.otherUser?.isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-800 truncate">
            {conv.otherUser?.name}
          </span>
          {conv.lastMessage && (
            <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
              {formatTime(conv.lastMessage._creationTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 truncate">
            {conv.lastMessage
              ? conv.lastMessage.isDeleted
                ? "This message was deleted"
                : conv.lastMessage.content
              : "No messages yet"}
          </p>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="ml-1 flex-shrink-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
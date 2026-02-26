"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  const { user } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (user) {
      upsertUser({
        clerkId: user.id,
        name: user.fullName || user.username || "Unknown",
        email: user.emailAddresses[0]?.emailAddress || "",
        imageUrl: user.imageUrl,
      });
    }
  }, [user, upsertUser]);

  useEffect(() => {
    if (!user) return;
    setOnlineStatus({ clerkId: user.id, isOnline: true });
    const handleOffline = () =>
      setOnlineStatus({ clerkId: user.id, isOnline: false });
    window.addEventListener("beforeunload", handleOffline);
    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user, setOnlineStatus]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex w-full md:w-80 flex-shrink-0`}
      >
        <Sidebar
          currentUser={currentUser}
          selectedConversationId={selectedConversationId}
          onSelectConversation={(id) => {
            setSelectedConversationId(id);
            setShowSidebar(false);
          }}
        />
      </div>
      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } md:flex flex-1`}
      >
        <ChatArea
          currentUser={currentUser}
          conversationId={selectedConversationId}
          onBack={() => setShowSidebar(true)}
        />
      </div>
    </div>
  );
}
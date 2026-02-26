import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();

    const existing = allConversations.find((conv) => {
      const participants = conv.participants;
      return (
        participants.includes(args.currentUserId) &&
        participants.includes(args.otherUserId) &&
        participants.length === 2
      );
    });

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participants: [args.currentUserId, args.otherUserId],
      lastMessageTime: Date.now(),
    });
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();

    const userConversations = allConversations.filter((conv) =>
      conv.participants.includes(args.userId)
    );

    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        const otherUserId = conv.participants.find(
          (p) => p !== args.userId
        );
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        const lastMessage = messages[messages.length - 1];

        return {
          ...conv,
          otherUser,
          lastMessage: lastMessage || null,
        };
      })
    );

    return conversationsWithDetails.sort(
      (a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0)
    );
  },
});
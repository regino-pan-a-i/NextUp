import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function ChatWindow({ messages, currentUserId }: { messages: any[]; currentUserId?: string }) {
  // messages expected in chronological order (old -> new)
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isMe = currentUserId && m.senderId === currentUserId;
        const ts = m.createdAt ? format(new Date(m.createdAt), "PP p") : "";
        return (
          <div key={m.id} className={`flex items-start gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
            {!isMe && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>{(m.sender?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}

            <div className={`max-w-[70%] px-3 py-2 rounded-lg ${isMe ? "bg-primary text-primary-foreground ml-auto" : "bg-muted/10"}`}>
              <div className="text-sm font-medium mb-1">{m.sender?.username || (isMe ? "You" : "Unknown")}</div>
              <div className="text-sm">{m.content}</div>
              <div className="text-xs text-muted-foreground mt-1">{ts}</div>
            </div>

            {isMe && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>{(m.sender?.username || "You").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
    </div>
  );
}

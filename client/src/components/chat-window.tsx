import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

type SenderMap = Record<string, { username?: string; photoUrl?: string }>;

export default function ChatWindow({ messages, currentUserId }: { messages: any[]; currentUserId?: string }) {
  // messages expected in chronological order (old -> new)
  const [senders, setSenders] = useState<SenderMap>({});

  useEffect(() => {
    // collect unique senderIds which we don't already have username for
    const ids = Array.from(new Set(messages.map((m: any) => m?.senderId).filter(Boolean)));
    const missing = ids.filter((id) => id && !senders[id]);
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(`/api/users/${id}`, { credentials: "include" });
              if (!res.ok) return { id, username: undefined, photoUrl: undefined };
              const u = await res.json();
              return { id, username: u.username, photoUrl: u.photoUrl };
            } catch (err) {
              return { id, username: undefined, photoUrl: undefined };
            }
          })
        );

        if (cancelled) return;

        setSenders((prev) => {
          const next = { ...prev };
          for (const r of results) {
            next[r.id] = { username: r.username, photoUrl: r.photoUrl };
          }
          return next;
        });
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isMe = currentUserId && m.senderId === currentUserId;
        const ts = m.createdAt ? format(new Date(m.createdAt), "PP p") : "";
        const username = m.sender?.username || (m.senderId ? senders[m.senderId]?.username : undefined);
        const photoUrl = m.sender?.photoUrl || (m.senderId ? senders[m.senderId]?.photoUrl : undefined);
        const initials = (username || (isMe ? "You" : "?")).slice(0, 2).toUpperCase();

        return (
          <div key={m.id} className={`flex items-start gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
            {!isMe && (
              <Avatar className="h-8 w-8">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={username || "avatar"} className="object-cover w-full h-full rounded-full" />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
            )}

            <div className={`max-w-[70%] px-3 py-2 rounded-lg ${isMe ? "bg-primary text-primary-foreground ml-auto" : "bg-muted/10"}`}>
              <div className="text-sm font-medium mb-1">{username || (isMe ? "You" : "Unknown")}</div>
              <div className="text-sm">{m.content}</div>
              <div className={`text-xs mt-1 ${isMe ? "text-secondary-foreground" : "text-muted-foreground"}`}>{ts}</div>
            </div>

            {isMe && (
              <Avatar className="h-8 w-8">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={username || "avatar"} className="object-cover w-full h-full rounded-full" />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
            )}
          </div>
        );
      })}
    </div>
  );
}

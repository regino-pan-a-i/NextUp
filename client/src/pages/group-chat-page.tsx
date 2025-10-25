import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ChatWindow from "@/components/chat-window";
import ChatInput from "@/components/chat-input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function GroupChatPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/groups", id, "messages"],
    queryFn: async () => {
      const resp = await fetch(`/api/groups/${id}/messages`, { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to fetch messages");
      return resp.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "subscribe", groupId: id }));
    });

    ws.addEventListener("message", (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload && payload.type === "message") {
          // append to query cache (messages are returned most-recent-first from server; we want chronological on UI)
          queryClient.setQueryData(["/api/groups", id, "messages"], (old: any) => {
            const arr = Array.isArray(old) ? old.slice() : [];
            const msg = payload.message;
            // avoid duplicates by id
            if (!arr.find((m: any) => m.id === msg.id)) {
              arr.unshift(msg);
            }
            return arr;
          });
        }
      } catch (err) {
        // ignore
      }
    });

    return () => {
      try {
        ws.send(JSON.stringify({ type: "unsubscribe", groupId: id }));
      } catch (e) {}
      ws.close();
      wsRef.current = null;
    };
  }, [id]);

  const postMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/groups/${id}/messages`, { content });
      return res.json();
    },
    onSuccess: (msg: any) => {
      // add to cache if not already present (WS broadcast may also add it)
      queryClient.setQueryData(["/api/groups", id, "messages"], (old: any) => {
        const arr = Array.isArray(old) ? old.slice() : [];
        if (!arr.find((m: any) => m.id === msg.id)) {
          arr.unshift(msg);
        }
        return arr;
      });
    },
  });

  const handleSend = async (text: string) => {
    await postMessage.mutateAsync(text);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // messages from backend are ordered most-recent-first; reverse for chronological display
  const chronological = Array.isArray(messages) ? [...messages].reverse() : [];

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/groups/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Group Chat</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto flex flex-col gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <ChatWindow messages={chronological} currentUserId={user?.id} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <ChatInput onSend={handleSend} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

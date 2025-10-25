import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ArrowLeft, X, Loader2, UserPlus, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Group, GroupMember } from "@shared/schema";

export default function GroupDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddFriends, setShowAddFriends] = useState(false);

  const { data: group, isLoading: loadingGroup } = useQuery<Group>({
    queryKey: ["/api/groups", id],
    queryFn: async () => {
      const resp = await fetch(`/api/groups/${id}`);
      if (!resp.ok) throw new Error("Failed to fetch group");
      return resp.json();
    },
    enabled: !!id,
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery<(GroupMember & { user?: any })[]>({
    queryKey: ["/api/groups", id, "members"],
    queryFn: async () => {
      const resp = await fetch(`/api/groups/${id}/members`);
      if (!resp.ok) throw new Error("Failed to fetch members");
      return resp.json();
    },
    enabled: !!id,
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: showAddFriends,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (memberId?: string) => {
      const resp = await apiRequest("POST", `/api/groups/${id}/members`, { memberId });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Success", description: "Member added" });
      setShowAddFriends(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId?: string) => {
      // memberId may be undefined for anonymous members; API expects a path param for memberId
      const resp = await apiRequest("DELETE", `/api/groups/${id}/members/${memberId}`);
      return resp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Success", description: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isOwner = !!group && !!user && group.ownerId === user.id;

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  if (loadingGroup || loadingMembers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/adventures")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1" style={{ fontFamily: "var(--font-heading)" }}>
            {group.name}
          </h1>
          {isOwner && (
            <Button onClick={() => setShowAddFriends((s) => !s)}>
              <UserPlus className="h-4 w-4 mr-2" /> Add
            </Button>
          )}
          <Button onClick={() => setLocation(`/groups/${id}/chat`)}>
            <MessageSquare className="h-4 w-4 mr-2" /> Chat
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* <Avatar className="h-12 w-12">
                <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
              </Avatar> */}
              <div>
                <h2 className="font-semibold text-lg">{group.name}</h2>
                <p className="text-sm text-muted-foreground">{isOwner ? "You are the owner" : `Owner: ${group.ownerId}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Members</h3>
            </div>

            {showAddFriends && isOwner && (
              <div className="mb-4">
                {loadingFriends ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No friends to add</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {friends.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(f.username)}</AvatarFallback></Avatar>
                          <div className="min-w-0"><p className="font-medium truncate">{f.username}</p></div>
                        </div>
                        <Button size="sm" onClick={() => addMemberMutation.mutate(f.id)}>Add</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No members yet</div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {m.user?.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.user.photoUrl} alt={m.user.username} className="object-cover w-full h-full rounded-full" />
                        ) : (
                          <AvatarFallback>{m.user ? getInitials(m.user.username) : "?"}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.user ? m.user.username : "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">{m.role ?? "Member"}</p>
                      </div>
                    </div>
                    <div>
                      {(isOwner || (user && m.memberId === user.id)) && (
                        <Button size="icon" variant="outline" onClick={() => removeMemberMutation.mutate(m.memberId ?? "")}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

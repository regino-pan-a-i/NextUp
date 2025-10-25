import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CreateGroupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showFriendsList, setShowFriendsList] = useState(false);

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
  });

  const toggleFriend = (friendId: string) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(friendId)) newSet.delete(friendId);
    else newSet.add(friendId);
    setSelectedFriends(newSet);
  };

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const resp = await apiRequest("POST", "/api/groups", { name });
      return resp.json();
    },
    onSuccess: async (group: any) => {
      // add members
      if (selectedFriends.size > 0) {
        const promises = Array.from(selectedFriends).map((id) =>
          apiRequest("POST", `/api/groups/${group.id}/members`, { memberId: id })
        );

        try {
          await Promise.all(promises);
        } catch (err) {
          // ignore individual failures for now
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Success", description: "Group created" });
      setLocation("/friends");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = (fd.get("name") as string) || "";
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    await createMutation.mutateAsync(name.trim());
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/adventures")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Create Group
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input id="name" name="name" placeholder="e.g., Hiking Buddies" className="h-12" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Label className="block mb-3">Add People</Label>
              {selectedFriends.size > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {friends.filter((f: any) => selectedFriends.has(f.id)).map((friend: any) => (
                      <div key={friend.id} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        <Avatar className="h-6 w-6">
                          {friend.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.photoUrl} alt={friend.username} className="object-cover w-full h-full rounded-full" />
                          ) : (
                            <AvatarFallback className="text-xs">{getInitials(friend.username)}</AvatarFallback>
                          )}
                        </Avatar>
                        <span>{friend.username}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => toggleFriend(friend.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showFriendsList ? (
                <Button type="button" variant="outline" onClick={() => setShowFriendsList(true)} className="w-full h-12">
                  <Users className="h-4 w-4 mr-2" />
                  {selectedFriends.size > 0 ? `Selected ${selectedFriends.size} - Add more` : "Select friends to invite"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select friends to invite:</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowFriendsList(false)}>Done</Button>
                  </div>

                  {loadingFriends ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground"><p className="text-sm">No friends found</p></div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {friends.map((friend: any) => {
                          const isSelected = selectedFriends.has(friend.id);
                          return (
                            <div key={friend.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-primary/10 border-primary border" : "bg-muted/50 hover:bg-muted border border-transparent"}`} onClick={() => toggleFriend(friend.id)}>
                              <Avatar className="h-8 w-8">
                                {friend.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={friend.photoUrl} alt={friend.username} className="object-cover w-full h-full rounded-full" />
                                ) : (
                                  <AvatarFallback className="text-sm">{getInitials(friend.username)}</AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1 min-w-0"><p className="font-medium truncate">{friend.username}</p></div>
                              {isSelected && (<div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-primary-foreground"/></div>)}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setLocation("/adventures")}>Cancel</Button>
            <Button type="submit" className="flex-1 h-12" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Group"}</Button>
          </div>
        </form>
      </main>
    </div>
  );
}

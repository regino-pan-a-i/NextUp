import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, UserPlus, Check, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Group } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function FriendsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery<any[]>({
    queryKey: ["/api/friends/pending"],
  });

  const { data: searchResults = [], isLoading: searching } = useQuery<any[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search");
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await apiRequest("POST", "/api/friends/request", { friendId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Success",
        description: "Friend request sent!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/friends/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({
        title: "Success",
        description: "Request updated!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          Friends
        </h1>

      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="friends" data-testid="tab-my-friends">My Friends</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending
              {pendingRequests.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-find-friends">Find Friends</TabsTrigger>
            <TabsTrigger value="groups" data-testid="tab-groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-0">
            {loadingFriends ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Friends Yet"
                description="Search for friends to connect with and start sharing experiences together."
              />
            ) : (
              <div className="space-y-2">
                {friends.map((friend: any) => (
                  <Card key={friend.id} className="hover-elevate">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {friend.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={friend.photoUrl} alt={friend.username} className="object-cover w-full h-full rounded-full" />
                        ) : (
                          <AvatarFallback>{getInitials(friend.username)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{friend.username}</p>
                        <p className="text-sm text-muted-foreground">Friends</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            {loadingPending ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request: any) => (
                  <Card key={request.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {request.user.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={request.user.photoUrl} alt={request.user.username} className="object-cover w-full h-full rounded-full" />
                        ) : (
                          <AvatarFallback>{getInitials(request.user.username)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{request.user.username}</p>
                        <p className="text-sm text-muted-foreground">Wants to connect</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => respondToRequestMutation.mutate({ id: request.id, status: "Accepted" })}
                          disabled={respondToRequestMutation.isPending}
                          data-testid={`button-accept-${request.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => respondToRequestMutation.mutate({ id: request.id, status: "Declined" })}
                          disabled={respondToRequestMutation.isPending}
                          data-testid={`button-decline-${request.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            {/* Search bar */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
                data-testid="input-search-friends"
              />
            </div>
            {searchQuery.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Search for friends by username</p>
              </div>
            ) : searching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user: any) => (
                  <Card key={user.id} className="hover-elevate">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {user.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.photoUrl} alt={user.username} className="object-cover w-full h-full rounded-full" />
                        ) : (
                          <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.username}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={sendRequestMutation.isPending}
                        data-testid={`button-add-friend-${user.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            {loadingGroups ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Groups"
                description="Create or join groups to coordinate adventures with friends."
                actionLabel="Create Group"
                onAction={() => setLocation("/groups/create")}
              />
            ) : (
              <div className="space-y-4">
                {groups.map((group: any) => (
                  <Card
                    key={group.id}
                    className="hover-elevate cursor-pointer"
                    data-testid={`card-group-${group.id}`}
                    onClick={() => setLocation(`/groups/${group.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{group.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{group.ownerId === undefined ? "" : "Group"}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">Members</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Compass, Calendar, Users, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const stats = [
    { label: "Experiences", value: 0, icon: Compass },
    { label: "Adventures", value: 0, icon: Calendar },
    { label: "Friends", value: 0, icon: Users },
  ];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resp = await apiRequest("POST", "/api/objects/upload");
      const body = await resp.json();
      const uploadURL: string = body.uploadURL;
      const objectPath: string = body.objectPath;

      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!putResp.ok) throw new Error("Upload failed");

  // Persist on user record and update the local auth cache so we don't reload
  const updateResp = await apiRequest("PUT", "/api/user/photo", { photoUrl: objectPath });
  const updatedUser = await updateResp.json();
  queryClient.setQueryData(["/api/user"], updatedUser);
    } catch (err: any) {
      console.error("Profile upload error:", err);
      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 py-6">
          <div className="flex flex-col items-center gap-4">
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
            <Avatar className="h-24 w-24">
              {user?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoUrl} alt="profile" className="object-cover w-full h-full rounded-full" />
              ) : (
                <AvatarFallback className="text-2xl">
                  {user?.username && getInitials(user.username)}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            data-testid="input-profile-photo"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {user?.username}
            </h1>
            <p className="text-sm text-muted-foreground">NextUp Member</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-4">
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">Account Settings</span>
            <span className="text-muted-foreground">→</span>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">Privacy</span>
            <span className="text-muted-foreground">→</span>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">Notifications</span>
            <span className="text-muted-foreground">→</span>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full h-12"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}

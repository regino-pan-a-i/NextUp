import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Compass, Calendar, Users, LogOut } from "lucide-react";

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

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl">
              {user?.username && getInitials(user.username)}
            </AvatarFallback>
          </Avatar>
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

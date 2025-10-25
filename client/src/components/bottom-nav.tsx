import { Home, Compass, Calendar, Users, User } from "lucide-react";
import { useLocation, Link } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/experiences", icon: Compass, label: "Experiences" },
    { path: "/adventures", icon: Calendar, label: "Adventures" },
    { path: "/friends", icon: Users, label: "Friends" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              data-testid={`nav-${item.label.toLowerCase()}`}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg hover-elevate active-elevate-2 min-w-[60px]"
            >
              <Icon 
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className={`text-xs font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

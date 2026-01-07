import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, Activity, BarChart3, History, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from './NotificationBell';
import { useIncidents } from '@/hooks/useIncidents';
import { cn } from '@/lib/utils';

export function DashboardHeader() {
  const { user, role, signOut } = useAuth();
  const { incidents } = useIncidents();
  const location = useLocation();

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Activity },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/history', label: 'History', icon: History },
    ...(role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center glow-primary">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AegisICS</h1>
              <p className="text-xs text-muted-foreground">Incident Command System</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant={location.pathname === item.path ? 'secondary' : 'ghost'} 
                  size="sm"
                  className={cn(
                    "gap-2",
                    location.pathname === item.path && "bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <NotificationBell incidents={incidents} />
          
          <Badge variant="secondary" className="hidden sm:flex">
            {role === 'admin' ? 'Administrator' : 'Operator'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.email ? getInitials(user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {role || 'Operator'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
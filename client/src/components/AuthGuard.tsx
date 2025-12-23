import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <h1 className="text-2xl font-bold mb-4">Welcome to Turf Bros Dashboard</h1>
          <p className="mb-8 text-muted-foreground">Please log in to access the system.</p>
          <a href="/api/login" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors">
            Login with Replit
          </a>
        </div>
    );
  }

  return <>{children}</>;
}

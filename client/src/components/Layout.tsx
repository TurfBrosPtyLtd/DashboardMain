import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Redirect to login handled in App.tsx typically, or show simple unauthorized here
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-display font-bold mb-4">Welcome to Turf Bros</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the dashboard.</p>
          <a href="/api/login" className="inline-flex px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            Login with Replit
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-body">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

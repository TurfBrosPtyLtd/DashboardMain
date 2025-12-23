import { Layout } from "@/components/Layout";
import { useUsers } from "@/hooks/use-users";
import { User, Shield, Briefcase } from "lucide-react";

export default function Staff() {
  const { data: users, isLoading } = useUsers();

  if (isLoading) return <div className="p-8">Loading staff...</div>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Staff Directory</h1>
        <p className="text-muted-foreground">Team members and roles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map(user => (
          <div key={user.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{user.username}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  {user.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border flex justify-between text-sm">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

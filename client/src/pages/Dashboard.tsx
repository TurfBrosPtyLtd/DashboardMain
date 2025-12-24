import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { useJobs } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: clients } = useClients();

  const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length || 0;
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const totalClients = clients?.length || 0;

  return (
    <Layout>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 fade-in-up" style={{ animationDelay: '100ms' }}>
        <StatsCard 
          title="Active Jobs" 
          value={activeJobs} 
          icon={TrendingUp} 
          color="primary"
          trend="+5% from last week"
        />
        <StatsCard 
          title="Total Clients" 
          value={totalClients} 
          icon={Users} 
          color="blue"
          trend="2 new this month"
        />
        <StatsCard 
          title="Completed Jobs" 
          value={completedJobs} 
          icon={CheckCircle2} 
          color="accent"
          trend="92% completion rate"
        />
      </div>

      <div className="fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Today's Schedule</h2>
            <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          
          <div className="space-y-4">
            {jobs?.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${
                    job.status === 'completed' ? 'bg-green-500' : 
                    job.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <h3 className="font-bold text-foreground">{job.client.name}</h3>
                    <p className="text-sm text-muted-foreground">{job.client.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium">{format(new Date(job.scheduledDate), 'h:mm a')}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium mt-1 ${
                    job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {!jobs?.length && (
              <div className="text-center py-10 text-muted-foreground">
                No jobs scheduled for today.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

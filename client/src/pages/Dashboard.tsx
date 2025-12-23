import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { useJobs } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { useFeedback } from "@/hooks/use-feedback";
import { TrendingUp, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: clients } = useClients();
  const { data: feedback } = useFeedback();

  const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length || 0;
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const totalClients = clients?.length || 0;
  const avgRating = feedback?.length 
    ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1)
    : "N/A";

  return (
    <Layout>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 fade-in-up" style={{ animationDelay: '100ms' }}>
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
        <StatsCard 
          title="Avg Feedback" 
          value={avgRating} 
          icon={AlertCircle} 
          color="rose"
          trend="Based on AI analysis"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in-up" style={{ animationDelay: '200ms' }}>
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
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

        {/* Quick Actions / Feedback Preview */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-border/60 p-6">
          <h2 className="text-xl font-display font-bold mb-4">Latest Feedback</h2>
          <div className="space-y-4">
            {feedback?.slice(0, 3).map(f => (
              <div key={f.id} className="bg-white/80 dark:bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/20 dark:border-white/10 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < f.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    f.sentiment === 'positive' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {f.sentiment}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">"{f.comment}"</p>
                <div className="mt-2 text-xs font-mono text-primary/80">
                  AI: {f.aiAnalysis}
                </div>
              </div>
            ))}
            {!feedback?.length && <p className="text-muted-foreground text-sm">No feedback yet.</p>}
          </div>
          <Link href="/feedback" className="block mt-6 w-full py-3 text-center bg-white dark:bg-card border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            View All Feedback
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function Star(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  )
}

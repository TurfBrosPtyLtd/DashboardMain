import { Layout } from "@/components/Layout";
import { useJobs } from "@/hooks/use-jobs";
import { useCrews, type CrewWithMembers } from "@/hooks/use-crews";
import { TrendingUp, CheckCircle2, Clock, Target, Users, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: crews } = useCrews();
  const [selectedCrew, setSelectedCrew] = useState<CrewWithMembers | null>(null);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weeklyJobs = jobs?.filter(j => {
    const date = new Date(j.scheduledDate);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  }) || [];

  const monthlyJobs = jobs?.filter(j => {
    const date = new Date(j.scheduledDate);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  }) || [];

  const weeklyActive = weeklyJobs.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length;
  const monthlyActive = monthlyJobs.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length;
  const weeklyCompleted = weeklyJobs.filter(j => j.status === 'completed').length;
  const monthlyCompleted = monthlyJobs.filter(j => j.status === 'completed').length;

  const weeklyTotal = weeklyJobs.length;
  const monthlyTotal = monthlyJobs.length;
  const weeklyCompletionRate = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
  const monthlyCompletionRate = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

  const completedJobsWithTime = jobs?.filter(j => j.status === 'completed' && j.endTime) || [];
  const onTimeJobs = completedJobsWithTime.filter(j => {
    if (!j.endTime) return false;
    const scheduled = new Date(j.scheduledDate);
    const ended = new Date(j.endTime);
    const scheduledEndOfDay = new Date(scheduled);
    scheduledEndOfDay.setHours(23, 59, 59, 999);
    return ended <= scheduledEndOfDay;
  }).length;
  const onTimeRate = completedJobsWithTime.length > 0 
    ? Math.round((onTimeJobs / completedJobsWithTime.length) * 100) 
    : 0;

  const getCrewStats = (crew: CrewWithMembers) => {
    const crewJobs = jobs?.filter(j => {
      if (!j.jobRunId) return false;
      return true;
    }) || [];
    
    const crewWeeklyJobs = crewJobs.filter(j => {
      const date = new Date(j.scheduledDate);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
    
    const crewMonthlyJobs = crewJobs.filter(j => {
      const date = new Date(j.scheduledDate);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const weeklyCompleted = crewWeeklyJobs.filter(j => j.status === 'completed').length;
    const monthlyCompleted = crewMonthlyJobs.filter(j => j.status === 'completed').length;
    const weeklyRate = crewWeeklyJobs.length > 0 ? Math.round((weeklyCompleted / crewWeeklyJobs.length) * 100) : 0;
    const monthlyRate = crewMonthlyJobs.length > 0 ? Math.round((monthlyCompleted / crewMonthlyJobs.length) * 100) : 0;

    return {
      weeklyJobs: crewWeeklyJobs.length,
      monthlyJobs: crewMonthlyJobs.length,
      weeklyCompleted,
      monthlyCompleted,
      weeklyRate,
      monthlyRate,
      memberCount: crew.members.length,
    };
  };

  return (
    <Layout>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Business performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 fade-in-up" style={{ animationDelay: '100ms' }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{weeklyActive}</span>
                <span className="text-sm text-muted-foreground">this week</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-muted-foreground">{monthlyActive}</span>
                <span className="text-xs text-muted-foreground">this month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{weeklyCompleted}</span>
                <span className="text-sm text-muted-foreground">this week</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-muted-foreground">{monthlyCompleted}</span>
                <span className="text-xs text-muted-foreground">this month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <div className="p-2 rounded-lg bg-accent/20">
              <Target className="w-4 h-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{weeklyCompletionRate}%</span>
                <span className="text-sm text-muted-foreground">weekly</span>
              </div>
              <Progress value={weeklyCompletionRate} className="h-2" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-muted-foreground">{monthlyCompletionRate}%</span>
                <span className="text-xs text-muted-foreground">monthly</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Completion</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{onTimeRate}%</span>
                <span className="text-sm text-muted-foreground">on time</span>
              </div>
              <Progress value={onTimeRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {onTimeJobs} of {completedJobsWithTime.length} jobs completed on schedule
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 fade-in-up" style={{ animationDelay: '200ms' }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xl font-display font-bold">Crew Performance</CardTitle>
            <Link href="/crews">
              <Button variant="outline" size="sm" data-testid="link-manage-crews">
                Manage Crews
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {crews && crews.length > 0 ? (
              <div className="space-y-3">
                {crews.map(crew => {
                  const stats = getCrewStats(crew);
                  return (
                    <div
                      key={crew.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover-elevate cursor-pointer"
                      onClick={() => setSelectedCrew(crew)}
                      data-testid={`card-crew-${crew.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{crew.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {stats.memberCount} member{stats.memberCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{stats.weeklyCompleted}/{stats.weeklyJobs}</p>
                          <p className="text-xs text-muted-foreground">this week</p>
                        </div>
                        <Badge variant={stats.weeklyRate >= 80 ? "default" : stats.weeklyRate >= 50 ? "secondary" : "outline"}>
                          {stats.weeklyRate}%
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No crews created yet.</p>
                <Link href="/crews">
                  <Button variant="outline" className="mt-4" data-testid="button-create-first-crew">
                    Create Your First Crew
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xl font-display font-bold">Today's Schedule</CardTitle>
            <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs?.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${
                      job.status === 'completed' ? 'bg-green-500' : 
                      job.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <h3 className="font-semibold text-foreground">{job.client.name}</h3>
                      <p className="text-sm text-muted-foreground">{job.client.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">{format(new Date(job.scheduledDate), 'h:mm a')}</p>
                    <Badge variant={
                      job.status === 'completed' ? 'default' : 
                      job.status === 'in_progress' ? 'secondary' : 'outline'
                    } className="mt-1">
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {!jobs?.length && (
                <div className="text-center py-10 text-muted-foreground">
                  No jobs scheduled for today.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedCrew} onOpenChange={() => setSelectedCrew(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedCrew?.name} Performance
            </DialogTitle>
          </DialogHeader>
          {selectedCrew && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Team Members</h4>
                <div className="space-y-2">
                  {selectedCrew.members.length > 0 ? (
                    selectedCrew.members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">{member.staff.name}</span>
                        <Badge variant="outline">{member.staff.role}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No members assigned</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Performance Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Weekly Jobs</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).weeklyCompleted}</p>
                    <p className="text-xs text-muted-foreground">of {getCrewStats(selectedCrew).weeklyJobs} completed</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Weekly Rate</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).weeklyRate}%</p>
                    <Progress value={getCrewStats(selectedCrew).weeklyRate} className="h-2 mt-2" />
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly Jobs</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).monthlyCompleted}</p>
                    <p className="text-xs text-muted-foreground">of {getCrewStats(selectedCrew).monthlyJobs} completed</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly Rate</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).monthlyRate}%</p>
                    <Progress value={getCrewStats(selectedCrew).monthlyRate} className="h-2 mt-2" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/crews">
                  <Button data-testid="button-view-crew-details">
                    View Full Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

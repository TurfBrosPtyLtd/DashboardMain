import { Layout } from "@/components/Layout";
import { useJobs } from "@/hooks/use-jobs";
import { useCrews, type CrewWithMembers } from "@/hooks/use-crews";
import { useJobRuns } from "@/hooks/use-job-runs";
import { TrendingUp, CheckCircle2, Clock, Target, Users, ChevronRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: crews } = useCrews();
  const { data: jobRuns } = useJobRuns();
  const [selectedCrew, setSelectedCrew] = useState<CrewWithMembers | null>(null);
  const [showCrewSelector, setShowCrewSelector] = useState(false);
  const [scheduleCrewId, setScheduleCrewId] = useState<string>("all");

  const totalStaffCount = crews?.reduce((acc, crew) => acc + crew.members.length, 0) || 0;

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

  const isJobOnTime = (job: { scheduledDate: string | Date; endTime?: string | Date | null }) => {
    if (!job.endTime) return false;
    const scheduled = new Date(job.scheduledDate);
    const ended = new Date(job.endTime);
    const scheduledEndOfDay = new Date(scheduled);
    scheduledEndOfDay.setHours(23, 59, 59, 999);
    return ended <= scheduledEndOfDay;
  };

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
    
    const weeklyCompletedWithTime = crewWeeklyJobs.filter(j => j.status === 'completed' && j.endTime);
    const monthlyCompletedWithTime = crewMonthlyJobs.filter(j => j.status === 'completed' && j.endTime);
    
    const weeklyOnTime = weeklyCompletedWithTime.filter(isJobOnTime).length;
    const monthlyOnTime = monthlyCompletedWithTime.filter(isJobOnTime).length;
    
    const weeklyOnTimeRate = weeklyCompletedWithTime.length > 0 ? Math.round((weeklyOnTime / weeklyCompletedWithTime.length) * 100) : 0;
    const monthlyOnTimeRate = monthlyCompletedWithTime.length > 0 ? Math.round((monthlyOnTime / monthlyCompletedWithTime.length) * 100) : 0;

    return {
      weeklyJobs: crewWeeklyJobs.length,
      monthlyJobs: crewMonthlyJobs.length,
      weeklyCompleted,
      monthlyCompleted,
      weeklyOnTime,
      monthlyOnTime,
      weeklyOnTimeRate,
      monthlyOnTimeRate,
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
            <CardTitle className="text-xl font-display font-bold">Overall Performance</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCrewSelector(true)}
              data-testid="button-view-crews"
            >
              <Users className="w-4 h-4 mr-2" />
              View Crews
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Crews</p>
                  <p className="text-3xl font-bold">{crews?.length || 0}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Staff</p>
                  <p className="text-3xl font-bold">{totalStaffCount}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Weekly Completion</span>
                  <span className="font-semibold">{weeklyCompleted} / {weeklyTotal} jobs</span>
                </div>
                <Progress value={weeklyCompletionRate} className="h-3" />
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">Monthly Completion</span>
                  <span className="font-semibold">{monthlyCompleted} / {monthlyTotal} jobs</span>
                </div>
                <Progress value={monthlyCompletionRate} className="h-3" />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">On-Time Rate</span>
                  </div>
                  <Badge variant={onTimeRate >= 80 ? "default" : onTimeRate >= 50 ? "secondary" : "outline"}>
                    {onTimeRate}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xl font-display font-bold">Today's Schedule</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={scheduleCrewId} onValueChange={setScheduleCrewId}>
                <SelectTrigger className="w-[140px]" data-testid="select-schedule-crew">
                  <SelectValue placeholder="All Crews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crews</SelectItem>
                  {crews?.map(crew => (
                    <SelectItem key={crew.id} value={crew.id.toString()}>
                      {crew.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const crewJobRunIds = scheduleCrewId === "all" 
                  ? null 
                  : jobRuns?.filter(jr => jr.crewId === parseInt(scheduleCrewId)).map(jr => jr.id) || [];
                
                const filteredJobs = jobs?.filter(job => {
                  if (scheduleCrewId === "all") return true;
                  if (!job.jobRunId) return false;
                  return crewJobRunIds?.includes(job.jobRunId);
                }) || [];

                if (filteredJobs.length === 0) {
                  return (
                    <div className="text-center py-10 text-muted-foreground">
                      {scheduleCrewId === "all" 
                        ? "No jobs scheduled for today."
                        : `No jobs scheduled for ${crews?.find(c => c.id === parseInt(scheduleCrewId))?.name || 'this crew'}.`
                      }
                    </div>
                  );
                }

                return filteredJobs.slice(0, 5).map(job => (
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
                ));
              })()}
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
                    <p className="text-sm text-muted-foreground">Weekly On-Time Rate</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).weeklyOnTimeRate}%</p>
                    <Progress value={getCrewStats(selectedCrew).weeklyOnTimeRate} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{getCrewStats(selectedCrew).weeklyOnTime} on time</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly Jobs</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).monthlyCompleted}</p>
                    <p className="text-xs text-muted-foreground">of {getCrewStats(selectedCrew).monthlyJobs} completed</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly On-Time Rate</p>
                    <p className="text-2xl font-bold">{getCrewStats(selectedCrew).monthlyOnTimeRate}%</p>
                    <Progress value={getCrewStats(selectedCrew).monthlyOnTimeRate} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{getCrewStats(selectedCrew).monthlyOnTime} on time</p>
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

      <Dialog open={showCrewSelector} onOpenChange={setShowCrewSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select a Crew</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {crews && crews.length > 0 ? (
              crews.map(crew => {
                const stats = getCrewStats(crew);
                return (
                  <div
                    key={crew.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover-elevate cursor-pointer"
                    onClick={() => {
                      setShowCrewSelector(false);
                      setSelectedCrew(crew);
                    }}
                    data-testid={`select-crew-${crew.id}`}
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
                    <div className="flex items-center gap-2">
                      <Badge variant={stats.weeklyOnTimeRate >= 80 ? "default" : stats.weeklyOnTimeRate >= 50 ? "secondary" : "outline"}>
                        {stats.weeklyOnTimeRate}%
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No crews created yet.</p>
                <Link href="/crews">
                  <Button variant="outline" className="mt-3" size="sm" onClick={() => setShowCrewSelector(false)}>
                    Create Crew
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

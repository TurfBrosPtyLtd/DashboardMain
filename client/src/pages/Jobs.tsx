import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useJobs, useCreateJob, useUpdateJob } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { useStaff } from "@/hooks/use-users";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { Calendar as CalendarIcon, MapPin, User, Clock, CheckCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

type ViewType = "daily" | "weekly" | "monthly";

export default function Jobs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: jobs, isLoading } = useJobs();
  const { data: clients } = useClients();
  const { data: staff } = useStaff();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createJob.mutateAsync({
      clientId: Number(formData.get("clientId")),
      assignedToId: Number(formData.get("assignedToId")),
      scheduledDate: new Date(formData.get("date") as string).toISOString(),
      notes: formData.get("notes") as string,
      status: "scheduled",
    });
    setIsCreateOpen(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    const updates: any = { status };
    if (status === 'in_progress') updates.startTime = new Date().toISOString();
    if (status === 'completed') updates.endTime = new Date().toISOString();
    
    await updateJob.mutateAsync({ id, ...updates });
  };

  const getJobsForDate = (date: Date) => {
    return jobs?.filter(job => isSameDay(new Date(job.scheduledDate), date)) || [];
  };

  const getDaysToDisplay = () => {
    if (viewType === "monthly") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    } else if (viewType === "weekly") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      // daily view - show today and next 6 days
      return Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));
    }
  };

  const days = getDaysToDisplay();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderMonthlyView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map(label => (
          <div key={label} className="text-center font-semibold text-sm text-muted-foreground py-2">
            {label}
          </div>
        ))}
        {days.map(day => {
          const dayJobs = getJobsForDate(day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 p-2 rounded-lg border ${
                isToday(day) 
                  ? "bg-primary/5 border-primary" 
                  : day.getMonth() === currentDate.getMonth()
                  ? "bg-card border-border"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="text-xs font-semibold mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayJobs.slice(0, 2).map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                      job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                      job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                      'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    }`}>
                      {job.client.name}
                    </div>
                  </Link>
                ))}
                {dayJobs.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayJobs.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeeklyView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayJobs = getJobsForDate(day);
          return (
            <div key={day.toISOString()} className={`flex-1 p-3 rounded-lg border min-h-96 ${
              isToday(day)
                ? "bg-primary/5 border-primary"
                : "bg-card border-border"
            }`}>
              <div className="font-semibold text-sm mb-3">
                {format(day, "EEE")}
                <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
              </div>
              <div className="space-y-2">
                {dayJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className={`p-2 rounded text-xs cursor-pointer hover:shadow-md transition-all ${
                      job.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                      job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900' :
                      'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      <div className="font-semibold truncate">{job.client.name}</div>
                      <div className="text-muted-foreground">{format(new Date(job.scheduledDate), "h:mm a")}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDailyView = () => (
    <div className="space-y-4">
      {days.map(day => {
        const dayJobs = getJobsForDate(day);
        return (
          <div key={day.toISOString()} className={`p-4 rounded-lg border ${
            isToday(day)
              ? "bg-primary/5 border-primary"
              : "bg-card border-border"
          }`}>
            <div className="font-bold text-lg mb-4">{format(day, "EEEE, MMMM d, yyyy")}</div>
            {dayJobs.length === 0 ? (
              <p className="text-muted-foreground">No jobs scheduled</p>
            ) : (
              <div className="space-y-3">
                {dayJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="p-4 rounded-lg border border-border hover:shadow-md transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-lg">{job.client.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                          job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                          'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {format(new Date(job.scheduledDate), "h:mm a")}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {job.client.address}
                        </div>
                        {job.assignedToId && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Staff #{job.assignedToId}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isLoading) return <div className="p-8">Loading jobs...</div>;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Jobs Schedule</h1>
          <p className="text-muted-foreground">Manage daily routes and assignments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl px-6">
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule New Job</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select name="clientId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="staff">Assign To</Label>
                  <Select name="assignedToId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map(member => (
                        <SelectItem key={member.id} value={String(member.id)}>{member.name} ({member.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input type="datetime-local" name="date" required className="rounded-lg" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input name="notes" placeholder="Gate code, special instructions..." className="rounded-lg" />
                </div>

                <Button type="submit" className="w-full bg-primary" disabled={createJob.isPending}>
                  {createJob.isPending ? "Creating..." : "Schedule Job"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                {viewType === "daily" && "Daily"}
                {viewType === "weekly" && "Weekly"}
                {viewType === "monthly" && "Monthly"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewType("daily")} data-testid="view-daily">
                Daily View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewType("weekly")} data-testid="view-weekly">
                Weekly View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewType("monthly")} data-testid="view-monthly">
                Monthly View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(addDays(currentDate, viewType === "daily" ? -1 : viewType === "weekly" ? -7 : -30))}
          data-testid="button-prev-period"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <h2 className="text-xl font-semibold">
          {viewType === "monthly" && format(currentDate, "MMMM yyyy")}
          {viewType === "weekly" && `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d")}`}
          {viewType === "daily" && "This Week"}
        </h2>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(addDays(currentDate, viewType === "daily" ? 1 : viewType === "weekly" ? 7 : 30))}
          data-testid="button-next-period"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {viewType === "monthly" && renderMonthlyView()}
      {viewType === "weekly" && renderWeeklyView()}
      {viewType === "daily" && renderDailyView()}
    </Layout>
  );
}

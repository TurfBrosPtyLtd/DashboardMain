import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useJobs, useCreateJob, useUpdateJob } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { useStaff, useCurrentStaff } from "@/hooks/use-users";
import { useJobRuns, useCreateJobRun, useUpdateJobRun, useDeleteJobRun } from "@/hooks/use-job-runs";
import { useCrews, useCreateCrew, useUpdateCrew, useDeleteCrew, useAddCrewMember, useRemoveCrewMember, type CrewWithMembers } from "@/hooks/use-crews";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { MapPin, Clock, Plus, ChevronLeft, ChevronRight, Zap, Trash2, Pencil, Users, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import type { JobRun, Crew, Staff } from "@shared/schema";
import { X } from "lucide-react";

type ViewType = "daily" | "weekly" | "monthly";

export default function Jobs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingJobRun, setEditingJobRun] = useState<JobRun | null>(null);
  const [editName, setEditName] = useState("");
  const [addJobRunDate, setAddJobRunDate] = useState<Date | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [manageCrewsOpen, setManageCrewsOpen] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [editingCrew, setEditingCrew] = useState<CrewWithMembers | null>(null);
  const [editCrewName, setEditCrewName] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [addJobToRunId, setAddJobToRunId] = useState<number | null>(null);
  
  const { data: jobs, isLoading } = useJobs();
  const { data: clients } = useClients();
  const { data: staff } = useStaff();
  const { canViewMoney } = useCurrentStaff();
  const { data: jobRuns, refetch: refetchJobRuns } = useJobRuns();
  const { data: crews, refetch: refetchCrews } = useCrews();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const createJobRun = useCreateJobRun();
  const updateJobRun = useUpdateJobRun();
  const deleteJobRun = useDeleteJobRun();
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();
  const deleteCrew = useDeleteCrew();
  const addCrewMember = useAddCrewMember();
  const removeCrewMember = useRemoveCrewMember();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jobRunId = formData.get("jobRunId");
    const priceValue = formData.get("price");
    await createJob.mutateAsync({
      clientId: Number(formData.get("clientId")),
      assignedToId: formData.get("assignedToId") ? Number(formData.get("assignedToId")) : undefined,
      scheduledDate: new Date(formData.get("date") as string).toISOString(),
      notes: formData.get("notes") as string,
      status: "scheduled",
      jobRunId: jobRunId && jobRunId !== "none" ? Number(jobRunId) : undefined,
      price: priceValue ? Number(priceValue) : 0,
    });
    setIsCreateOpen(false);
  };

  const getJobsForDate = (date: Date) => {
    return jobs?.filter(job => isSameDay(new Date(job.scheduledDate), date)) || [];
  };

  const getJobRunsForDate = (date: Date) => {
    return jobRuns?.filter((jr: JobRun) => isSameDay(new Date(jr.date), date)) || [];
  };

  const getJobsForJobRun = (jobRunId: number) => {
    return jobs?.filter(job => job.jobRunId === jobRunId) || [];
  };

  const getAvailableCrewsForDate = (date: Date) => {
    const dayJobRuns = getJobRunsForDate(date);
    const assignedCrewIds = dayJobRuns.map((jr: JobRun) => jr.crewId).filter(Boolean);
    return crews?.filter((crew: Crew) => !assignedCrewIds.includes(crew.id)) || [];
  };

  const getCrewName = (crewId: number | null) => {
    if (!crewId) return null;
    return crews?.find((c: Crew) => c.id === crewId)?.name;
  };

  const getDayTotal = (date: Date) => {
    const dayJobs = getJobsForDate(date);
    return dayJobs.reduce((sum, job) => sum + (job.price || 0), 0);
  };

  const getWeekTotal = (startDate: Date) => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      total += getDayTotal(addDays(startDate, i));
    }
    return total;
  };

  const getMonthTotal = () => {
    return days.reduce((sum, day) => sum + getDayTotal(day), 0);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const handleOpenAddJobRun = (date: Date) => {
    setAddJobRunDate(date);
    setSelectedCrewId("");
  };

  const handleCreateJobRun = async () => {
    if (!addJobRunDate) return;
    const existingRuns = getJobRunsForDate(addJobRunDate);
    const runName = `Job Run ${existingRuns.length + 1}`;
    const crewIdValue = selectedCrewId && selectedCrewId !== "none" ? Number(selectedCrewId) : undefined;
    await createJobRun.mutateAsync({
      name: runName,
      date: addJobRunDate.toISOString(),
      crewId: crewIdValue,
    });
    refetchJobRuns();
    setAddJobRunDate(null);
    setSelectedCrewId("");
  };

  const handleDeleteJobRun = async (id: number) => {
    await deleteJobRun.mutateAsync(id);
  };

  const handleStartEdit = (jobRun: JobRun) => {
    setEditingJobRun(jobRun);
    setEditName(jobRun.name);
  };

  const handleSaveEdit = async () => {
    if (editingJobRun) {
      await updateJobRun.mutateAsync({
        id: editingJobRun.id,
        name: editName,
      });
      setEditingJobRun(null);
    }
  };

  const handleCreateCrew = async () => {
    if (!newCrewName.trim()) return;
    await createCrew.mutateAsync({ name: newCrewName.trim() });
    setNewCrewName("");
    refetchCrews();
  };

  const handleDeleteCrew = async (id: number) => {
    await deleteCrew.mutateAsync(id);
    refetchCrews();
  };

  const handleStartEditCrew = (crew: CrewWithMembers) => {
    setEditingCrew(crew);
    setEditCrewName(crew.name);
    setSelectedStaffId("");
  };

  const handleSaveEditCrew = async () => {
    if (editingCrew && editCrewName.trim()) {
      await updateCrew.mutateAsync({ id: editingCrew.id, name: editCrewName.trim() });
      refetchCrews();
      setEditingCrew(null);
    }
  };

  const handleAddStaffToCrew = async () => {
    if (editingCrew && selectedStaffId && selectedStaffId !== "none") {
      await addCrewMember.mutateAsync({ crewId: editingCrew.id, staffId: Number(selectedStaffId) });
      refetchCrews();
      setSelectedStaffId("");
      const updatedCrews = await refetchCrews();
      const updatedCrew = updatedCrews.data?.find(c => c.id === editingCrew.id);
      if (updatedCrew) setEditingCrew(updatedCrew);
    }
  };

  const handleRemoveStaffFromCrew = async (staffId: number) => {
    if (editingCrew) {
      await removeCrewMember.mutateAsync({ crewId: editingCrew.id, staffId });
      const updatedCrews = await refetchCrews();
      const updatedCrew = updatedCrews.data?.find(c => c.id === editingCrew.id);
      if (updatedCrew) setEditingCrew(updatedCrew);
    }
  };

  const getAvailableStaffForCrew = (crew: CrewWithMembers) => {
    const assignedStaffIds = crew.members.map(m => m.staffId);
    return staff?.filter(s => !assignedStaffIds.includes(s.id)) || [];
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
      return Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));
    }
  };

  const days = getDaysToDisplay();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderJobRunCard = (jobRun: JobRun, compact = false) => {
    const runJobs = getJobsForJobRun(jobRun.id);
    const crewName = getCrewName(jobRun.crewId);
    
    if (compact) {
      return (
        <div key={jobRun.id} className="text-xs bg-muted rounded p-1 group relative">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-amber-600 dark:text-amber-400 truncate">{jobRun.name}</div>
            <div className="invisible group-hover:visible flex gap-0.5">
              <Button size="icon" variant="ghost" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); handleStartEdit(jobRun); }}>
                <Pencil className="w-2 h-2" />
              </Button>
              <Button size="icon" variant="ghost" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); handleDeleteJobRun(jobRun.id); }}>
                <Trash2 className="w-2 h-2" />
              </Button>
            </div>
          </div>
          {crewName && (
            <div className="text-muted-foreground flex items-center gap-1">
              <Users className="w-2 h-2" />
              {crewName}
            </div>
          )}
          {runJobs.slice(0, 1).map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="text-xs p-0.5 truncate cursor-pointer hover:opacity-80">
                {job.client.name}
              </div>
            </Link>
          ))}
          {runJobs.length > 1 && (
            <div className="text-muted-foreground">+{runJobs.length - 1} more</div>
          )}
        </div>
      );
    }

    return (
      <div key={jobRun.id} className="p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
            <h4 className="font-bold text-amber-900 dark:text-amber-100">{jobRun.name}</h4>
          </div>
          <div className="flex items-center gap-2">
            {crewName && (
              <span className="text-sm text-muted-foreground flex items-center gap-1 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded">
                <Users className="w-3 h-3" />
                {crewName}
              </span>
            )}
            <Button size="icon" variant="ghost" onClick={() => setAddJobToRunId(jobRun.id)} data-testid={`button-add-job-to-run-${jobRun.id}`}>
              <Plus className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleStartEdit(jobRun)} data-testid={`button-edit-jobrun-${jobRun.id}`}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleDeleteJobRun(jobRun.id)} data-testid={`button-delete-jobrun-${jobRun.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {runJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs assigned to this run yet</p>
        ) : (
          <div className="space-y-2">
            {runJobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="p-3 rounded border border-border hover:shadow-md transition-all cursor-pointer bg-card">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-semibold">{job.client.name}</h5>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                      job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                      'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {job.client.address}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map(label => (
          <div key={label} className="text-center font-semibold text-sm text-muted-foreground py-2">
            {label}
          </div>
        ))}
        {days.map(day => {
          const dayJobRuns = getJobRunsForDate(day);
          const dayJobs = getJobsForDate(day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-32 p-2 rounded-lg border flex flex-col ${
                isToday(day) 
                  ? "bg-primary/5 border-primary" 
                  : day.getMonth() === currentDate.getMonth()
                  ? "bg-card border-border"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-semibold">{format(day, "d")}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => handleOpenAddJobRun(day)}
                  data-testid={`button-add-jobrun-${format(day, "yyyy-MM-dd")}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto">
                {dayJobRuns.length > 0 ? (
                  dayJobRuns.map((jr: JobRun) => renderJobRunCard(jr, true))
                ) : dayJobs.length > 0 ? (
                  dayJobs.slice(0, 1).map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                        job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                        job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      }`}>
                        {job.client.name}
                      </div>
                    </Link>
                  ))
                ) : null}
              </div>
              {canViewMoney && getDayTotal(day) > 0 && (
                <div className="mt-1 pt-1 border-t border-border/50 text-xs font-semibold text-green-600 dark:text-green-400" data-testid={`day-total-${format(day, "yyyy-MM-dd")}`}>
                  {formatCurrency(getDayTotal(day))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canViewMoney && (
        <div className="flex justify-end p-3 bg-muted rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="month-total">
            Monthly Total: {formatCurrency(getMonthTotal())}
          </div>
        </div>
      )}
    </div>
  );

  const renderWeeklyView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayJobRuns = getJobRunsForDate(day);
          const dayJobs = getJobsForDate(day);
          return (
            <div key={day.toISOString()} className={`flex-1 p-3 rounded-lg border min-h-96 flex flex-col ${
              isToday(day)
                ? "bg-primary/5 border-primary"
                : "bg-card border-border"
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-sm">
                    {format(day, "EEE")}
                    <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleOpenAddJobRun(day)}
                  data-testid={`button-add-jobrun-week-${format(day, "yyyy-MM-dd")}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto">
                {dayJobRuns.length > 0 ? (
                  dayJobRuns.map((jr: JobRun) => (
                    <div key={jr.id} className="p-2 rounded bg-muted group">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-semibold text-xs text-amber-600 dark:text-amber-400">{jr.name}</div>
                        <div className="invisible group-hover:visible flex gap-1">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleStartEdit(jr)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDeleteJobRun(jr.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {getCrewName(jr.crewId) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Users className="w-3 h-3" />
                          {getCrewName(jr.crewId)}
                        </div>
                      )}
                      {getJobsForJobRun(jr.id).map(job => (
                        <Link key={job.id} href={`/jobs/${job.id}`}>
                          <div className="text-xs p-1 rounded cursor-pointer hover:opacity-80 mb-1">
                            {job.client.name}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))
                ) : (
                  dayJobs.map(job => (
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
                  ))
                )}
              </div>
              {canViewMoney && getDayTotal(day) > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 text-sm font-semibold text-green-600 dark:text-green-400" data-testid={`week-day-total-${format(day, "yyyy-MM-dd")}`}>
                  {formatCurrency(getDayTotal(day))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canViewMoney && (
        <div className="flex justify-end p-3 bg-muted rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="week-total">
            Weekly Total: {formatCurrency(getWeekTotal(days[0]))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDailyView = () => (
    <div className="space-y-4">
      {days.map(day => {
        const dayJobRuns = getJobRunsForDate(day);
        const dayJobs = getJobsForDate(day);
        return (
          <div key={day.toISOString()} className={`p-4 rounded-lg border ${
            isToday(day)
              ? "bg-primary/5 border-primary"
              : "bg-card border-border"
          }`}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-lg">{format(day, "EEEE, MMMM d, yyyy")}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenAddJobRun(day)}
                data-testid={`button-add-jobrun-daily-${format(day, "yyyy-MM-dd")}`}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Job Run
              </Button>
            </div>
            {dayJobRuns.length > 0 ? (
              <div className="space-y-4">
                {dayJobRuns.map((jr: JobRun) => renderJobRunCard(jr, false))}
              </div>
            ) : dayJobs.length === 0 ? (
              <p className="text-muted-foreground">No jobs scheduled yet. Create a job run to get started!</p>
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
                        {canViewMoney && (job.price ?? 0) > 0 && (
                          <div className="flex items-center font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(job.price ?? 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {canViewMoney && getDayTotal(day) > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`daily-total-${format(day, "yyyy-MM-dd")}`}>
                  Day Total: {formatCurrency(getDayTotal(day))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isLoading) return <div className="p-8">Loading jobs...</div>;

  const availableCrews = addJobRunDate ? getAvailableCrewsForDate(addJobRunDate) : [];

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
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" name="date" required className="rounded-lg" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobRunId">Job Run (optional)</Label>
                  <Select name="jobRunId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select job run" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No job run</SelectItem>
                      {jobRuns?.map((jr: JobRun) => (
                        <SelectItem key={jr.id} value={String(jr.id)}>{jr.name} - {format(new Date(jr.date), "MMM d")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canViewMoney && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input type="number" name="price" placeholder="0" min="0" className="rounded-lg" />
                  </div>
                )}

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

      <Dialog open={!!editingJobRun} onOpenChange={(open) => !open && setEditingJobRun(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Job Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Job Run Name"
                className="rounded-lg"
                data-testid="input-jobrun-name"
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full bg-primary" disabled={updateJobRun.isPending} data-testid="button-save-jobrun">
              {updateJobRun.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addJobRunDate} onOpenChange={(open) => !open && setAddJobRunDate(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Job Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {addJobRunDate && (
              <p className="text-sm text-muted-foreground">
                Creating job run for {format(addJobRunDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
            
            <div className="space-y-2">
              <Label>Select a Crew (optional)</Label>
              {availableCrews.length > 0 ? (
                <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crew" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No crew assigned</SelectItem>
                    {availableCrews.map((crew: Crew) => (
                      <SelectItem key={crew.id} value={String(crew.id)}>{crew.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : crews && crews.length > 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      All existing crews are already assigned to a job run for this day. To add a new job run you can either create it without a crew or create another crew first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    No crews have been created yet. Create crews to assign them to job runs.
                  </p>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={() => { setAddJobRunDate(null); setManageCrewsOpen(true); }} className="w-full" data-testid="button-manage-crews">
              <Users className="w-4 h-4 mr-2" />
              Manage Crews
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddJobRunDate(null)} data-testid="button-cancel-jobrun">
              Cancel
            </Button>
            <Button onClick={handleCreateJobRun} className="bg-primary" disabled={createJobRun.isPending} data-testid="button-create-jobrun">
              {createJobRun.isPending ? "Creating..." : "Create Job Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageCrewsOpen} onOpenChange={setManageCrewsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Crews</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                value={newCrewName}
                onChange={(e) => setNewCrewName(e.target.value)}
                placeholder="New crew name"
                className="rounded-lg"
                data-testid="input-new-crew-name"
              />
              <Button onClick={handleCreateCrew} disabled={!newCrewName.trim() || createCrew.isPending} data-testid="button-create-crew">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {crews && crews.length > 0 ? (
                crews.map((crew: CrewWithMembers) => (
                  <div key={crew.id} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{crew.name}</span>
                        {crew.members && crew.members.length > 0 && (
                          <span className="text-xs text-muted-foreground">({crew.members.length} members)</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleStartEditCrew(crew)} data-testid={`button-edit-crew-${crew.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCrew(crew.id)} data-testid={`button-delete-crew-${crew.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {crew.members && crew.members.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {crew.members.map(m => (
                          <span key={m.staffId} className="text-xs bg-muted px-2 py-1 rounded">
                            {m.staff?.name || `Staff ${m.staffId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No crews created yet</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageCrewsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCrew} onOpenChange={(open) => !open && setEditingCrew(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Crew</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Crew Name</Label>
              <div className="flex gap-2">
                <Input
                  value={editCrewName}
                  onChange={(e) => setEditCrewName(e.target.value)}
                  placeholder="Crew name"
                  className="rounded-lg"
                  data-testid="input-edit-crew-name"
                />
                <Button onClick={handleSaveEditCrew} disabled={!editCrewName.trim() || updateCrew.isPending} data-testid="button-save-crew">
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Staff Members</Label>
              {editingCrew && editingCrew.members && editingCrew.members.length > 0 ? (
                <div className="space-y-1">
                  {editingCrew.members.map(m => (
                    <div key={m.staffId} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">{m.staff?.name || `Staff ${m.staffId}`}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveStaffFromCrew(m.staffId)} data-testid={`button-remove-staff-${m.staffId}`}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No staff members assigned to this crew yet.</p>
              )}
            </div>

            {editingCrew && (
              <div className="space-y-2">
                <Label>Add Staff</Label>
                {getAvailableStaffForCrew(editingCrew).length > 0 ? (
                  <div className="flex gap-2">
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStaffForCrew(editingCrew).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddStaffToCrew} disabled={!selectedStaffId || addCrewMember.isPending} data-testid="button-add-staff-to-crew">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All staff members are already assigned to this crew.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCrew(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addJobToRunId} onOpenChange={(open) => !open && setAddJobToRunId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Job to Run</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const targetRun = jobRuns?.find(jr => jr.id === addJobToRunId);
            const priceValue = formData.get("price");
            await createJob.mutateAsync({
              clientId: Number(formData.get("clientId")),
              assignedToId: formData.get("assignedToId") ? Number(formData.get("assignedToId")) : undefined,
              scheduledDate: targetRun ? new Date(targetRun.date).toISOString() : new Date().toISOString(),
              notes: formData.get("notes") as string || "",
              status: "scheduled",
              jobRunId: addJobToRunId!,
              price: priceValue ? Number(priceValue) : 0,
            });
            setAddJobToRunId(null);
          }} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="add-job-client">Client</Label>
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
              <Label htmlFor="add-job-staff">Assign to Staff (optional)</Label>
              <Select name="assignedToId">
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {staff?.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canViewMoney && (
              <div className="space-y-2">
                <Label htmlFor="add-job-price">Price ($)</Label>
                <Input type="number" name="price" placeholder="0" min="0" data-testid="input-add-job-price" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-job-notes">Notes (optional)</Label>
              <Input name="notes" placeholder="Special instructions..." data-testid="input-add-job-notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddJobToRunId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createJob.isPending} data-testid="button-submit-add-job">
                {createJob.isPending ? "Adding..." : "Add Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

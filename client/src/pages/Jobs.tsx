import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { useStaff, useCurrentStaff } from "@/hooks/use-users";
import { useJobRuns, useCreateJobRun, useUpdateJobRun, useDeleteJobRun } from "@/hooks/use-job-runs";
import { useCrews, useCreateCrew, useUpdateCrew, useDeleteCrew, useAddCrewMember, useRemoveCrewMember, type CrewWithMembers } from "@/hooks/use-crews";
import { useJobTimeEntries, useStartTimer, useStopTimer, useDeleteTimeEntry } from "@/hooks/use-time-entries";
import { useJobTasks, useCreateJobTask, useToggleJobTask, useDeleteJobTask } from "@/hooks/use-job-tasks";
import { useJobPhotos, useCreateJobPhoto, useDeleteJobPhoto } from "@/hooks/use-job-photos";
import { useUpload } from "@/hooks/use-upload";
import { Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { MapPin, Clock, Plus, ChevronLeft, ChevronRight, Zap, Trash2, Pencil, Users, AlertCircle, Scissors, CalendarDays, MoreVertical, Check, SkipForward, ExternalLink, Navigation, Play, Square, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { JobRun, Crew, Staff, Mower, Client, Job, JobTask } from "@shared/schema";
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
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedMowerId, setSelectedMowerId] = useState<string>("");
  const [selectedProgramTier, setSelectedProgramTier] = useState<string>("");
  const [cutHeightUnit, setCutHeightUnit] = useState<string>("level");
  const [cutHeightValue, setCutHeightValue] = useState<string>("");
  const [newJobTasks, setNewJobTasks] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");
  
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [staffNotes, setStaffNotes] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [popupTaskInput, setPopupTaskInput] = useState<string>("");
  const [photoType, setPhotoType] = useState<"before" | "during" | "after">("during");
  
  const { data: jobs, isLoading } = useJobs();
  const { data: clients } = useClients();
  const { data: staff } = useStaff();
  const { canViewMoney, canViewGateCode } = useCurrentStaff();
  const { data: mowers } = useQuery<Mower[]>({ queryKey: ["/api/mowers"] });
  const { data: jobRuns, refetch: refetchJobRuns } = useJobRuns();
  const { data: crews, refetch: refetchCrews } = useCrews();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const createJobRun = useCreateJobRun();
  const updateJobRun = useUpdateJobRun();
  const deleteJobRun = useDeleteJobRun();
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();
  const deleteCrew = useDeleteCrew();
  const addCrewMember = useAddCrewMember();
  const removeCrewMember = useRemoveCrewMember();
  
  const { data: timeEntries, refetch: refetchTimeEntries } = useJobTimeEntries(selectedJobId);
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const deleteTimeEntry = useDeleteTimeEntry();
  const { staff: currentStaff } = useCurrentStaff();
  
  const { data: jobTasks, refetch: refetchJobTasks } = useJobTasks(selectedJobId);
  const createJobTask = useCreateJobTask();
  const toggleJobTask = useToggleJobTask();
  const deleteJobTask = useDeleteJobTask();
  
  const { data: jobPhotos } = useJobPhotos(selectedJobId);
  const createJobPhoto = useCreateJobPhoto();
  const deleteJobPhoto = useDeleteJobPhoto();
  const { uploadFile, isUploading } = useUpload();
  
  const myActiveTimeEntry = timeEntries?.find(e => !e.endTime && e.staffId === currentStaff?.id);
  const otherActiveEntries = timeEntries?.filter(e => !e.endTime && e.staffId !== currentStaff?.id) || [];
  
  useEffect(() => {
    if (!myActiveTimeEntry) {
      setElapsedSeconds(0);
      return;
    }
    
    const startTime = new Date(myActiveTimeEntry.startTime).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [myActiveTimeEntry]);

  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartTimer = async (entryType: "self" | "crew") => {
    if (!selectedJobId) return;
    await startTimer.mutateAsync({ jobId: selectedJobId, entryType });
  };

  const handleStopTimer = async () => {
    if (!myActiveTimeEntry || !selectedJobId) return;
    await stopTimer.mutateAsync({ entryId: myActiveTimeEntry.id, jobId: selectedJobId });
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    if (!selectedJobId) return;
    await deleteTimeEntry.mutateAsync({ entryId, jobId: selectedJobId });
  };

  const handleAddPopupTask = async () => {
    if (!popupTaskInput.trim() || !selectedJobId) return;
    await createJobTask.mutateAsync({ jobId: selectedJobId, description: popupTaskInput.trim() });
    setPopupTaskInput("");
  };

  const handleToggleTask = async (taskId: number, isCompleted: boolean) => {
    if (!selectedJobId) return;
    await toggleJobTask.mutateAsync({ 
      taskId, 
      jobId: selectedJobId, 
      isCompleted
    });
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!selectedJobId) return;
    await deleteJobTask.mutateAsync({ taskId, jobId: selectedJobId });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJobId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    
    const response = await uploadFile(file);
    if (response) {
      // The objectPath is already in format /objects/... which is served by our routes
      await createJobPhoto.mutateAsync({
        jobId: selectedJobId,
        url: response.objectPath,
        photoType,
        filename: file.name
      });
    }
    e.target.value = "";
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!selectedJobId) return;
    await deleteJobPhoto.mutateAsync({ photoId, jobId: selectedJobId });
  };

  const getSelectedClient = (): Client | undefined => {
    if (!selectedClientId) return undefined;
    return clients?.find(c => c.id === Number(selectedClientId));
  };

  const getProgramTierLabel = (tier: string | undefined): string => {
    switch (tier) {
      case "22": return "Essentials (22/yr)";
      case "24": return "Elite (24/yr)";
      case "26": return "Prestige (26/yr)";
      default: return tier || "Not set";
    }
  };

  const addTask = () => {
    if (newTaskInput.trim()) {
      setNewJobTasks([...newJobTasks, newTaskInput.trim()]);
      setNewTaskInput("");
    }
  };

  const removeTask = (index: number) => {
    setNewJobTasks(newJobTasks.filter((_, i) => i !== index));
  };

  const resetNewJobForm = () => {
    setSelectedClientId("");
    setSelectedMowerId("");
    setSelectedProgramTier("");
    setCutHeightUnit("level");
    setCutHeightValue("");
    setNewJobTasks([]);
    setNewTaskInput("");
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jobRunId = formData.get("jobRunId");
    const priceValue = formData.get("price");
    const gateCodeValue = formData.get("gateCode") as string;
    const siteInfoValue = formData.get("siteInformation") as string;
    const estimatedDuration = formData.get("estimatedDuration");
    
    await createJob.mutateAsync({
      clientId: Number(selectedClientId),
      assignedToId: formData.get("assignedToId") ? Number(formData.get("assignedToId")) : undefined,
      scheduledDate: new Date(formData.get("date") as string),
      notes: formData.get("notes") as string,
      status: "scheduled",
      jobRunId: jobRunId && jobRunId !== "none" ? Number(jobRunId) : undefined,
      price: priceValue ? Number(priceValue) : 0,
      programTier: selectedProgramTier || undefined,
      mowerId: selectedMowerId && selectedMowerId !== "none" ? Number(selectedMowerId) : undefined,
      cutHeightUnit: cutHeightUnit || undefined,
      cutHeightValue: cutHeightValue || undefined,
      gateCode: gateCodeValue || undefined,
      siteInformation: siteInfoValue || undefined,
      estimatedDurationMinutes: estimatedDuration ? Number(estimatedDuration) : undefined,
      tasks: newJobTasks.length > 0 ? newJobTasks : undefined,
    });
    resetNewJobForm();
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

  const selectedJob = selectedJobId ? jobs?.find(j => j.id === selectedJobId) : null;
  
  const getClientContacts = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client ? [{ name: client.name, email: client.email, phone: client.phone, role: "resident" }] : [];
  };

  const getProgramProgress = (clientId: number, programTier: string | null | undefined) => {
    if (!programTier || !jobs) return { completed: 0, total: parseInt(programTier || "0", 10) };
    const clientJobs = jobs.filter(j => j.clientId === clientId && j.programTier === programTier);
    const completed = clientJobs.filter(j => j.status === "completed").length;
    return { completed, total: parseInt(programTier, 10) };
  };

  const getMowerInfo = (mowerId: number | null | undefined) => {
    if (!mowerId) return null;
    return mowers?.find(m => m.id === mowerId);
  };

  const formatCutHeight = (unit: string | null | undefined, value: string | null | undefined) => {
    if (!value) return null;
    switch (unit) {
      case "level": return `Level ${value}`;
      case "millimeter": return `${value}mm`;
      case "inch": return `${value}"`;
      default: return value;
    }
  };

  const getScheduleFrequency = (programTier: string | null | undefined) => {
    return "Every 2 weeks";
  };

  const openMapsApp = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

  const handleJobClick = (jobId: number) => {
    setSelectedJobId(jobId);
    const job = jobs?.find(j => j.id === jobId);
    if (job) {
      setStaffNotes(job.jobNotes || "");
    }
  };

  const handleCompleteJob = async (jobId: number) => {
    await updateJob.mutateAsync({ id: jobId, status: "completed" });
    setSelectedJobId(null);
  };

  const handleSkipJob = async (jobId: number) => {
    await updateJob.mutateAsync({ id: jobId, status: "cancelled" });
    setSelectedJobId(null);
  };

  const handleDeleteJobConfirm = async () => {
    if (deleteJobId) {
      await deleteJob.mutateAsync(deleteJobId);
      setDeleteJobId(null);
      setSelectedJobId(null);
    }
  };

  const handleSaveStaffNotes = async (jobId: number) => {
    await updateJob.mutateAsync({ id: jobId, jobNotes: staffNotes });
  };

  const getDaysToDisplay = () => {
    if (viewType === "monthly") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart);
      const end = endOfWeek(monthEnd);
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
            <div 
              key={job.id} 
              onClick={(e) => { e.stopPropagation(); handleJobClick(job.id); }}
              className="text-xs p-0.5 truncate cursor-pointer hover:opacity-80"
              data-testid={`job-tile-compact-${job.id}`}
            >
              {job.client.name}
            </div>
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
              <div 
                key={job.id} 
                onClick={() => handleJobClick(job.id)}
                className="p-3 rounded border border-border hover:shadow-md transition-all cursor-pointer bg-card"
                data-testid={`job-tile-fullrun-${job.id}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h5 className="font-semibold">{job.client.name}</h5>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                    job.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
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
              className={`min-h-24 p-2 rounded-lg border flex flex-col ${
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
              <div className="space-y-1 flex-1">
                {dayJobRuns.length > 0 ? (
                  dayJobRuns.map((jr: JobRun) => renderJobRunCard(jr, true))
                ) : dayJobs.length > 0 ? (
                  dayJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => handleJobClick(job.id)}
                      className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                        job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                        job.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      }`}
                      data-testid={`job-tile-${job.id}`}
                    >
                      {job.client.name}
                    </div>
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
                        <div 
                          key={job.id} 
                          onClick={() => handleJobClick(job.id)}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80 mb-1"
                          data-testid={`job-tile-run-${job.id}`}
                        >
                          {job.client.name}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  dayJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => handleJobClick(job.id)}
                      className={`p-2 rounded text-xs cursor-pointer hover:shadow-md transition-all ${
                        job.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                        job.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800' :
                        job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900' :
                        'bg-blue-100 dark:bg-blue-900'
                      }`}
                      data-testid={`job-tile-week-${job.id}`}
                    >
                      <div className="font-semibold truncate">{job.client.name}</div>
                    </div>
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
                  <div 
                    key={job.id} 
                    onClick={() => handleJobClick(job.id)}
                    className="p-4 rounded-lg border border-border hover:shadow-md transition-all cursor-pointer"
                    data-testid={`job-tile-daily-${job.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{job.client.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        job.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' :
                        job.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        job.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
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
            <DialogContent className="sm:max-w-[550px] max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Schedule New Job</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map(client => (
                          <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getSelectedClient() && (
                      <span className="text-xs text-muted-foreground">{getSelectedClient()?.address}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="program">Program</Label>
                    <Select value={selectedProgramTier} onValueChange={setSelectedProgramTier}>
                      <SelectTrigger data-testid="select-program">
                        <SelectValue placeholder="Select program (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="22">Essentials (22 services/year)</SelectItem>
                        <SelectItem value="24">Elite (24 services/year)</SelectItem>
                        <SelectItem value="26">Prestige (26 services/year)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a program will schedule future services based on the start date.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input type="date" name="date" required className="rounded-lg" data-testid="input-date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDuration">Duration (mins)</Label>
                      <Input type="number" name="estimatedDuration" placeholder="45" min="5" step="5" className="rounded-lg" data-testid="input-duration" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="staff">Assign To</Label>
                    <Select name="assignedToId">
                      <SelectTrigger data-testid="select-staff">
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
                    <Label htmlFor="jobRunId">Job Run (optional)</Label>
                    <Select name="jobRunId">
                      <SelectTrigger data-testid="select-jobrun">
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

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Scissors className="w-4 h-4" />
                      Equipment & Settings
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mower">Mower</Label>
                      <Select value={selectedMowerId} onValueChange={setSelectedMowerId}>
                        <SelectTrigger data-testid="select-mower">
                          <SelectValue placeholder="Select mower" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No mower selected</SelectItem>
                          {mowers?.filter(m => m.isActive).map(mower => (
                            <SelectItem key={mower.id} value={String(mower.id)}>
                              {mower.name} ({mower.mowerType.replace('_', ' ')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="cutHeightUnit">Cut Height Unit</Label>
                        <Select value={cutHeightUnit} onValueChange={setCutHeightUnit}>
                          <SelectTrigger data-testid="select-cut-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="level">Level (1-7)</SelectItem>
                            <SelectItem value="millimeter">Millimeters</SelectItem>
                            <SelectItem value="inch">Inches</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cutHeightValue">Cut Height</Label>
                        <Input 
                          type={cutHeightUnit === "level" ? "number" : "text"}
                          value={cutHeightValue}
                          onChange={(e) => setCutHeightValue(e.target.value)}
                          placeholder={cutHeightUnit === "level" ? "4" : cutHeightUnit === "millimeter" ? "50mm" : "2\""}
                          min={cutHeightUnit === "level" ? "1" : undefined}
                          max={cutHeightUnit === "level" ? "7" : undefined}
                          className="rounded-lg"
                          data-testid="input-cut-height"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Site Information
                    </h4>

                    {canViewGateCode && (
                      <div className="space-y-2">
                        <Label htmlFor="gateCode">Gate Code</Label>
                        <Input name="gateCode" placeholder="Enter gate code" className="rounded-lg" data-testid="input-gate-code" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="siteInformation">Site Notes</Label>
                      <Textarea 
                        name="siteInformation" 
                        placeholder="Special access instructions, hazards, dog on property..." 
                        className="rounded-lg resize-none" 
                        rows={2}
                        data-testid="input-site-info"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium text-sm">Task Checklist</h4>
                    <div className="flex gap-2">
                      <Input 
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="Add a task..."
                        className="rounded-lg flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                        data-testid="input-new-task"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={addTask} data-testid="button-add-task">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {newJobTasks.length > 0 && (
                      <div className="space-y-1">
                        {newJobTasks.map((task, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg text-sm">
                            <span data-testid={`task-item-${idx}`}>{task}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTask(idx)} data-testid={`button-remove-task-${idx}`}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {canViewMoney && (
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input type="number" name="price" placeholder="0" min="0" className="rounded-lg" data-testid="input-price" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea name="notes" placeholder="Any other notes..." className="rounded-lg resize-none" rows={2} data-testid="input-notes" />
                  </div>

                  <Button type="submit" className="w-full bg-primary" disabled={createJob.isPending || !selectedClientId} data-testid="button-create-job">
                    {createJob.isPending ? "Creating..." : "Schedule Job"}
                  </Button>
                </form>
              </ScrollArea>
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
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            data-testid="button-go-to-today"
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, viewType === "daily" ? 1 : viewType === "weekly" ? 7 : 30))}
            data-testid="button-next-period"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
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
              scheduledDate: targetRun ? new Date(targetRun.date) : new Date(),
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

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          {selectedJob && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-lg">
                    {format(new Date(selectedJob.scheduledDate), "EEEE, do MMM, yy")}
                  </DialogTitle>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid="button-job-menu">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSkipJob(selectedJob.id)} data-testid="button-skip-job">
                          <SkipForward className="w-4 h-4 mr-2" />
                          Skip This Job
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteJobId(selectedJob.id)} 
                          className="text-destructive"
                          data-testid="button-delete-job"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Job & Future Jobs
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div 
                  onClick={() => openMapsApp(selectedJob.client.address)}
                  className="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                  data-testid="link-open-maps"
                >
                  <MapPin className="w-3 h-3" />
                  <span className="underline">{selectedJob.client.address}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </DialogHeader>
              
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Client</div>
                      <div className="font-medium">{selectedJob.client.name}</div>
                    </div>
                    
                    {selectedJob.programTier && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Program</div>
                        <div className="font-medium">
                          {getProgramProgress(selectedJob.clientId, selectedJob.programTier).completed} of {selectedJob.programTier} visits
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Schedule</div>
                      <div className="font-medium">{getScheduleFrequency(selectedJob.programTier)}</div>
                    </div>
                    
                    {selectedJob.estimatedDurationMinutes && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-medium">{selectedJob.estimatedDurationMinutes} mins</div>
                      </div>
                    )}
                    
                    {canViewMoney && (selectedJob.price ?? 0) > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(selectedJob.price ?? 0)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {getMowerInfo(selectedJob.mowerId) && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Mower</div>
                        <div className="font-medium">{getMowerInfo(selectedJob.mowerId)?.name}</div>
                      </div>
                    )}
                    
                    {formatCutHeight(selectedJob.cutHeightUnit, selectedJob.cutHeightValue) && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Cut Height</div>
                        <div className="font-medium">{formatCutHeight(selectedJob.cutHeightUnit, selectedJob.cutHeightValue)}</div>
                      </div>
                    )}
                  </div>

                  {canViewGateCode && selectedJob.gateCode && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="text-xs text-muted-foreground mb-1">Gate Code</div>
                      <div className="font-mono font-bold">{selectedJob.gateCode}</div>
                    </div>
                  )}

                  {selectedJob.siteInformation && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Site Instructions</div>
                      <div className="text-sm bg-muted p-3 rounded-lg">{selectedJob.siteInformation}</div>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Timer
                      </h4>
                      {myActiveTimeEntry && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                            {formatElapsedTime(elapsedSeconds)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {otherActiveEntries.length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                        Active: {otherActiveEntries.map(e => e.staff?.name || "Unknown").join(", ")}
                      </div>
                    )}
                    
                    {myActiveTimeEntry ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          Your timer ({myActiveTimeEntry.entryType === "crew" ? "Crew" : "Self"})
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={handleStopTimer}
                          disabled={stopTimer.isPending}
                          data-testid="button-stop-timer"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          {stopTimer.isPending ? "Stopping..." : `Stop My Timer (${myActiveTimeEntry.entryType === "crew" ? "Crew" : "Self"})`}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartTimer("self")}
                          disabled={startTimer.isPending}
                          data-testid="button-start-timer-self"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {startTimer.isPending ? "Starting..." : "Start (Self)"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartTimer("crew")}
                          disabled={startTimer.isPending}
                          data-testid="button-start-timer-crew"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {startTimer.isPending ? "Starting..." : "Start (Crew)"}
                        </Button>
                      </div>
                    )}
                    
                    {timeEntries && timeEntries.filter(e => e.endTime).length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="text-xs text-muted-foreground">Previous Entries</div>
                        <div className="space-y-1">
                          {timeEntries.filter(e => e.endTime).slice(0, 5).map(entry => (
                            <div key={entry.id} className="flex items-center justify-between gap-2 text-sm bg-muted rounded px-2 py-1">
                              <div className="flex items-center gap-2">
                                <span>{entry.staff?.name || "Unknown"}</span>
                                <Badge variant="outline" className="text-xs">
                                  {entry.entryType === "crew" ? "Crew" : "Self"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {entry.durationMinutes ? `${entry.durationMinutes} min` : "-"}
                                </span>
                                {canViewMoney && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteTimeEntry(entry.id)}
                                    disabled={deleteTimeEntry.isPending}
                                    data-testid={`button-delete-time-entry-${entry.id}`}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Task Checklist
                      </h4>
                      {jobTasks && jobTasks.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {jobTasks.filter(t => t.isCompleted).length}/{jobTasks.length} done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These tasks could be completed every job or some jobs depending. Check with your team leader if unsure.
                    </p>
                    
                    <div className="flex gap-2">
                      <Input 
                        value={popupTaskInput}
                        onChange={(e) => setPopupTaskInput(e.target.value)}
                        placeholder="Add a task..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPopupTask())}
                        data-testid="input-popup-task"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={handleAddPopupTask}
                        disabled={createJobTask.isPending || !popupTaskInput.trim()}
                        data-testid="button-add-popup-task"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {jobTasks && jobTasks.length > 0 && (
                      <div className="space-y-1">
                        {jobTasks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(task => (
                          <div 
                            key={task.id} 
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                              task.isCompleted 
                                ? "bg-green-50 dark:bg-green-950/30" 
                                : "bg-muted"
                            }`}
                          >
                            <Checkbox 
                              checked={task.isCompleted ?? false}
                              onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                              disabled={toggleJobTask.isPending}
                              data-testid={`checkbox-task-${task.id}`}
                            />
                            <span 
                              className={`flex-1 ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}
                              data-testid={`text-task-${task.id}`}
                            >
                              {task.description}
                            </span>
                            {task.isCompleted && task.completedById && (
                              <span className="text-xs text-muted-foreground">
                                {staff?.find(s => s.id === task.completedById)?.name || ""}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={deleteJobTask.isPending}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(!jobTasks || jobTasks.length === 0) && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No tasks yet. Add one above.
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Photos
                      </h4>
                      {jobPhotos && jobPhotos.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {jobPhotos.length} photo{jobPhotos.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload photos of the job before, during, or after completion.
                    </p>
                    
                    <div className="flex gap-2 items-center">
                      <Select value={photoType} onValueChange={(v) => setPhotoType(v as "before" | "during" | "after")}>
                        <SelectTrigger className="w-32" data-testid="select-photo-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">Before</SelectItem>
                          <SelectItem value="during">During</SelectItem>
                          <SelectItem value="after">After</SelectItem>
                        </SelectContent>
                      </Select>
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={isUploading || createJobPhoto.isPending}
                          className="hidden"
                          data-testid="input-photo-upload"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          disabled={isUploading || createJobPhoto.isPending}
                          asChild
                        >
                          <span>
                            <Camera className="w-4 h-4 mr-1" />
                            {isUploading ? "Uploading..." : "Add Photo"}
                          </span>
                        </Button>
                      </label>
                    </div>

                    {jobPhotos && jobPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {jobPhotos.map((photo) => (
                          <div 
                            key={photo.id} 
                            className="relative group rounded-lg overflow-hidden bg-muted aspect-square"
                            data-testid={`photo-${photo.id}`}
                          >
                            <img 
                              src={photo.url} 
                              alt={`Job photo - ${photo.photoType}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              <div className="flex justify-between items-start">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {photo.photoType}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  disabled={deleteJobPhoto.isPending}
                                  data-testid={`button-delete-photo-${photo.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-white/80">
                                {photo.createdAt && format(new Date(photo.createdAt), "MMM d, h:mm a")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(!jobPhotos || jobPhotos.length === 0) && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No photos yet. Upload one above.
                      </div>
                    )}
                  </div>

                  {selectedJob.notes && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <div className="text-sm bg-muted p-3 rounded-lg">{selectedJob.notes}</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Staff Notes</div>
                    <Textarea
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="Add notes about this job..."
                      className="resize-none"
                      rows={2}
                      data-testid="input-staff-notes"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleSaveStaffNotes(selectedJob.id)}
                      disabled={updateJob.isPending}
                      data-testid="button-save-notes"
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setSelectedJobId(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => handleCompleteJob(selectedJob.id)}
                  disabled={selectedJob.status === "completed" || updateJob.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-complete-job"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {selectedJob.status === "completed" ? "Completed" : "Mark Complete"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteJobId} onOpenChange={(open) => !open && setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This action cannot be undone. 
              All related data including tasks and feedback will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteJobConfirm}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

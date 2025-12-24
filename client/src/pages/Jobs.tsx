import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useJobs, useCreateJob, useUpdateJob } from "@/hooks/use-jobs";
import { useClients } from "@/hooks/use-clients";
import { useStaff } from "@/hooks/use-users";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, User, Clock, CheckCircle, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export default function Jobs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  if (isLoading) return <div className="p-8">Loading jobs...</div>;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Jobs Schedule</h1>
          <p className="text-muted-foreground">Manage daily routes and assignments</p>
        </div>
        
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.map((job) => (
          <div key={job.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <div className={`h-2 w-full ${
              job.status === 'completed' ? 'bg-green-500' : 
              job.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-muted px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {job.status.replace('_', ' ')}
                </div>
                {job.status !== 'completed' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleStatusChange(job.id, job.status === 'scheduled' ? 'in_progress' : 'completed')}
                  >
                    {job.status === 'scheduled' ? 'Start' : 'Complete'}
                  </Button>
                )}
              </div>

              <Link href={`/jobs/${job.id}`}>
                <h3 className="text-xl font-bold font-display mb-1 group-hover:text-primary transition-colors cursor-pointer">
                  {job.client.name}
                </h3>
              </Link>
              
              <div className="space-y-3 mt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  {job.client.address}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                  {format(new Date(job.scheduledDate), 'MMM d, yyyy - h:mm a')}
                </div>
                {job.assignedToId && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    Staff #{job.assignedToId}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-primary hover:underline">
                  View Details &rarr;
                </Link>
                {job.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

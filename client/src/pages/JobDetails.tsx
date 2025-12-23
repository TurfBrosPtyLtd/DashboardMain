import { useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { useJob } from "@/hooks/use-jobs";
import { useCreateApplication } from "@/hooks/use-applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MapPin, Calendar, CheckSquare, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function JobDetails() {
  const { id } = useParams();
  const jobId = Number(id);
  const { data: job, isLoading } = useJob(jobId);
  const createApplication = useCreateApplication();
  const [isAppOpen, setIsAppOpen] = useState(false);

  if (isLoading) return <div className="p-8">Loading job details...</div>;
  if (!job) return <div className="p-8">Job not found</div>;

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createApplication.mutateAsync({
      jobId,
      productName: formData.get("productName") as string,
      quantity: formData.get("quantity") as string,
      complianceNotes: formData.get("complianceNotes") as string,
    });
    setIsAppOpen(false);
  };

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to jobs
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{job.client.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.client.address}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(job.scheduledDate), 'PPP p')}</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-full font-bold text-sm uppercase tracking-wide">
            {job.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display">Applications & Products</h2>
              <Dialog open={isAppOpen} onOpenChange={setIsAppOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Product Application</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input name="productName" placeholder="e.g. Fertilizer 10-10-10" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity Used</Label>
                      <Input name="quantity" placeholder="e.g. 50 lbs" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Compliance Notes</Label>
                      <Input name="complianceNotes" placeholder="Weather conditions, wind speed..." />
                    </div>
                    <Button type="submit" className="w-full bg-primary" disabled={createApplication.isPending}>
                      Record Application
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-4">
              {job.applications?.length ? (
                job.applications.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">{app.productName}</p>
                        <p className="text-sm text-muted-foreground">{app.complianceNotes || "No notes"}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono font-medium">{app.quantity}</div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 bg-muted/20 rounded-xl border border-dashed">
                  No products applied yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
             <h2 className="text-xl font-bold font-display mb-4">Notes & Instructions</h2>
             <p className="text-muted-foreground bg-muted/30 p-4 rounded-xl">
               {job.notes || "No special instructions for this job."}
             </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-primary/25">
             <h3 className="font-bold text-lg mb-2">Program Tier</h3>
             <div className="text-4xl font-display font-bold">{job.client.programTier}</div>
             <p className="text-primary-foreground/80 text-sm mt-1">Scheduled Visits / Year</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
             <h3 className="font-bold text-lg mb-4">Client Contact</h3>
             <div className="space-y-3">
               <div>
                 <label className="text-xs text-muted-foreground font-semibold uppercase">Email</label>
                 <p>{job.client.email || "N/A"}</p>
               </div>
               <div>
                 <label className="text-xs text-muted-foreground font-semibold uppercase">Phone</label>
                 <p>{job.client.phone || "N/A"}</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

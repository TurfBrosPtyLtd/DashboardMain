import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User, ChevronDown, ChevronUp, Leaf, Check } from "lucide-react";
import { format } from "date-fns";
import type { JobTreatment, TreatmentType, Job } from "@shared/schema";

type TreatmentHistoryItem = JobTreatment & { treatmentType: TreatmentType; job: Job };

function ClientTreatmentHistory({ clientId }: { clientId: number }) {
  const { data: treatments, isLoading } = useQuery<TreatmentHistoryItem[]>({
    queryKey: ["/api/clients", clientId, "treatment-history"],
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-2">Loading treatments...</div>;
  }

  if (!treatments || treatments.length === 0) {
    return <div className="text-sm text-muted-foreground py-2">No treatments recorded yet.</div>;
  }

  const completedTreatments = treatments.filter(t => t.status === "completed");
  const pendingTreatments = treatments.filter(t => t.status !== "completed");

  return (
    <div className="space-y-3">
      {completedTreatments.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Completed ({completedTreatments.length})
          </h5>
          <div className="space-y-2">
            {completedTreatments.slice(0, 5).map(treatment => (
              <div 
                key={treatment.id} 
                className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded-lg"
                data-testid={`treatment-history-${treatment.id}`}
              >
                <Check className="w-4 h-4 text-green-600" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{treatment.treatmentType.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {treatment.completedAt ? format(new Date(treatment.completedAt), "MMM d, yyyy") : ""}
                  </span>
                </div>
              </div>
            ))}
            {completedTreatments.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{completedTreatments.length - 5} more completed treatments
              </p>
            )}
          </div>
        </div>
      )}
      
      {pendingTreatments.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Pending ({pendingTreatments.length})
          </h5>
          <div className="space-y-2">
            {pendingTreatments.slice(0, 3).map(treatment => (
              <div 
                key={treatment.id} 
                className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-lg"
                data-testid={`treatment-pending-${treatment.id}`}
              >
                <Leaf className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{treatment.treatmentType.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {treatment.job?.scheduledDate ? format(new Date(treatment.job.scheduledDate), "MMM d") : "Scheduled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createClient.mutateAsync({
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      programTier: "24",
    });
    setIsOpen(false);
  };

  const toggleExpanded = (clientId: number) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage your client base</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required placeholder="John Doe" data-testid="input-client-name" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" required placeholder="123 Green St" data-testid="input-client-address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="john@example.com" data-testid="input-client-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="phone" placeholder="(555) 123-4567" data-testid="input-client-phone" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createClient.isPending} data-testid="button-submit-client">
                Create Client
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Search clients by name or address..." 
            className="pl-10 border-0 bg-muted/50 focus-visible:ring-0 focus-visible:bg-muted transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients?.map(client => (
          <div 
            key={client.id} 
            className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300"
            data-testid={`client-card-${client.id}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => toggleExpanded(client.id)}
                data-testid={`button-expand-client-${client.id}`}
              >
                {expandedClientId === client.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <h3 className="text-xl font-bold font-display mb-1">{client.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">{client.address}</p>
            
            <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-4">
              <div>
                <span className="text-muted-foreground text-xs uppercase font-bold">Email</span>
                <p className="truncate">{client.email || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase font-bold">Phone</span>
                <p>{client.phone || "-"}</p>
              </div>
            </div>

            {expandedClientId === client.id && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Treatment History</h4>
                </div>
                <ClientTreatmentHistory clientId={client.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

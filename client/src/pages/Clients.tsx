import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, User, ChevronDown, ChevronUp, Calendar, Leaf } from "lucide-react";
import type { ProgramTemplate, ClientProgram } from "@shared/schema";

type ClientProgramWithTemplate = ClientProgram & { template: ProgramTemplate };

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<number | null>(null);
  const [assignProgramDialogOpen, setAssignProgramDialogOpen] = useState(false);
  const [selectedClientForProgram, setSelectedClientForProgram] = useState<number | null>(null);
  const [selectedProgramTemplateId, setSelectedProgramTemplateId] = useState<string>("");
  const [programStartDate, setProgramStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const { data: programTemplates } = useQuery<ProgramTemplate[]>({ queryKey: ["/api/program-templates"] });
  
  const { data: clientPrograms } = useQuery<ClientProgramWithTemplate[]>({
    queryKey: ["/api/clients", expandedClient, "programs"],
    enabled: !!expandedClient,
  });

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
      programTier: formData.get("programTier") as string,
    });
    setIsOpen(false);
  };

  const handleAssignProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientForProgram || !selectedProgramTemplateId) {
      toast({ title: "Please select a program template", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", `/api/clients/${selectedClientForProgram}/programs`, {
        programTemplateId: Number(selectedProgramTemplateId),
        startDate: programStartDate ? new Date(programStartDate).toISOString() : new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClientForProgram, "programs"] });
      toast({ title: "Program assigned successfully" });
      setAssignProgramDialogOpen(false);
      setSelectedProgramTemplateId("");
      setProgramStartDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      toast({ title: "Failed to assign program", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage client base and service programs</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required placeholder="John Doe" data-testid="input-client-name" />
                </div>
                <div className="space-y-2">
                  <Label>Program Tier</Label>
                  <Select name="programTier" defaultValue="24">
                    <SelectTrigger data-testid="select-client-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="22">Essentials (22)</SelectItem>
                      <SelectItem value="24">Elite (24)</SelectItem>
                      <SelectItem value="26">Prestige (26)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        {filteredClients?.map(client => {
          const isExpanded = expandedClient === client.id;
          const programs = isExpanded ? clientPrograms || [] : [];
          
          return (
            <div 
              key={client.id} 
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300"
              data-testid={`client-card-${client.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Tier {client.programTier}</Badge>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                    data-testid={`button-expand-client-${client.id}`}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
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

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium text-sm flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Assigned Programs
                    </p>
                    <Dialog 
                      open={assignProgramDialogOpen && selectedClientForProgram === client.id} 
                      onOpenChange={(open) => {
                        setAssignProgramDialogOpen(open);
                        if (open) setSelectedClientForProgram(client.id);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" data-testid={`button-assign-program-${client.id}`}>
                          <Plus className="w-3 h-3 mr-1" />
                          Assign Program
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Program to {client.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAssignProgram} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Program Template</Label>
                            <Select 
                              value={selectedProgramTemplateId} 
                              onValueChange={setSelectedProgramTemplateId}
                            >
                              <SelectTrigger data-testid="select-assign-program-template">
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                              <SelectContent>
                                {programTemplates?.map(t => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.name} ({t.servicesPerYear} services/yr)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input 
                              type="date" 
                              value={programStartDate}
                              onChange={(e) => setProgramStartDate(e.target.value)}
                              data-testid="input-program-start-date"
                            />
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-assign-program">
                            Assign Program
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {programs.length > 0 ? (
                    <div className="space-y-2">
                      {programs.map(p => (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50"
                          data-testid={`client-program-${p.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{p.template?.name || p.customName}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.template?.servicesPerYear} services/yr - {p.status}
                              </p>
                            </div>
                          </div>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No programs assigned yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

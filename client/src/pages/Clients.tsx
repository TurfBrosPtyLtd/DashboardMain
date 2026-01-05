import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User } from "lucide-react";

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

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
      programTier: "24", // Default value, programs are now assigned to jobs
    });
    setIsOpen(false);
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
          </div>
        ))}
      </div>
    </Layout>
  );
}

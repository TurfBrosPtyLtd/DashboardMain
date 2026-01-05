import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useStaff, useCurrentStaff } from "@/hooks/use-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { STAFF_ROLES, MOWER_TYPES, type Staff, type Mower, type TreatmentType, type ProgramTemplate } from "@shared/schema";
import { Users, Shield, Save, Plus, Pencil, Leaf, Calendar, Tractor, Droplet, Bug, FlaskConical, CircleDot, Droplets } from "lucide-react";

function MowerIcon({ type }: { type: string }) {
  switch (type) {
    case "push": return <Tractor className="w-5 h-5" />;
    case "self_propelled": return <Tractor className="w-5 h-5" />;
    case "stand_on": return <Tractor className="w-5 h-5" />;
    case "ride_on": return <Tractor className="w-5 h-5" />;
    case "robot": return <Tractor className="w-5 h-5" />;
    default: return <Tractor className="w-5 h-5" />;
  }
}

function TreatmentIcon({ category }: { category: string | null }) {
  switch (category) {
    case "fertilizer": return <Leaf className="w-5 h-5 text-green-600" />;
    case "soil": return <Droplet className="w-5 h-5 text-amber-600" />;
    case "aeration": return <CircleDot className="w-5 h-5 text-gray-600" />;
    case "irrigation": return <Droplets className="w-5 h-5 text-blue-600" />;
    case "pest": return <Bug className="w-5 h-5 text-red-600" />;
    default: return <FlaskConical className="w-5 h-5 text-purple-600" />;
  }
}

function parseServicesPerMonth(value: string | number[] | null | undefined): number[] {
  if (!value) return Array(12).fill(2);
  if (Array.isArray(value)) return value;
  try {
    if (typeof value === 'string') {
      if (value.startsWith('[')) {
        return JSON.parse(value);
      }
      if (value.startsWith('{')) {
        const cleaned = value.slice(1, -1).split(',').map(s => parseInt(s.replace(/"/g, '').trim(), 10) || 0);
        return cleaned;
      }
    }
  } catch {
    return Array(12).fill(2);
  }
  return Array(12).fill(2);
}

export default function Settings() {
  const { data: staffList, isLoading } = useStaff();
  const { canViewMoney, role: currentRole } = useCurrentStaff();
  const { toast } = useToast();
  const [editingStaff, setEditingStaff] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const { data: mowers } = useQuery<Mower[]>({ queryKey: ["/api/mowers"] });
  const { data: treatmentTypes } = useQuery<TreatmentType[]>({ queryKey: ["/api/treatment-types"] });
  const { data: programTemplates } = useQuery<ProgramTemplate[]>({ queryKey: ["/api/program-templates"] });

  const [mowerDialogOpen, setMowerDialogOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);

  const handleRoleChange = (staffId: number, newRole: string) => {
    setEditingStaff(prev => ({ ...prev, [staffId]: newRole }));
  };

  const handleSaveRole = async (staffMember: Staff) => {
    const newRole = editingStaff[staffMember.id];
    if (!newRole || newRole === staffMember.role) return;

    setSaving(staffMember.id);
    try {
      await apiRequest("PUT", `/api/staff/${staffMember.id}`, { role: newRole });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Role updated",
        description: `${staffMember.name}'s role has been changed to ${newRole}`,
      });
      setEditingStaff(prev => {
        const next = { ...prev };
        delete next[staffMember.id];
        return next;
      });
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner": return "default";
      case "manager": return "default";
      case "team_leader": return "secondary";
      default: return "outline";
    }
  };

  const isManager = currentRole === "manager" || currentRole === "owner";

  const handleCreateMower = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await apiRequest("POST", "/api/mowers", {
        name: String(formData.get("name") || ""),
        brand: String(formData.get("brand") || ""),
        mowerType: String(formData.get("mowerType") || "push"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mowers"] });
      toast({ title: "Mower added successfully" });
      setMowerDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Failed to add mower", variant: "destructive" });
    }
  };

  const handleCreateTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await apiRequest("POST", "/api/treatment-types", {
        name: String(formData.get("name") || ""),
        category: String(formData.get("category") || "fertilizer"),
        defaultNotes: formData.get("defaultNotes") ? String(formData.get("defaultNotes")) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-types"] });
      toast({ title: "Treatment type added successfully" });
      setTreatmentDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Failed to add treatment type", variant: "destructive" });
    }
  };

  const handleCreateProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const servicesPerMonth = Array.from({ length: 12 }, (_, i) => 
      Number(formData.get(`month${i}`) || 2)
    );
    try {
      await apiRequest("POST", "/api/program-templates", {
        name: String(formData.get("name") || ""),
        description: formData.get("description") ? String(formData.get("description")) : null,
        servicesPerYear: servicesPerMonth.reduce((a, b) => a + b, 0),
        servicesPerMonth,
        defaultCadence: String(formData.get("defaultCadence") || "two_week"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/program-templates"] });
      toast({ title: "Program template created successfully" });
      setProgramDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Failed to create program template", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your team, equipment, and service programs</p>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList data-testid="settings-tabs">
            <TabsTrigger value="roles" data-testid="tab-roles">Team Roles</TabsTrigger>
            <TabsTrigger value="mowers" data-testid="tab-mowers">Mowers</TabsTrigger>
            <TabsTrigger value="treatments" data-testid="tab-treatments">Treatments</TabsTrigger>
            <TabsTrigger value="programs" data-testid="tab-programs">Programs</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle>Team Roles</CardTitle>
                </div>
                <CardDescription>
                  Manage staff roles and permissions. Only managers and owners can change roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staffList?.map(member => {
                    const currentEditRole = editingStaff[member.id] || member.role;
                    const hasChanges = editingStaff[member.id] && editingStaff[member.id] !== member.role;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                        data-testid={`staff-role-row-${member.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.phone || "No phone"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isManager ? (
                            <>
                              <Select
                                value={currentEditRole}
                                onValueChange={(value) => handleRoleChange(member.id, value)}
                                data-testid={`select-role-${member.id}`}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STAFF_ROLES.map(role => (
                                    <SelectItem key={role} value={role}>
                                      {role.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {hasChanges && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRole(member)}
                                  disabled={saving === member.id}
                                  data-testid={`button-save-role-${member.id}`}
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  {saving === member.id ? "Saving..." : "Save"}
                                </Button>
                              )}
                            </>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(!staffList || staffList.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No staff members found. Add staff from the dashboard.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Understanding what each role can do</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold">Owner</p>
                    <p className="text-sm text-muted-foreground">Full access to all features including financial data, gate codes, role management, and settings</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold">Manager</p>
                    <p className="text-sm text-muted-foreground">Access to financial data, gate codes, can manage staff roles, equipment, and programs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold">Team Leader</p>
                    <p className="text-sm text-muted-foreground">Can view financial data and gate codes, manage job runs and schedules</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold">Staff</p>
                    <p className="text-sm text-muted-foreground">Can view and update assigned jobs, limited access to scheduling</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold">Crew Member</p>
                    <p className="text-sm text-muted-foreground">Basic access to view their assigned work, cannot see financial data or gate codes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mowers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Tractor className="w-5 h-5 text-primary" />
                    <CardTitle>Mower Catalog</CardTitle>
                  </div>
                  {isManager && (
                    <Dialog open={mowerDialogOpen} onOpenChange={setMowerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-mower">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Mower
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Mower</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateMower} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="mower-name">Name</Label>
                            <Input id="mower-name" name="name" required data-testid="input-mower-name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mower-brand">Brand</Label>
                            <Input id="mower-brand" name="brand" data-testid="input-mower-brand" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mower-type">Type</Label>
                            <Select name="mowerType" defaultValue="push">
                              <SelectTrigger data-testid="select-mower-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MOWER_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type.replace("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-mower">
                            Add Mower
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <CardDescription>
                  Manage your mower fleet. Staff can mark favorites for quick selection.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mowers?.map(mower => (
                    <div
                      key={mower.id}
                      className="p-4 rounded-lg border border-border space-y-2"
                      data-testid={`mower-card-${mower.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MowerIcon type={mower.mowerType} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{mower.name}</p>
                          <p className="text-sm text-muted-foreground">{mower.brand || "Unknown brand"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {mower.mowerType.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                  {(!mowers || mowers.length === 0) && (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                      No mowers in catalog. Add your first mower above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    <CardTitle>Treatment Types</CardTitle>
                  </div>
                  {isManager && (
                    <Dialog open={treatmentDialogOpen} onOpenChange={setTreatmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-treatment">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Treatment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Treatment Type</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTreatment} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="treatment-name">Name</Label>
                            <Input id="treatment-name" name="name" required data-testid="input-treatment-name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="treatment-category">Category</Label>
                            <Select name="category" defaultValue="fertilizer">
                              <SelectTrigger data-testid="select-treatment-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fertilizer">Fertilizer</SelectItem>
                                <SelectItem value="soil">Soil Treatment</SelectItem>
                                <SelectItem value="aeration">Aeration</SelectItem>
                                <SelectItem value="irrigation">Irrigation</SelectItem>
                                <SelectItem value="pest">Pest Control</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="treatment-notes">Default Notes</Label>
                            <Textarea id="treatment-notes" name="defaultNotes" data-testid="input-treatment-notes" />
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-treatment">
                            Add Treatment
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <CardDescription>
                  Define treatment types for lawn care programs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {treatmentTypes?.map(treatment => (
                    <div
                      key={treatment.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                      data-testid={`treatment-row-${treatment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <TreatmentIcon category={treatment.category} />
                        </div>
                        <div>
                          <p className="font-semibold">{treatment.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{treatment.category}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{treatment.category}</Badge>
                    </div>
                  ))}
                  {(!treatmentTypes || treatmentTypes.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No treatment types defined. Add your first treatment above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle>Program Templates</CardTitle>
                  </div>
                  {isManager && (
                    <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-program">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Program
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Program Template</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateProgram} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="program-name">Name</Label>
                            <Input id="program-name" name="name" required data-testid="input-program-name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="program-desc">Description</Label>
                            <Textarea id="program-desc" name="description" data-testid="input-program-description" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="program-cadence">Default Cadence</Label>
                            <Select name="defaultCadence" defaultValue="two_week">
                              <SelectTrigger data-testid="select-program-cadence">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="two_week">Every 2 weeks</SelectItem>
                                <SelectItem value="four_week">Every 4 weeks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Services Per Month</Label>
                            <div className="grid grid-cols-6 gap-2">
                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => (
                                <div key={month} className="text-center">
                                  <Label className="text-xs text-muted-foreground">{month}</Label>
                                  <Input
                                    type="number"
                                    name={`month${i}`}
                                    defaultValue="2"
                                    min="0"
                                    max="4"
                                    className="text-center"
                                    data-testid={`input-month-${i}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-program">
                            Create Program
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <CardDescription>
                  Define service programs with customizable service frequencies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programTemplates?.map(program => {
                    const months = parseServicesPerMonth(program.servicesPerMonth);
                    
                    return (
                      <div
                        key={program.id}
                        className="p-4 rounded-lg border border-border space-y-3"
                        data-testid={`program-card-${program.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-lg">{program.name}</p>
                            <p className="text-sm text-muted-foreground">{program.description}</p>
                          </div>
                          <Badge>{program.servicesPerYear} services/year</Badge>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                            <div key={i} className="text-center">
                              <div className="text-xs text-muted-foreground">{m}</div>
                              <div className="h-8 flex items-end justify-center">
                                <div 
                                  className="w-4 bg-primary rounded-t"
                                  style={{ height: `${(months[i] || 0) * 8}px` }}
                                />
                              </div>
                              <div className="text-xs font-medium">{months[i] || 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {(!programTemplates || programTemplates.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No program templates defined. Create your first program above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

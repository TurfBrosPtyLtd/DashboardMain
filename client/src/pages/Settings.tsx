import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { STAFF_ROLES, MOWER_TYPES, type Staff, type Mower, type TreatmentType, type ProgramTemplate, type ProgramTemplateTreatment, type TreatmentProgram, type TreatmentProgramSchedule } from "@shared/schema";
import { getServicesArray } from "@shared/serviceDistribution";
import { Users, Shield, Save, Plus, Pencil, Leaf, Calendar, Tractor, Droplet, Bug, FlaskConical, CircleDot, Droplets, Calculator, RefreshCw, ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";

type ProgramWithTreatments = ProgramTemplate & { 
  treatments: (ProgramTemplateTreatment & { treatmentType: TreatmentType })[] 
};

type TreatmentProgramWithSchedule = TreatmentProgram & {
  schedule: (TreatmentProgramSchedule & { treatmentType: TreatmentType })[];
};

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

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function TreatmentProgramScheduleSection({ 
  programId, 
  treatmentTypes, 
  isManager 
}: { 
  programId: number; 
  treatmentTypes: TreatmentType[]; 
  isManager: boolean;
}) {
  const { data: program } = useQuery<TreatmentProgramWithSchedule>({ 
    queryKey: ["/api/treatment-programs", programId] 
  });
  const { toast } = useToast();

  const handleDeleteScheduleItem = async (scheduleId: number) => {
    try {
      await apiRequest("DELETE", `/api/treatment-program-schedule/${scheduleId}`);
      toast({ title: "Treatment removed from schedule" });
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-programs", programId] });
    } catch (error) {
      toast({ title: "Failed to remove treatment", variant: "destructive" });
    }
  };

  const schedules = program?.schedule || [];
  
  // Separate flexible treatments from month-based treatments
  const flexibleSchedules = schedules.filter(s => s.isFlexible);
  const monthlySchedules = schedules.filter(s => !s.isFlexible && s.month);
  
  const schedulesByMonth = monthlySchedules.reduce((acc, s) => {
    const month = s.month!;
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {} as Record<number, typeof schedules>);

  const renderScheduleItem = (item: typeof schedules[0]) => (
    <div key={item.id} className="flex items-center justify-between gap-1 text-xs">
      <div className="flex items-center gap-1 min-w-0">
        <TreatmentIcon category={item.treatmentType?.category || null} />
        <span className="truncate">{item.treatmentType?.name || "Unknown"}</span>
        {item.visitNumber && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">V{item.visitNumber}</Badge>
        )}
      </div>
      {isManager && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-5 w-5"
          onClick={() => handleDeleteScheduleItem(item.id)}
          data-testid={`button-delete-schedule-${item.id}`}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="border-t border-border p-4">
      <div className="mb-3">
        <h4 className="font-medium text-sm text-muted-foreground">Treatment Schedule</h4>
      </div>
      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No treatments scheduled yet. Add treatments to define when they should occur.
        </p>
      ) : (
        <div className="space-y-4">
          {flexibleSchedules.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 text-amber-600 dark:text-amber-400">Flexible (Any Time)</p>
              <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="space-y-1">
                  {flexibleSchedules.map(renderScheduleItem)}
                </div>
              </div>
            </div>
          )}
          
          {Object.keys(schedulesByMonth).length > 0 && (
            <div>
              {flexibleSchedules.length > 0 && (
                <p className="text-xs font-semibold mb-2 text-muted-foreground">Monthly Schedule</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(schedulesByMonth)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([month, items]) => (
                    <div key={month} className="p-2 rounded-md bg-muted/50">
                      <p className="text-xs font-semibold mb-1">{MONTH_NAMES[Number(month) - 1]}</p>
                      <div className="space-y-1">
                        {items.map(renderScheduleItem)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const { data: treatmentPrograms } = useQuery<TreatmentProgram[]>({ queryKey: ["/api/treatment-programs"] });

  const [mowerDialogOpen, setMowerDialogOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentType | null>(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramTemplate | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<number | null>(null);
  const [addTreatmentDialogOpen, setAddTreatmentDialogOpen] = useState(false);
  const [selectedProgramForTreatment, setSelectedProgramForTreatment] = useState<number | null>(null);
  
  const [treatmentProgramDialogOpen, setTreatmentProgramDialogOpen] = useState(false);
  const [editingTreatmentProgram, setEditingTreatmentProgram] = useState<TreatmentProgram | null>(null);
  const [expandedTreatmentProgram, setExpandedTreatmentProgram] = useState<number | null>(null);
  const [addScheduleDialogOpen, setAddScheduleDialogOpen] = useState(false);
  const [selectedTreatmentProgramForSchedule, setSelectedTreatmentProgramForSchedule] = useState<number | null>(null);
  const [scheduleFormTreatmentTypeId, setScheduleFormTreatmentTypeId] = useState<string>("");
  const [scheduleFormMonth, setScheduleFormMonth] = useState<string>("");
  const [scheduleFormInstructions, setScheduleFormInstructions] = useState<string>("");
  const [scheduleFormIsFlexible, setScheduleFormIsFlexible] = useState(false);
  const [scheduleFormVisitNumber, setScheduleFormVisitNumber] = useState<string>("");
  
  const currentYear = new Date().getFullYear();
  const [programYear, setProgramYear] = useState(currentYear);
  const [programCadence, setProgramCadence] = useState<"two_week" | "four_week">("two_week");
  const [programServices, setProgramServices] = useState(24);
  const [monthlyValues, setMonthlyValues] = useState<number[]>(Array(12).fill(2));
  
  const handleAutoCalculate = () => {
    const distribution = getServicesArray({
      year: programYear,
      annualServices: programServices,
      cadence: programCadence
    });
    setMonthlyValues(distribution);
  };
  
  const monthlyTotal = monthlyValues.reduce((a, b) => a + b, 0);
  
  const openEditProgram = (program: ProgramTemplate) => {
    setEditingProgram(program);
    const months = parseServicesPerMonth(program.servicesPerMonth);
    setMonthlyValues(months);
    setProgramServices(program.servicesPerYear);
    setProgramCadence((program.defaultCadence as "two_week" | "four_week") || "two_week");
    setProgramDialogOpen(true);
  };
  
  const resetProgramForm = () => {
    setEditingProgram(null);
    setMonthlyValues(Array(12).fill(2));
    setProgramServices(24);
    setProgramCadence("two_week");
    setProgramYear(currentYear);
  };

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

  const handleSaveTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "fertilizer"),
      defaultNotes: formData.get("defaultNotes") ? String(formData.get("defaultNotes")) : null,
    };
    try {
      if (editingTreatment) {
        await apiRequest("PUT", `/api/treatment-types/${editingTreatment.id}`, data);
        toast({ title: "Treatment type updated successfully" });
      } else {
        await apiRequest("POST", "/api/treatment-types", data);
        toast({ title: "Treatment type added successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-types"] });
      setTreatmentDialogOpen(false);
      setEditingTreatment(null);
      form.reset();
    } catch (error) {
      toast({ title: editingTreatment ? "Failed to update treatment type" : "Failed to add treatment type", variant: "destructive" });
    }
  };
  
  const openEditTreatment = (treatment: TreatmentType) => {
    setEditingTreatment(treatment);
    setTreatmentDialogOpen(true);
  };

  const handleDeleteTreatmentType = async (treatmentId: number) => {
    if (!confirm("Are you sure you want to delete this treatment type? It will be removed from all programs.")) {
      return;
    }
    try {
      await apiRequest("DELETE", `/api/treatment-types/${treatmentId}`);
      toast({ title: "Treatment type deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-types"] });
    } catch (error) {
      toast({ title: "Failed to delete treatment type", variant: "destructive" });
    }
  };

  const handleSaveTreatmentProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: String(formData.get("name") || ""),
      description: formData.get("description") ? String(formData.get("description")) : null,
    };
    try {
      if (editingTreatmentProgram) {
        await apiRequest("PUT", `/api/treatment-programs/${editingTreatmentProgram.id}`, data);
        toast({ title: "Treatment program updated successfully" });
      } else {
        await apiRequest("POST", "/api/treatment-programs", data);
        toast({ title: "Treatment program created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-programs"] });
      setTreatmentProgramDialogOpen(false);
      setEditingTreatmentProgram(null);
      form.reset();
    } catch (error) {
      toast({ title: editingTreatmentProgram ? "Failed to update treatment program" : "Failed to create treatment program", variant: "destructive" });
    }
  };

  const handleAddScheduleItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTreatmentProgramForSchedule) return;
    if (!scheduleFormTreatmentTypeId) {
      toast({ title: "Please select a treatment type", variant: "destructive" });
      return;
    }
    if (!scheduleFormIsFlexible && !scheduleFormMonth) {
      toast({ title: "Please select a month or mark as flexible", variant: "destructive" });
      return;
    }
    const data = {
      treatmentTypeId: Number(scheduleFormTreatmentTypeId),
      month: scheduleFormIsFlexible ? null : Number(scheduleFormMonth),
      instructions: scheduleFormInstructions || null,
      isFlexible: scheduleFormIsFlexible,
      visitNumber: scheduleFormVisitNumber ? Number(scheduleFormVisitNumber) : null,
    };
    try {
      await apiRequest("POST", `/api/treatment-programs/${selectedTreatmentProgramForSchedule}/schedule`, data);
      toast({ title: "Treatment added to schedule" });
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-programs", selectedTreatmentProgramForSchedule] });
      setAddScheduleDialogOpen(false);
      setSelectedTreatmentProgramForSchedule(null);
      setScheduleFormTreatmentTypeId("");
      setScheduleFormMonth("");
      setScheduleFormInstructions("");
      setScheduleFormIsFlexible(false);
      setScheduleFormVisitNumber("");
    } catch (error) {
      toast({ title: "Failed to add treatment to schedule", variant: "destructive" });
    }
  };
  
  const resetTreatmentForm = () => {
    setEditingTreatment(null);
  };

  const handleSaveProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const payload = {
      name: String(formData.get("name") || ""),
      description: formData.get("description") ? String(formData.get("description")) : null,
      servicesPerYear: monthlyTotal,
      servicesPerMonth: monthlyValues,
      defaultCadence: programCadence,
    };
    
    try {
      if (editingProgram) {
        await apiRequest("PUT", `/api/program-templates/${editingProgram.id}`, payload);
        toast({ title: "Program template updated successfully" });
      } else {
        await apiRequest("POST", "/api/program-templates", payload);
        toast({ title: "Program template created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/program-templates"] });
      setProgramDialogOpen(false);
      resetProgramForm();
    } catch (error) {
      toast({ title: editingProgram ? "Failed to update program" : "Failed to create program", variant: "destructive" });
    }
  };

  // Fetch expanded program with treatments
  const { data: expandedProgramData } = useQuery<ProgramWithTreatments>({
    queryKey: ["/api/program-templates", expandedProgram],
    enabled: !!expandedProgram,
  });

  const handleAddTreatmentToProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProgramForTreatment) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await apiRequest("POST", `/api/program-templates/${selectedProgramForTreatment}/treatments`, {
        treatmentTypeId: Number(formData.get("treatmentTypeId")),
        month: Number(formData.get("month")),
        instructions: formData.get("instructions") ? String(formData.get("instructions")) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/program-templates", selectedProgramForTreatment] });
      toast({ title: "Treatment added to program" });
      setAddTreatmentDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Failed to add treatment", variant: "destructive" });
    }
  };

  const handleRemoveTreatmentFromProgram = async (treatmentId: number) => {
    try {
      await apiRequest("DELETE", `/api/program-template-treatments/${treatmentId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/program-templates", expandedProgram] });
      toast({ title: "Treatment removed from program" });
    } catch (error) {
      toast({ title: "Failed to remove treatment", variant: "destructive" });
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
                    <Dialog open={treatmentDialogOpen} onOpenChange={(open) => {
                      setTreatmentDialogOpen(open);
                      if (!open) resetTreatmentForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-treatment">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Treatment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingTreatment ? "Edit Treatment Type" : "Add Treatment Type"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveTreatment} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="treatment-name">Name</Label>
                            <Input 
                              id="treatment-name" 
                              name="name" 
                              required 
                              defaultValue={editingTreatment?.name || ""}
                              key={editingTreatment?.id || "new"}
                              data-testid="input-treatment-name" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="treatment-category">Category</Label>
                            <Select name="category" defaultValue={editingTreatment?.category || "fertilizer"} key={`cat-${editingTreatment?.id || "new"}`}>
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
                            <Textarea 
                              id="treatment-notes" 
                              name="defaultNotes" 
                              defaultValue={editingTreatment?.defaultNotes || ""}
                              key={`notes-${editingTreatment?.id || "new"}`}
                              data-testid="input-treatment-notes" 
                            />
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-treatment">
                            {editingTreatment ? "Save Changes" : "Add Treatment"}
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
                      <div className="flex items-center gap-2">
                        {isManager && (
                          <>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => openEditTreatment(treatment)}
                              data-testid={`button-edit-treatment-${treatment.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleDeleteTreatmentType(treatment.id)}
                              data-testid={`button-delete-treatment-${treatment.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Badge variant="outline">{treatment.category}</Badge>
                      </div>
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

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle>Treatment Programs</CardTitle>
                  </div>
                  {isManager && (
                    <Dialog open={treatmentProgramDialogOpen} onOpenChange={(open) => {
                      setTreatmentProgramDialogOpen(open);
                      if (!open) setEditingTreatmentProgram(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-treatment-program">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Program
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingTreatmentProgram ? "Edit Treatment Program" : "Create Treatment Program"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveTreatmentProgram} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="treatment-program-name">Name</Label>
                            <Input 
                              id="treatment-program-name" 
                              name="name" 
                              required 
                              defaultValue={editingTreatmentProgram?.name || ""}
                              key={editingTreatmentProgram?.id || "new"}
                              data-testid="input-treatment-program-name" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="treatment-program-description">Description</Label>
                            <Textarea 
                              id="treatment-program-description" 
                              name="description" 
                              defaultValue={editingTreatmentProgram?.description || ""}
                              key={`desc-${editingTreatmentProgram?.id || "new"}`}
                              data-testid="input-treatment-program-description" 
                            />
                          </div>
                          <Button type="submit" className="w-full" data-testid="button-submit-treatment-program">
                            {editingTreatmentProgram ? "Save Changes" : "Create Program"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <CardDescription>
                  Define treatment schedules that specify which treatments occur in which months. Assign these to jobs to auto-populate treatment checklists.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {treatmentPrograms?.map(program => (
                    <div
                      key={program.id}
                      className="rounded-lg border border-border"
                      data-testid={`treatment-program-row-${program.id}`}
                    >
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover-elevate rounded-lg"
                        onClick={() => setExpandedTreatmentProgram(expandedTreatmentProgram === program.id ? null : program.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{program.name}</p>
                            <p className="text-sm text-muted-foreground">{program.description || "No description"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isManager && (
                            <>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTreatmentProgramForSchedule(program.id);
                                  setAddScheduleDialogOpen(true);
                                }}
                                data-testid={`button-add-schedule-${program.id}`}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Treatment
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTreatmentProgram(program);
                                  setTreatmentProgramDialogOpen(true);
                                }}
                                data-testid={`button-edit-treatment-program-${program.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Badge variant={program.isActive ? "default" : "outline"}>
                            {program.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTreatmentProgram(expandedTreatmentProgram === program.id ? null : program.id);
                            }}
                            data-testid={`button-expand-treatment-program-${program.id}`}
                          >
                            {expandedTreatmentProgram === program.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedTreatmentProgram === program.id && (
                        <TreatmentProgramScheduleSection
                          programId={program.id}
                          treatmentTypes={treatmentTypes || []}
                          isManager={isManager}
                        />
                      )}
                    </div>
                  ))}
                  {(!treatmentPrograms || treatmentPrograms.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No treatment programs defined. Create one to schedule treatments across months.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={addScheduleDialogOpen} onOpenChange={setAddScheduleDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Treatment to Schedule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddScheduleItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-treatment-type">Treatment Type</Label>
                    <Select value={scheduleFormTreatmentTypeId} onValueChange={setScheduleFormTreatmentTypeId}>
                      <SelectTrigger data-testid="select-schedule-treatment-type">
                        <SelectValue placeholder="Select treatment" />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentTypes?.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50">
                    <div>
                      <Label htmlFor="schedule-flexible">Flexible (Any Time)</Label>
                      <p className="text-xs text-muted-foreground">Treatment can be done at any visit during the season</p>
                    </div>
                    <Switch
                      id="schedule-flexible"
                      checked={scheduleFormIsFlexible}
                      onCheckedChange={(checked) => {
                        setScheduleFormIsFlexible(checked);
                        if (checked) setScheduleFormMonth("");
                      }}
                      data-testid="switch-schedule-flexible"
                    />
                  </div>
                  
                  {!scheduleFormIsFlexible && (
                    <div className="space-y-2">
                      <Label htmlFor="schedule-month">Month</Label>
                      <Select value={scheduleFormMonth} onValueChange={setScheduleFormMonth}>
                        <SelectTrigger data-testid="select-schedule-month">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((m, idx) => (
                            <SelectItem key={idx + 1} value={String(idx + 1)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="schedule-visit-number">Visit Number (optional)</Label>
                    <Select value={scheduleFormVisitNumber} onValueChange={setScheduleFormVisitNumber}>
                      <SelectTrigger data-testid="select-schedule-visit-number">
                        <SelectValue placeholder="Any visit" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map(v => (
                          <SelectItem key={v} value={String(v)}>Visit {v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Group treatments by visit number for efficient scheduling</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="schedule-instructions">Instructions (optional)</Label>
                    <Textarea 
                      id="schedule-instructions" 
                      value={scheduleFormInstructions}
                      onChange={(e) => setScheduleFormInstructions(e.target.value)}
                      data-testid="input-schedule-instructions" 
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-submit-schedule-item">
                    Add to Schedule
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                    <Dialog open={programDialogOpen} onOpenChange={(open) => {
                      setProgramDialogOpen(open);
                      if (!open) resetProgramForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-program">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Program
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{editingProgram ? "Edit Program Template" : "Create Program Template"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveProgram} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="program-name">Name</Label>
                              <Input 
                                id="program-name" 
                                name="name" 
                                required 
                                defaultValue={editingProgram?.name || ""}
                                data-testid="input-program-name" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="program-services">Total Services/Year</Label>
                              <Select 
                                value={String(programServices)} 
                                onValueChange={(v) => setProgramServices(Number(v))}
                              >
                                <SelectTrigger data-testid="select-program-services">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="22">22 services (Essentials)</SelectItem>
                                  <SelectItem value="24">24 services (Elite)</SelectItem>
                                  <SelectItem value="26">26 services (Prestige)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="program-desc">Description</Label>
                            <Textarea 
                              id="program-desc" 
                              name="description" 
                              defaultValue={editingProgram?.description || ""}
                              data-testid="input-program-description" 
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Year</Label>
                              <Select value={String(programYear)} onValueChange={(v) => setProgramYear(Number(v))}>
                                <SelectTrigger data-testid="select-program-year">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[currentYear, currentYear + 1, currentYear + 2].map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Cadence</Label>
                              <Select value={programCadence} onValueChange={(v) => setProgramCadence(v as "two_week" | "four_week")}>
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
                              <Label>&nbsp;</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full"
                                onClick={handleAutoCalculate}
                                data-testid="button-auto-calculate"
                              >
                                <Calculator className="w-4 h-4 mr-1" />
                                Auto Calculate
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Services Per Month</Label>
                              <Badge variant={monthlyTotal === programServices ? "default" : "destructive"}>
                                Total: {monthlyTotal} / {programServices}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => (
                                <div key={month} className="text-center">
                                  <Label className="text-xs text-muted-foreground">{month}</Label>
                                  <Input
                                    type="number"
                                    value={monthlyValues[i]}
                                    onChange={(e) => {
                                      const newValues = [...monthlyValues];
                                      newValues[i] = Number(e.target.value) || 0;
                                      setMonthlyValues(newValues);
                                    }}
                                    min="0"
                                    max="5"
                                    className="text-center"
                                    data-testid={`input-month-${i}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={monthlyTotal !== programServices}
                            data-testid="button-submit-program"
                          >
                            {editingProgram ? "Update Program" : "Create Program"}
                          </Button>
                          {monthlyTotal !== programServices && (
                            <p className="text-sm text-destructive text-center">
                              Monthly services must add up to {programServices}. Currently: {monthlyTotal}
                            </p>
                          )}
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
                    const isExpanded = expandedProgram === program.id;
                    const treatmentsData = isExpanded ? expandedProgramData?.treatments || [] : [];
                    
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
                          <div className="flex items-center gap-2">
                            <Badge>{program.servicesPerYear} services/year</Badge>
                            {isManager && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => openEditProgram(program)}
                                data-testid={`button-edit-program-${program.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setExpandedProgram(isExpanded ? null : program.id)}
                              data-testid={`button-expand-program-${program.id}`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
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
                        
                        {isExpanded && (
                          <div className="pt-3 border-t space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium text-sm">Linked Treatments</p>
                              {isManager && (
                                <Dialog open={addTreatmentDialogOpen && selectedProgramForTreatment === program.id} onOpenChange={(open) => {
                                  setAddTreatmentDialogOpen(open);
                                  if (open) setSelectedProgramForTreatment(program.id);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" data-testid={`button-add-program-treatment-${program.id}`}>
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Treatment
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Treatment to {program.name}</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddTreatmentToProgram} className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="treatment-type">Treatment</Label>
                                        <Select name="treatmentTypeId" required>
                                          <SelectTrigger data-testid="select-program-treatment-type">
                                            <SelectValue placeholder="Select treatment" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {treatmentTypes?.map(t => (
                                              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="treatment-month">Month</Label>
                                        <Select name="month" required>
                                          <SelectTrigger data-testid="select-program-treatment-month">
                                            <SelectValue placeholder="Select month" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {monthNames.map((m, i) => (
                                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="treatment-instructions">Instructions (optional)</Label>
                                        <Textarea name="instructions" data-testid="input-program-treatment-instructions" />
                                      </div>
                                      <Button type="submit" className="w-full" data-testid="button-submit-program-treatment">
                                        Add Treatment
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                            
                            {treatmentsData.length > 0 ? (
                              <div className="space-y-2">
                                {treatmentsData.map(pt => (
                                  <div 
                                    key={pt.id} 
                                    className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50"
                                    data-testid={`program-treatment-${pt.id}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <TreatmentIcon category={pt.treatmentType?.category || null} />
                                      <div>
                                        <p className="text-sm font-medium">{pt.treatmentType?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {monthNames[pt.month - 1]}
                                          {pt.instructions && ` - ${pt.instructions}`}
                                        </p>
                                      </div>
                                    </div>
                                    {isManager && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost"
                                        onClick={() => handleRemoveTreatmentFromProgram(pt.id)}
                                        data-testid={`button-remove-program-treatment-${pt.id}`}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No treatments linked to this program.
                              </p>
                            )}
                          </div>
                        )}
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

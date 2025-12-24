import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useStaff, useCurrentStaff } from "@/hooks/use-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { STAFF_ROLES, type Staff } from "@shared/schema";
import { Users, Shield, Save } from "lucide-react";

export default function Settings() {
  const { data: staffList, isLoading } = useStaff();
  const { canViewMoney, role: currentRole } = useCurrentStaff();
  const { toast } = useToast();
  const [editingStaff, setEditingStaff] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

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

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your team and application settings</p>
        </div>

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
                <p className="text-sm text-muted-foreground">Full access to all features including financial data, role management, and settings</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Manager</p>
                <p className="text-sm text-muted-foreground">Access to financial data, can manage staff roles, view all reports</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Team Leader</p>
                <p className="text-sm text-muted-foreground">Can view financial data for their team, manage job runs and schedules</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Staff</p>
                <p className="text-sm text-muted-foreground">Can view and update assigned jobs, limited access to scheduling</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Crew Member</p>
                <p className="text-sm text-muted-foreground">Basic access to view their assigned work, cannot see financial data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

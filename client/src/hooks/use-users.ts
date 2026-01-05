import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";
import { canViewMoney, canViewGateCode } from "@shared/schema";

export function useStaff() {
  return useQuery({
    queryKey: [api.staff.list.path],
    queryFn: async () => {
      const res = await fetch(api.staff.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return api.staff.list.responses[200].parse(await res.json());
    },
  });
}

// Get current user's staff record by matching user ID
export function useCurrentStaff() {
  const { user } = useAuth();
  const { data: staffList } = useStaff();
  
  const currentStaff = staffList?.find(s => s.userId === user?.id) || null;
  
  return {
    staff: currentStaff,
    role: currentStaff?.role || null,
    canViewMoney: canViewMoney(currentStaff?.role),
    canViewGateCode: canViewGateCode(currentStaff?.role),
  };
}

// Keep this for backward compatibility if needed
export function useUsers() {
  return useStaff();
}

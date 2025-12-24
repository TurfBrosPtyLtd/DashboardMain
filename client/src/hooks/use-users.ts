import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

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

// Keep this for backward compatibility if needed
export function useUsers() {
  return useStaff();
}

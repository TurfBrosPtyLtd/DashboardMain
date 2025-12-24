import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { format } from "date-fns";

export function useCrews(date?: Date) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  return useQuery({
    queryKey: [api.crews.list.path, dateStr],
    queryFn: async () => {
      const url = dateStr ? `${api.crews.list.path}?date=${dateStr}` : api.crews.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch crews");
      return api.crews.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crew: any) => {
      const res = await fetch(api.crews.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crew),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create crew");
      return api.crews.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.crews.list.path] });
    },
  });
}

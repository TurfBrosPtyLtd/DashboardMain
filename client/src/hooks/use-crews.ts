import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Crew } from "@shared/schema";

export function useCrews() {
  return useQuery<Crew[]>({
    queryKey: [api.crews.list.path],
    queryFn: async () => {
      const res = await fetch(api.crews.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch crews");
      return api.crews.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crew: { name: string }) => {
      const res = await fetch(api.crews.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crew),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create crew");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.crews.list.path] });
    },
  });
}

export function useDeleteCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/crews/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete crew");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.crews.list.path] });
    },
  });
}

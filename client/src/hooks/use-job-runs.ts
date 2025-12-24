import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { format } from "date-fns";
import type { JobRun } from "@shared/schema";

export function useJobRuns(date?: Date) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  return useQuery<JobRun[]>({
    queryKey: [api.jobRuns.list.path, dateStr],
    queryFn: async () => {
      const url = dateStr ? `${api.jobRuns.list.path}?date=${dateStr}` : api.jobRuns.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch job runs");
      return api.jobRuns.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateJobRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobRun: { name: string; date: string; crewName?: string }) => {
      const res = await fetch(api.jobRuns.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobRun),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create job run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobRuns.list.path] });
    },
  });
}

export function useUpdateJobRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name?: string; crewName?: string }) => {
      const res = await fetch(`/api/job-runs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update job run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobRuns.list.path] });
    },
  });
}

export function useDeleteJobRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/job-runs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete job run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobRuns.list.path] });
    },
  });
}

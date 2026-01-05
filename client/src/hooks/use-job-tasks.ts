import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { JobTask } from "@shared/schema";

export function useJobTasks(jobId: number | null) {
  return useQuery<JobTask[]>({
    queryKey: ["/api/jobs", jobId, "tasks"],
    queryFn: async () => {
      if (!jobId) return [];
      const res = await fetch(`/api/jobs/${jobId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useCreateJobTask() {
  return useMutation({
    mutationFn: async ({ jobId, description }: { jobId: number; description: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/tasks`, { description });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "tasks"] });
    },
  });
}

export function useDeleteJobTask() {
  return useMutation({
    mutationFn: async ({ taskId, jobId }: { taskId: number; jobId: number }) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
      return { jobId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "tasks"] });
    },
  });
}

export function useToggleJobTask() {
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      jobId, 
      isCompleted,
      completedById
    }: { 
      taskId: number; 
      jobId: number; 
      isCompleted: boolean;
      completedById?: number | null;
    }) => {
      const updates: Partial<JobTask> = { 
        isCompleted,
        completedById: isCompleted ? completedById : null,
        completedAt: isCompleted ? new Date() : null
      };
      const res = await apiRequest("PUT", `/api/tasks/${taskId}`, updates);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "tasks"] });
    },
  });
}

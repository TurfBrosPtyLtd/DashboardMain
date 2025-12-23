import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertApplication } from "@shared/routes";

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertApplication) => {
      const res = await fetch(api.applications.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add application");
      return api.applications.create.responses[201].parse(await res.json());
    },
    onSuccess: (_data, variables) => {
      // Invalidate the job details since applications are part of the job view
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId] });
    },
  });
}

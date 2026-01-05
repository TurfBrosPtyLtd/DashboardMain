import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobTimeEntry, Staff } from "@shared/schema";

type TimeEntryWithStaff = JobTimeEntry & { staff: Staff };

export function useJobTimeEntries(jobId: number | null) {
  return useQuery<TimeEntryWithStaff[]>({
    queryKey: ["/api/jobs", jobId, "time-entries"],
    enabled: !!jobId
  });
}

export function useStartTimer() {
  return useMutation({
    mutationFn: async ({ jobId, entryType, crewId, notes }: { 
      jobId: number; 
      entryType: "self" | "crew"; 
      crewId?: number;
      notes?: string;
    }) => {
      return apiRequest("POST", `/api/jobs/${jobId}/time-entries/start`, {
        entryType,
        crewId: crewId || null,
        notes: notes || null
      });
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "time-entries"] });
    }
  });
}

export function useStopTimer() {
  return useMutation({
    mutationFn: async ({ entryId, jobId }: { entryId: number; jobId: number }) => {
      return apiRequest("POST", `/api/time-entries/${entryId}/stop`);
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "time-entries"] });
    }
  });
}

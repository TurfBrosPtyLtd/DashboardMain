import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { JobPhoto } from "@shared/schema";

export function useJobPhotos(jobId: number | null) {
  return useQuery<JobPhoto[]>({
    queryKey: ["/api/jobs", jobId, "photos"],
    queryFn: async () => {
      if (!jobId) return [];
      const res = await fetch(`/api/jobs/${jobId}/photos`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useCreateJobPhoto() {
  return useMutation({
    mutationFn: async ({ 
      jobId, 
      url, 
      photoType,
      filename,
      caption,
      takenAt
    }: { 
      jobId: number; 
      url: string; 
      photoType: "before" | "during" | "after";
      filename: string;
      caption?: string;
      takenAt?: string;
    }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/photos`, { 
        url, 
        photoType,
        filename,
        caption,
        takenAt
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "photos"] });
    },
  });
}

export function useDeleteJobPhoto() {
  return useMutation({
    mutationFn: async ({ photoId, jobId }: { photoId: number; jobId: number }) => {
      await apiRequest("DELETE", `/api/photos/${photoId}`);
      return { jobId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "photos"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Crew, CrewMember, Staff } from "@shared/schema";

export type CrewWithMembers = Crew & { members: (CrewMember & { staff: Staff })[] };

const crewMemberWithStaffSchema = z.object({
  id: z.number(),
  crewId: z.number(),
  staffId: z.number(),
  staff: z.object({
    id: z.number(),
    userId: z.string().nullable(),
    name: z.string(),
    phone: z.string().nullable(),
    role: z.string(),
  }),
});

const crewWithMembersSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.union([z.string(), z.date(), z.null()]),
  members: z.array(crewMemberWithStaffSchema),
});

const crewsListResponseSchema = z.array(crewWithMembersSchema);

export function useCrews() {
  return useQuery<CrewWithMembers[]>({
    queryKey: [api.crews.list.path],
    queryFn: async () => {
      const res = await fetch(api.crews.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch crews");
      const data = await res.json();
      const parsed = crewsListResponseSchema.parse(data);
      return parsed.map(crew => ({
        ...crew,
        createdAt: crew.createdAt ? new Date(crew.createdAt as string) : null,
      })) as CrewWithMembers[];
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

export function useUpdateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/crews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update crew");
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

export function useAddCrewMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ crewId, staffId }: { crewId: number; staffId: number }) => {
      const res = await fetch(`/api/crews/${crewId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add crew member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.crews.list.path] });
    },
  });
}

export function useRemoveCrewMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ crewId, staffId }: { crewId: number; staffId: number }) => {
      const res = await fetch(`/api/crews/${crewId}/members/${staffId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove crew member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.crews.list.path] });
    },
  });
}

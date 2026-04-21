import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";

export const usePendingEntries = () =>
  useQuery({
    queryKey: ["pending-entries"],
    queryFn: async () => {
      const { data } = await api.get("/ingest/pending");
      return data;
    },
  });

export const useIngestText = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rawText: string) => {
      const form = new FormData();
      form.append("raw_text", rawText);
      return api.post("/ingest/text", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-entries"] }),
  });
};

export const useIngestImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post("/ingest/image", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-entries"] }),
  });
};

export const useDeleteEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.delete(`/ingest/${id}`, { data: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-entries"] }),
  });
};

export const useReportEntry = () =>
  useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/ingest/${id}/report`, { reason }),
  });

export const useReports = () =>
  useQuery({
    queryKey: ["data-reports"],
    queryFn: async () => {
      const { data } = await api.get("/ingest/reports");
      return data;
    },
  });

export const useReviewReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      api.patch(`/ingest/reports/${id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-reports"] }),
  });
};

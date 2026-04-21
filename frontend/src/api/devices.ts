import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";

export const useDevices = (tier?: string) =>
  useQuery({
    queryKey: ["devices", tier],
    queryFn: async () => {
      const { data } = await api.get("/devices", { params: tier ? { tier } : {} });
      return data;
    },
  });

export const useDeviceAlerts = () =>
  useQuery({
    queryKey: ["device-alerts"],
    queryFn: async () => {
      const { data } = await api.get("/devices/alerts");
      return data.data;
    },
  });

export const useCreateDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/devices", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
};

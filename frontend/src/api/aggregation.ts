import { useQuery } from "@tanstack/react-query";
import api from "./client";

export const useLatestAggregation = () =>
  useQuery({
    queryKey: ["aggregation-latest"],
    queryFn: async () => {
      const { data } = await api.get("/aggregation/latest");
      return data;
    },
    refetchInterval: 60_000,
  });

export const useRegionAggregation = (level: string, aggDate?: string) =>
  useQuery({
    queryKey: ["aggregation-region", level, aggDate],
    queryFn: async () => {
      const { data } = await api.get(`/aggregation/region/${level}`, {
        params: aggDate ? { agg_date: aggDate } : {},
      });
      return data;
    },
  });

export const useDeviceAggregation = (deviceId: number) =>
  useQuery({
    queryKey: ["aggregation-device", deviceId],
    queryFn: async () => {
      const { data } = await api.get(`/aggregation/device/${deviceId}`);
      return data;
    },
    enabled: !!deviceId,
  });

export const useAggregationHistory = (startDate: string, endDate: string, carrier?: string) =>
  useQuery({
    queryKey: ["aggregation-history", startDate, endDate, carrier],
    queryFn: async () => {
      const { data } = await api.get("/aggregation/history", {
        params: { start_date: startDate, end_date: endDate, ...(carrier ? { carrier } : {}) },
      });
      return data;
    },
  });

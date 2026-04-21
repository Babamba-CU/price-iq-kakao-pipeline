import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/client";
import AgentChat from "../components/AgentChat";

export default function CompetitionAnalysis() {
  const [currentReport, setCurrentReport] = useState<string | null>(null);

  const { data: reports, refetch } = useQuery({
    queryKey: ["agent-reports"],
    queryFn: async () => {
      const { data } = await api.get("/agent/reports");
      return data.data as any[];
    },
  });

  const analyze = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/agent/analyze");
      return data.data;
    },
    onSuccess: (result) => {
      setCurrentReport(result.report);
      refetch();
    },
  });

  const displayReport = currentReport ?? reports?.[0]?.report;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">AI 경쟁 분석</h1>
        <button
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {analyze.isPending ? "분석 중..." : "분석 실행"}
        </button>
      </div>

      {reports && reports.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {reports.map((r: any) => (
            <button
              key={r.id}
              onClick={() => setCurrentReport(r.report)}
              className="px-3 py-1 bg-gray-100 rounded-full text-xs whitespace-nowrap hover:bg-blue-100"
            >
              {r.agg_date} R{r.agg_round}
            </button>
          ))}
        </div>
      )}

      {displayReport ? (
        <AgentChat report={displayReport} isLoading={analyze.isPending} />
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <p>분석 실행 버튼을 클릭하여 AI 경쟁 분석을 시작하세요.</p>
        </div>
      )}
    </div>
  );
}

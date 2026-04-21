import { useState } from "react";
import { useDevices, useDeviceAlerts } from "../api/devices";
import { useDeviceAggregation } from "../api/aggregation";
import CarrierCompareChart from "../components/CarrierCompareChart";
import AlertBanner from "../components/AlertBanner";

const TIERS = [
  { key: undefined, label: "전체" },
  { key: "premium", label: "프리미엄" },
  { key: "high", label: "고가" },
  { key: "mid", label: "중가" },
  { key: "low", label: "저가" },
];

export default function DeviceDashboard() {
  const [tier, setTier] = useState<string | undefined>(undefined);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const { data: devices } = useDevices(tier);
  const { data: alerts } = useDeviceAlerts();
  const { data: aggData } = useDeviceAggregation(selectedDevice ?? 0);

  const chartData = selectedDevice && aggData
    ? ["SKT", "KT", "LGU"].map((carrier) => {
        const rows = (aggData as any[]).filter((r: any) => r.carrier === carrier);
        const row = rows[0];
        return { carrier, avg_price: row?.avg_price ?? 0, top30_price: row?.top30_price ?? 0, max_price: row?.max_price ?? 0 };
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">단말별 대시보드</h1>

      {alerts && (alerts as any[]).length > 0 && (
        <AlertBanner type="error" message={`출고가 하회 단말 ${(alerts as any[]).length}건 발생`} />
      )}

      <div className="flex gap-2">
        {TIERS.map((t) => (
          <button
            key={String(t.key)}
            onClick={() => setTier(t.key)}
            className={`px-3 py-1 rounded-full text-sm ${tier === t.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h2 className="font-semibold mb-3 text-gray-700">단말 목록</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(devices as any[] | undefined)?.map((d: any) => (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${selectedDevice === d.id ? "bg-blue-50 border border-blue-300" : "hover:bg-gray-50"}`}
              >
                <span className="font-medium">{d.device_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{d.tier}</span>
                  <span className="text-xs font-mono">{d.release_price?.toLocaleString()}원</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h2 className="font-semibold mb-3 text-gray-700">
            {selectedDevice ? "3사 단가 비교" : "단말을 선택하세요"}
          </h2>
          {selectedDevice && chartData.some((d) => d.avg_price > 0) ? (
            <CarrierCompareChart data={chartData} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-16">선택된 단말의 집계 데이터가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

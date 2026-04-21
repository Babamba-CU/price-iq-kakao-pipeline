import { useState } from "react";
import { useDevices, useCreateDevice } from "../api/devices";

export default function AdminPage() {
  const { data: devices, refetch } = useDevices();
  const createDevice = useCreateDevice();
  const [form, setForm] = useState({ device_name: "", release_price: "", aliases: "" });

  const handleCreate = async () => {
    if (!form.device_name || !form.release_price) return;
    await createDevice.mutateAsync({
      device_name: form.device_name,
      release_price: parseInt(form.release_price),
      aliases: form.aliases ? form.aliases.split(",").map((s) => s.trim()) : [],
    });
    setForm({ device_name: "", release_price: "", aliases: "" });
    refetch();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">관리자</h1>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="font-semibold mb-4">단말 등록</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">단말명</label>
            <input
              value={form.device_name}
              onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="예: 아이폰17프로"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">출고가 (원)</label>
            <input
              type="number"
              value={form.release_price}
              onChange={(e) => setForm({ ...form, release_price: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="예: 1550000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">별칭 (콤마 구분)</label>
            <input
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="예: iPhone17Pro, 17pro"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={createDevice.isPending}
          className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          등록
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="font-semibold mb-4">단말 목록</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border text-left">단말명</th>
              <th className="px-3 py-2 border text-left">등급</th>
              <th className="px-3 py-2 border text-right">출고가</th>
              <th className="px-3 py-2 border text-left">별칭</th>
              <th className="px-3 py-2 border text-center">활성</th>
            </tr>
          </thead>
          <tbody>
            {(devices as any[] | undefined)?.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 border font-medium">{d.device_name}</td>
                <td className="px-3 py-2 border text-gray-500">{d.tier}</td>
                <td className="px-3 py-2 border text-right font-mono">{d.release_price?.toLocaleString()}원</td>
                <td className="px-3 py-2 border text-gray-400 text-xs">{(d.aliases as string[] | null)?.join(", ") ?? "-"}</td>
                <td className="px-3 py-2 border text-center">{d.is_active ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

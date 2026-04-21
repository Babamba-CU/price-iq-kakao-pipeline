import { useState } from "react";
import { usePendingEntries, useIngestText, useIngestImage, useDeleteEntry, useReportEntry, useReports, useReviewReport } from "../api/ingest";
import PriceTable from "../components/PriceTable";

type Tab = "upload" | "pending" | "reports";

export default function IngestPage() {
  const [tab, setTab] = useState<Tab>("upload");
  const [text, setText] = useState("");
  const [reasonModal, setReasonModal] = useState<{ type: "delete" | "report"; id: number } | null>(null);
  const [reason, setReason] = useState("");

  const { data: pending } = usePendingEntries();
  const { data: reports } = useReports();
  const ingestText = useIngestText();
  const ingestImage = useIngestImage();
  const deleteEntry = useDeleteEntry();
  const reportEntry = useReportEntry();
  const reviewReport = useReviewReport();

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    await ingestText.mutateAsync(text);
    setText("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await ingestImage.mutateAsync(file);
  };

  const handleReasonSubmit = async () => {
    if (!reasonModal) return;
    if (reasonModal.type === "delete") {
      await deleteEntry.mutateAsync({ id: reasonModal.id, reason });
    } else {
      await reportEntry.mutateAsync({ id: reasonModal.id, reason });
    }
    setReasonModal(null);
    setReason("");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">단가 수집 관리</h1>

      <div className="flex gap-2">
        {(["upload", "pending", "reports"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {t === "upload" ? "업로드" : t === "pending" ? "검토 대기" : "신고 현황"}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold mb-3">텍스트 입력</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="단가 정보를 붙여넣으세요..."
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleTextSubmit}
              disabled={ingestText.isPending}
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {ingestText.isPending ? "파싱 중..." : "파싱 및 저장"}
            </button>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold mb-3">이미지 업로드</h2>
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
              <span className="text-gray-400 text-sm">클릭하여 이미지 선택</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {ingestImage.isPending && <p className="mt-2 text-blue-500 text-sm text-center">이미지 파싱 중...</p>}
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h2 className="font-semibold mb-3">검토 필요 데이터</h2>
          <PriceTable
            data={(pending as any[]) ?? []}
            onDelete={(id) => setReasonModal({ type: "delete", id })}
            onReport={(id) => setReasonModal({ type: "report", id })}
          />
        </div>
      )}

      {tab === "reports" && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h2 className="font-semibold mb-3">신고 목록</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border text-left">ID</th>
                <th className="px-3 py-2 border text-left">사유</th>
                <th className="px-3 py-2 border text-left">상태</th>
                <th className="px-3 py-2 border text-left">신고일</th>
                <th className="px-3 py-2 border text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {(reports as any[] | undefined)?.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border">{r.price_entry_id}</td>
                  <td className="px-3 py-2 border">{r.report_reason}</td>
                  <td className="px-3 py-2 border">{r.status}</td>
                  <td className="px-3 py-2 border text-gray-500">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-3 py-2 border text-center space-x-1">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => reviewReport.mutate({ id: r.id, action: "approve_delete" })} className="text-xs text-red-500 hover:underline">삭제승인</button>
                        <button onClick={() => reviewReport.mutate({ id: r.id, action: "reject" })} className="text-xs text-gray-500 hover:underline">기각</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reasonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-bold mb-3">{reasonModal.type === "delete" ? "삭제 사유" : "신고 사유"} 입력</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="사유를 입력하세요 (필수)"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReasonSubmit} disabled={!reason.trim()} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">확인</button>
              <button onClick={() => { setReasonModal(null); setReason(""); }} className="flex-1 bg-gray-100 py-2 rounded-lg text-sm">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

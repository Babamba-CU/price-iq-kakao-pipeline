interface PriceRow {
  id: number;
  carrier: string;
  device_name: string | null;
  sub_type: string;
  support_type: string;
  plan_condition: string | null;
  price: number;
  region_sido: string | null;
  collected_at: string;
  is_valid: boolean;
}

interface Props {
  data: PriceRow[];
  onDelete?: (id: number) => void;
  onReport?: (id: number) => void;
}

export default function PriceTable({ data, onDelete, onReport }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="px-3 py-2 text-left border">이통사</th>
            <th className="px-3 py-2 text-left border">단말</th>
            <th className="px-3 py-2 text-left border">가입유형</th>
            <th className="px-3 py-2 text-left border">지원유형</th>
            <th className="px-3 py-2 text-right border">단가</th>
            <th className="px-3 py-2 text-left border">지역</th>
            <th className="px-3 py-2 text-left border">수집일시</th>
            <th className="px-3 py-2 text-center border">상태</th>
            <th className="px-3 py-2 text-center border">액션</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 border-b">
              <td className="px-3 py-2 border font-medium">{row.carrier}</td>
              <td className="px-3 py-2 border">{row.device_name ?? "-"}</td>
              <td className="px-3 py-2 border">{row.sub_type}</td>
              <td className="px-3 py-2 border">{row.support_type}</td>
              <td className="px-3 py-2 border text-right font-mono">{row.price.toLocaleString()}원</td>
              <td className="px-3 py-2 border">{row.region_sido ?? "-"}</td>
              <td className="px-3 py-2 border text-gray-500">{new Date(row.collected_at).toLocaleString("ko-KR")}</td>
              <td className="px-3 py-2 border text-center">
                {row.is_valid ? (
                  <span className="text-green-600 text-xs">유효</span>
                ) : (
                  <span className="text-red-500 text-xs">검토필요</span>
                )}
              </td>
              <td className="px-3 py-2 border text-center space-x-1">
                {onDelete && (
                  <button
                    onClick={() => onDelete(row.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                )}
                {onReport && (
                  <button
                    onClick={() => onReport(row.id)}
                    className="text-xs text-orange-500 hover:underline"
                  >
                    신고
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

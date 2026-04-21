import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: { carrier: string; avg_price: number; top30_price: number; max_price: number }[];
}

export default function CarrierCompareChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="carrier" />
        <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
        <Tooltip formatter={(v: number) => `${v.toLocaleString()}원`} />
        <Legend />
        <Bar dataKey="avg_price" name="평균단가" fill="#6366f1" />
        <Bar dataKey="top30_price" name="상위30%" fill="#f59e0b" />
        <Bar dataKey="max_price" name="최대단가" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}

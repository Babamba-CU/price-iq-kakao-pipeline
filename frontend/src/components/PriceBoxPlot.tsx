import { useState } from "react";

const CARRIER_COLORS: Record<string, string> = {
  SKT: "#e8003d",
  KT: "#f03f13",
  LGU: "#a100ff",
};

export interface DeviceBoxData {
  deviceId: number;
  deviceName: string;
  carriers: Partial<Record<string, { avg: number; top30: number; max: number }>>;
}

interface Props {
  data: DeviceBoxData[];
  selectedCarriers: string[];
  height?: number;
}

const MARGIN = { top: 30, right: 20, bottom: 90, left: 72 };
const BOX_W = 18;
const BOX_GAP = 5;
const GROUP_PAD = 16;

export default function PriceBoxPlot({ data, selectedCarriers, height = 420 }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    deviceName: string; carrier: string;
    avg: number; top30: number; max: number;
  } | null>(null);

  const carriers = selectedCarriers.filter((c) => Object.keys(CARRIER_COLORS).includes(c));
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const groupW = carriers.length * (BOX_W + BOX_GAP) - BOX_GAP + GROUP_PAD * 2;
  const totalW = data.length * groupW + MARGIN.left + MARGIN.right;

  const allPrices = data.flatMap((d) =>
    carriers.flatMap((c) => {
      const v = d.carriers[c];
      return v ? [v.avg, v.top30, v.max] : [];
    })
  );
  const priceMin = allPrices.length ? Math.min(...allPrices) * 0.92 : 0;
  const priceMax = allPrices.length ? Math.max(...allPrices) * 1.05 : 1_500_000;

  const py = (price: number) =>
    innerH - ((price - priceMin) / (priceMax - priceMin)) * innerH;

  const fmt = (p: number) => `${(p / 10000).toFixed(1)}만`;
  const fmtFull = (p: number) => `${p.toLocaleString()}원`;

  const yTicks = Array.from({ length: 6 }, (_, i) => priceMin + ((priceMax - priceMin) * i) / 5);

  return (
    <div className="relative overflow-x-auto select-none">
      <svg width={totalW} height={height} style={{ fontFamily: "sans-serif" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid + Y axis */}
          {yTicks.map((v, i) => (
            <g key={i} transform={`translate(0,${py(v)})`}>
              <line x1={0} x2={totalW - MARGIN.left - MARGIN.right} stroke="#f0f0f0" strokeWidth={1} />
              <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill="#9ca3af">
                {fmt(v)}
              </text>
            </g>
          ))}

          {/* Box plots per device */}
          {data.map((device, di) => {
            const gx = di * groupW + GROUP_PAD;
            return (
              <g key={device.deviceId} transform={`translate(${gx},0)`}>
                {/* Device label (rotated) */}
                <text
                  transform={`translate(${(carriers.length * (BOX_W + BOX_GAP)) / 2}, ${innerH + 14}) rotate(-35)`}
                  textAnchor="end"
                  fontSize={10}
                  fill="#374151"
                >
                  {device.deviceName.length > 10 ? device.deviceName.slice(0, 10) + "…" : device.deviceName}
                </text>

                {carriers.map((carrier, ci) => {
                  const vals = device.carriers[carrier];
                  if (!vals) return null;
                  const cx = ci * (BOX_W + BOX_GAP);
                  const avgY = py(vals.avg);
                  const top30Y = py(vals.top30);
                  const maxY = py(vals.max);
                  const col = CARRIER_COLORS[carrier];
                  const boxH = Math.max(avgY - top30Y, 2);

                  return (
                    <g
                      key={carrier}
                      transform={`translate(${cx},0)`}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          deviceName: device.deviceName,
                          carrier,
                          avg: vals.avg,
                          top30: vals.top30,
                          max: vals.max,
                        });
                      }}
                      onMouseMove={(e) => {
                        const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
                        setTooltip((t) => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: "default" }}
                    >
                      {/* Whisker: top30 → max */}
                      <line
                        x1={BOX_W / 2} y1={maxY}
                        x2={BOX_W / 2} y2={top30Y}
                        stroke={col} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.8}
                      />
                      {/* Box body: avg → top30 */}
                      <rect
                        x={0} y={top30Y} width={BOX_W} height={boxH}
                        fill={col} fillOpacity={0.72} rx={2}
                      />
                      {/* Max cap */}
                      <line
                        x1={BOX_W / 2 - 7} y1={maxY}
                        x2={BOX_W / 2 + 7} y2={maxY}
                        stroke={col} strokeWidth={2}
                      />
                      {/* Avg line */}
                      <line
                        x1={0} y1={avgY}
                        x2={BOX_W} y2={avgY}
                        stroke={col} strokeWidth={2} opacity={0.9}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Y label */}
          <text
            transform={`rotate(-90) translate(${-innerH / 2}, ${-58})`}
            textAnchor="middle" fontSize={11} fill="#9ca3af"
          >
            단가 (원)
          </text>
        </g>

        {/* SVG Tooltip */}
        {tooltip && (
          <g transform={`translate(${Math.min(tooltip.x + 12, totalW - 175)},${Math.max(tooltip.y - 80, 0)})`}>
            <rect width={170} height={92} rx={6} fill="rgba(17,24,39,0.9)" />
            <text x={10} y={18} fontSize={11} fontWeight="bold" fill="white">
              {tooltip.deviceName}
            </text>
            <text x={10} y={34} fontSize={10} fill={CARRIER_COLORS[tooltip.carrier]}>
              {tooltip.carrier}
            </text>
            <text x={10} y={52} fontSize={10} fill="#d1d5db">
              최대 <tspan fill="white" fontWeight="600">{fmtFull(tooltip.max)}</tspan>
            </text>
            <text x={10} y={67} fontSize={10} fill="#d1d5db">
              상위30% <tspan fill="white" fontWeight="600">{fmtFull(tooltip.top30)}</tspan>
            </text>
            <text x={10} y={82} fontSize={10} fill="#d1d5db">
              평균 <tspan fill="white" fontWeight="600">{fmtFull(tooltip.avg)}</tspan>
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 pb-2 pt-1 text-xs text-gray-500">
        {carriers.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: CARRIER_COLORS[c] }} />
            {c}
          </span>
        ))}
        <span className="text-gray-400 ml-2">■ 상자: 평균 → 상위30% │ ╌ 점선 위: 최대값</span>
      </div>
    </div>
  );
}

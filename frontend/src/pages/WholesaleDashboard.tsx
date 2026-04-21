import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

interface Record {
  carrier: string;
  contractType: string;
  surveyDate: string;
  hqUnit: string;
  batchNo: string;
  channel: string;
  dealerCode: string;
  legalDongCode: string;
  legalDongName: string;
  hqName: string;
  subscriptionType: string;
  priceTier: string;
  deviceModel: string;
  wholesalePrice: number;
  weight: number;
}

interface Stats {
  mean: number;
  p70: number;
  max: number;
  count: number;
}

interface ChartDataEntry {
  device: string;
  [key: string]: string | number | null;
}

// ─── 상수 ────────────────────────────────────────────────────
const CARRIERS = ["SKT", "KT", "LGU+"];
const CARRIER_COLORS: Record<string, Record<string, string>> = {
  SKT:   { base: "#1a73e8", box: "#4a9ef0", top: "#a8d4f8", text: "#1a73e8" },
  KT:    { base: "#ea4335", box: "#f37066", top: "#f9b4ae", text: "#ea4335" },
  "LGU+":{ base: "#34a853", box: "#66c47a", top: "#a8ddb5", text: "#34a853" },
};

// ─── 통계 헬퍼 ───────────────────────────────────────────────
function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function calcStats(values: number[]): Stats | null {
  const valid = values.filter(v => typeof v === "number" && v > 20);
  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const p70  = percentile(sorted, 70);
  const max  = sorted[sorted.length - 1];
  return {
    mean:  Math.round(mean * 10) / 10,
    p70:   Math.round(p70  * 10) / 10,
    max,
    count: valid.length,
  };
}

// ─── Excel 파서 ──────────────────────────────────────────────
function parseExcelFile(arrayBuffer: ArrayBuffer): Record[] {
  const wb   = XLSX.read(arrayBuffer, { type: "array" });
  const recs: Record[] = [];

  wb.SheetNames.forEach(sheetName => {
    const m = sheetName.match(/^(SKT|KT|LGU\+)(공|선)$/);
    if (!m) return;
    const carrier      = m[1];
    const contractType = m[2] === "공" ? "공시" : "선약";
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (any[] | null)[];
    if (rows.length < 5) return;

    const [weightRow, tierRow, subsRow, headerRow] = rows as any[];

    // 컬럼 메타 빌드
    let curSubs: string | null = null, curTier: string | null = null;
    const colMeta = headerRow.map((name: string, i: number) => {
      if (subsRow[i])  { curSubs = subsRow[i]; curTier = null; }
      if (tierRow[i])    curTier = tierRow[i];
      return { idx: i, name, subs: curSubs, tier: curTier, weight: weightRow[i] };
    });

    // 고정 컬럼 인덱스
    const ix: Record<string, number> = {};
    ["날짜","조사본부","차수","채널","구분코드","법정동코드","법정동명","본부"].forEach(key => {
      const found = colMeta.find(c => c.name === key);
      if (found) ix[key] = found.idx;
    });

    // 단말 가격 컬럼 (가입유형 구분 내 단말만)
    const devCols = colMeta.filter(c =>
      c.subs && c.name &&
      c.name !== "유통망 구분" &&
      c.name !== "대리점명"
    );

    // 데이터 행 처리
    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row[ix["날짜"]] == null) continue;
      devCols.forEach(col => {
        const price = row[col.idx];
        if (price == null || typeof price !== "number") return;
        recs.push({
          carrier,
          contractType,
          surveyDate:    String(row[ix["날짜"]]  || ""),
          hqUnit:        row[ix["조사본부"]]      || "",
          batchNo:       row[ix["차수"]]           || "",
          channel:       row[ix["채널"]]           || "",
          dealerCode:    row[ix["구분코드"]]       || "",
          legalDongCode: String(row[ix["법정동코드"]] || ""),
          legalDongName: row[ix["법정동명"]]       || "",
          hqName:        row[ix["본부"]]            || "",
          subscriptionType: col.subs,
          priceTier:     col.tier,
          deviceModel:   col.name,
          wholesalePrice: price,
          weight:        col.weight || 0,
        });
      });
    }
  });
  return recs;
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────

function UploadArea({ onFile, loading }: { onFile: (file: File) => void; loading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
      fontFamily: "'Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <h1 style={{ color: "#fff", fontSize: 28, margin: 0, fontWeight: 700 }}>
          이동통신 3사 도매단가 대시보드
        </h1>
        <p style={{ color: "#aaa", marginTop: 8 }}>
          Excel 파일(.xlsx)을 업로드하면 자동으로 분석합니다
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          width: 420, padding: "40px 32px", border: `2px dashed ${dragging ? "#4a9ef0" : "#555"}`,
          borderRadius: 16, background: dragging ? "rgba(74,158,240,0.08)" : "rgba(255,255,255,0.05)",
          color: "#ccc", textAlign: "center", cursor: "pointer",
          transition: "all .2s",
        }}
      >
        {loading ? (
          <div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <p style={{ color: "#4a9ef0" }}>파일 처리 중...</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>파일을 끌어다 놓거나 클릭하세요</p>
            <p style={{ fontSize: 13, color: "#888", marginTop: 8 }}>
              지원 형식: .xlsx (SKT공·SKT선·KT공·KT선·LGU+공·LGU+선 시트 포함)
            </p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }:
  { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          padding: "6px 28px 6px 10px", border: "1px solid #ddd", borderRadius: 6,
          background: "white", fontSize: 13, cursor: "pointer", appearance: "auto",
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "white", borderRadius: 10, padding: "14px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,.08)", minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// 커스텀 박스플롯 툴팁
function BoxTooltip({ active, payload, label, chartData }: any) {
  if (!active || !payload?.length) return null;
  const d = chartData.find((x: ChartDataEntry) => x.device === label);
  if (!d) return null;
  return (
    <div style={{
      background: "white", border: "1px solid #e0e0e0", borderRadius: 10,
      padding: "12px 16px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,.15)",
      minWidth: 200,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 10, color: "#222", fontSize: 14 }}>{label}</p>
      {CARRIERS.map(c => {
        if (!d[`${c}_count`]) return null;
        return (
          <div key={c} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: CARRIER_COLORS[c].text, marginBottom: 3 }}>{c}</div>
            <div style={{ paddingLeft: 10, display: "grid", gridTemplateColumns: "80px 1fr", gap: "2px 0" }}>
              <span style={{ color: "#666" }}>평균</span>
              <span style={{ fontWeight: 600 }}>{(d[`${c}_mean`] as number)?.toFixed(1)} 만원</span>
              <span style={{ color: "#666" }}>상위 30%</span>
              <span style={{ fontWeight: 600 }}>{(d[`${c}_p70`] as number)?.toFixed(1)} 만원</span>
              <span style={{ color: "#666" }}>최대</span>
              <span style={{ fontWeight: 600 }}>{d[`${c}_max`]} 만원</span>
              <span style={{ color: "#999", fontSize: 11 }}>n={d[`${c}_count`]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 커스텀 범례
function CustomLegend() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "8px 0 0", flexWrap: "wrap" }}>
      {CARRIERS.map(c => (
        <div key={c} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, color: CARRIER_COLORS[c].text, minWidth: 36 }}>{c}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, background: CARRIER_COLORS[c].box, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: "#555" }}>평균→상위30%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, background: CARRIER_COLORS[c].top, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: "#555" }}>상위30%→최대</span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: 12 }}>
        <div style={{ width: 14, height: 3, background: "#888", borderRadius: 1 }} />
        <span>평균선(하단)</span>
      </div>
    </div>
  );
}

// 테이블 뷰
function TableView({ chartData }: { chartData: ChartDataEntry[] }) {
  const headers = ["단말", ...CARRIERS.flatMap(c => [`${c} 평균`, `${c} 상위30%`, `${c} 최대`, `${c} n`])];
  return (
    <div style={{ overflowX: "auto", background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f0f4ff" }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "10px 12px", textAlign: i === 0 ? "left" : "right",
                borderBottom: "2px solid #dde3ff", fontWeight: 700, color: "#333",
                whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f0f4ff",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ padding: "8px 12px", fontWeight: 600, color: "#222", borderBottom: "1px solid #f0f0f0" }}>
                {row.device}
              </td>
              {CARRIERS.flatMap(c => [
                (row[`${c}_mean`] as number) != null ? (row[`${c}_mean`] as number)?.toFixed(1) : "-",
                (row[`${c}_p70`] as number)  != null ? (row[`${c}_p70`] as number)?.toFixed(1)  : "-",
                (row[`${c}_max`] as number)  != null ? (row[`${c}_max`] as number)              : "-",
                row[`${c}_count`] || "-",
              ]).map((val, j) => (
                <td key={j} style={{
                  padding: "8px 12px", textAlign: "right",
                  borderBottom: "1px solid #f0f0f0", color: "#444",
                  fontVariantNumeric: "tabular-nums",
                }}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 멀티셀렉트 드롭다운
function DeviceMultiSelect({ allDevices, selectedDevices, setSelectedDevices }:
  { allDevices: string[]; selectedDevices: string[]; setSelectedDevices: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (d: string) => setSelectedDevices(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600 }}>
        단말 선택 ({selectedDevices.length}/{allDevices.length})
      </div>
      <button onClick={() => setOpen(v => !v)} style={{
        padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6,
        background: "white", cursor: "pointer", minWidth: 180, textAlign: "left",
        fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{selectedDevices.length === 0 ? "전체" : `${selectedDevices.length}개 선택됨`}</span>
        <span style={{ marginLeft: 8, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 200,
          background: "white", border: "1px solid #ddd", borderRadius: 10,
          boxShadow: "0 6px 20px rgba(0,0,0,.15)", padding: 10,
          maxHeight: 320, overflowY: "auto", minWidth: 240, marginTop: 4,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setSelectedDevices(allDevices.slice(0, 20))}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #1a73e8", color: "#1a73e8", background: "#e8f0fe", cursor: "pointer" }}>
              상위 20개
            </button>
            <button onClick={() => setSelectedDevices(allDevices)}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #ddd", color: "#555", background: "#f5f5f5", cursor: "pointer" }}>
              전체 선택
            </button>
            <button onClick={() => setSelectedDevices([])}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #ddd", color: "#555", background: "#f5f5f5", cursor: "pointer" }}>
              해제
            </button>
          </div>
          <hr style={{ margin: "6px 0", borderColor: "#f0f0f0" }} />
          {allDevices.map(d => (
            <label key={d} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 4px", cursor: "pointer", fontSize: 13, borderRadius: 4,
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f7ff"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
            >
              <input type="checkbox" checked={selectedDevices.includes(d)}
                onChange={() => toggle(d)} style={{ accentColor: "#1a73e8" }} />
              {d}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 메인 앱 ────────────────────────────────────────────────
export default function WholesaleDashboard() {
  const [records, setRecords]           = useState<Record[]>([]);
  const [loading, setLoading]           = useState(false);
  const [view, setView]                 = useState<"chart" | "table">("chart");
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterContract, setFilterContract] = useState("전체");
  const [filterSubs, setFilterSubs]     = useState("전체");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // 파일 업로드
  const handleFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseExcelFile(e.target?.result as ArrayBuffer);
        setRecords(parsed);
        const counts: Record<string, number> = {};
        parsed.forEach(r => { counts[r.deviceModel] = (counts[r.deviceModel] || 0) + 1; });
        const top20 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([d]) => d);
        setSelectedDevices(top20);
        setFilterRegion("전체");
        setFilterContract("전체");
        setFilterSubs("전체");
      } catch (err) {
        alert("파싱 오류: " + (err instanceof Error ? err.message : String(err)));
        console.error(err);
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // 파생 옵션
  const regions = useMemo(() => {
    const s = new Set(records.map(r => r.hqUnit).filter(Boolean));
    return ["전체", ...Array.from(s).sort()];
  }, [records]);

  const allDevices = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => { counts[r.deviceModel] = (counts[r.deviceModel] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([d]) => d);
  }, [records]);

  // 필터 적용
  const filtered = useMemo(() => records.filter(r => {
    if (filterRegion   !== "전체" && r.hqUnit           !== filterRegion)   return false;
    if (filterContract !== "전체" && r.contractType     !== filterContract) return false;
    if (filterSubs     !== "전체" && r.subscriptionType !== filterSubs)     return false;
    if (selectedDevices.length > 0 && !selectedDevices.includes(r.deviceModel)) return false;
    return true;
  }), [records, filterRegion, filterContract, filterSubs, selectedDevices]);

  // 차트 데이터 (device × carrier 별 통계)
  const chartData = useMemo(() => {
    const devices = selectedDevices.length > 0 ? selectedDevices : allDevices.slice(0, 20);
    return devices.map(device => {
      const entry: ChartDataEntry = { device };
      CARRIERS.forEach(c => {
        const prices = filtered
          .filter(r => r.deviceModel === device && r.carrier === c)
          .map(r => r.wholesalePrice);
        const s = calcStats(prices);
        if (s) {
          entry[`${c}_base`]  = s.mean;
          entry[`${c}_box`]   = Math.max(0, s.p70  - s.mean);
          entry[`${c}_top`]   = Math.max(0, s.max   - s.p70);
          entry[`${c}_mean`]  = s.mean;
          entry[`${c}_p70`]   = s.p70;
          entry[`${c}_max`]   = s.max;
          entry[`${c}_count`] = s.count;
        } else {
          entry[`${c}_base`] = 0; entry[`${c}_box`] = 0; entry[`${c}_top`] = 0;
          entry[`${c}_mean`] = null; entry[`${c}_p70`] = null;
          entry[`${c}_max`]  = null; entry[`${c}_count`] = 0;
        }
      });
      return entry;
    });
  }, [filtered, selectedDevices, allDevices]);

  const totalDates = useMemo(() => new Set(records.map(r => r.surveyDate)).size, [records]);

  // ── 업로드 화면 ──
  if (!records.length && !loading) {
    return <UploadArea onFile={handleFile} loading={loading} />;
  }
  if (loading) {
    return <UploadArea onFile={handleFile} loading={true} />;
  }

  const chartWidth = Math.max(1100, chartData.length * 120);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#f0f4ff", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div style={{
        background: "linear-gradient(90deg,#0f0c29,#302b63)",
        color: "#fff", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📊 이동통신 3사 도매단가 대시보드</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#aaa" }}>
            단가 20 이하 값 제외 | 평균 / 상위 30%(P70) / 최대값 기준
          </p>
        </div>
        <button
          onClick={() => { setRecords([]); setSelectedDevices([]); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#ddd", cursor: "pointer", fontSize: 13 }}
        >
          ↩ 파일 재업로드
        </button>
      </div>

      {/* 필터 바 */}
      <div style={{
        background: "white", padding: "14px 24px",
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end",
        borderBottom: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,.05)",
      }}>
        <FilterSelect label="지역 / 본부" value={filterRegion}   options={regions}                          onChange={setFilterRegion} />
        <FilterSelect label="약정 유형"   value={filterContract} options={["전체","공시","선약"]}           onChange={setFilterContract} />
        <FilterSelect label="가입 유형"   value={filterSubs}     options={["전체","010","MNP","기변"]}     onChange={setFilterSubs} />
        <DeviceMultiSelect
          allDevices={allDevices}
          selectedDevices={selectedDevices}
          setSelectedDevices={setSelectedDevices}
        />
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>보기 전환</div>
          <div style={{ display: "flex", background: "#f0f4ff", borderRadius: 8, padding: 3 }}>
            {["chart","table"].map(v => (
              <button key={v} onClick={() => setView(v as "chart" | "table")} style={{
                padding: "6px 18px", borderRadius: 6, border: "none",
                background: view === v ? "#1a73e8" : "transparent",
                color: view === v ? "#fff" : "#666",
                cursor: "pointer", fontSize: 13, fontWeight: view === v ? 700 : 400,
                transition: "all .2s",
              }}>
                {v === "chart" ? "📊 차트" : "📋 테이블"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="전체 레코드" value={records.length.toLocaleString()} sub="행" />
        <StatCard label="필터 결과"   value={filtered.length.toLocaleString()} sub="행" />
        <StatCard label="조사 일수"   value={totalDates} sub="일" />
        <StatCard label="표시 단말"   value={chartData.length} sub="개" />
        <StatCard label="조사 지역"   value={regions.length - 1} sub="본부" />
      </div>

      {/* 콘텐츠 */}
      <div style={{ padding: "0 24px 32px" }}>
        {view === "chart" ? (
          <div style={{ background: "white", borderRadius: 14, padding: "24px 16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
            <h2 style={{ margin: "0 0 4px 8px", fontSize: 16, color: "#222" }}>단말별 3사 도매단가 비교 (박스플롯)</h2>
            <p style={{ margin: "0 0 16px 8px", fontSize: 12, color: "#888" }}>
              각 단말별로 SKT / KT / LGU+ 순으로 표시 | 값 20 이하 제외 후 산출
            </p>

            {/* 가로 스크롤 차트 영역 */}
            <div style={{ overflowX: "auto" }}>
              <div style={{ width: chartWidth, minWidth: "100%" }}>
                <ComposedChart
                  width={chartWidth} height={480}
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="device"
                    tick={{ fontSize: 11, fill: "#555" }}
                    angle={-35} textAnchor="end" interval={0}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#888" }}
                    tickFormatter={v => `${v}만`}
                    axisLine={false} tickLine={false}
                    label={{ value: "도매단가 (만원)", angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 12, fill: "#aaa" } }}
                  />
                  <Tooltip
                    content={props => <BoxTooltip {...props} chartData={chartData} />}
                    cursor={{ fill: "rgba(0,0,0,.03)" }}
                  />

                  {/* SKT 스택 */}
                  <Bar dataKey="SKT_base" stackId="SKT" fill="transparent"     isAnimationActive={false} legendType="none" />
                  <Bar dataKey="SKT_box"  stackId="SKT" fill={CARRIER_COLORS["SKT"].box} isAnimationActive={false} legendType="none" radius={[0,0,0,0]} />
                  <Bar dataKey="SKT_top"  stackId="SKT" fill={CARRIER_COLORS["SKT"].top} isAnimationActive={false} legendType="none" radius={[3,3,0,0]} />

                  {/* KT 스택 */}
                  <Bar dataKey="KT_base" stackId="KT" fill="transparent"     isAnimationActive={false} legendType="none" />
                  <Bar dataKey="KT_box"  stackId="KT" fill={CARRIER_COLORS["KT"].box} isAnimationActive={false} legendType="none" />
                  <Bar dataKey="KT_top"  stackId="KT" fill={CARRIER_COLORS["KT"].top} isAnimationActive={false} legendType="none" radius={[3,3,0,0]} />

                  {/* LGU+ 스택 */}
                  <Bar dataKey="LGU+_base" stackId="LGU+" fill="transparent"       isAnimationActive={false} legendType="none" />
                  <Bar dataKey="LGU+_box"  stackId="LGU+" fill={CARRIER_COLORS["LGU+"].box} isAnimationActive={false} legendType="none" />
                  <Bar dataKey="LGU+_top"  stackId="LGU+" fill={CARRIER_COLORS["LGU+"].top} isAnimationActive={false} legendType="none" radius={[3,3,0,0]} />
                </ComposedChart>
              </div>
            </div>

            <CustomLegend />

            {/* 해석 안내 */}
            <div style={{ marginTop: 20, padding: "12px 16px", background: "#f8f9ff", borderRadius: 8, fontSize: 12, color: "#666", lineHeight: 1.8 }}>
              <strong>📌 읽는 법:</strong>&nbsp;
              각 단말에 대해 <strong style={{color:"#1a73e8"}}>SKT</strong> / <strong style={{color:"#ea4335"}}>KT</strong> / <strong style={{color:"#34a853"}}>LGU+</strong> 순으로 막대가 나열됩니다.
              &nbsp;막대 하단 = <strong>평균값</strong>, 진한 색 구간 = 평균→상위30%(P70), 연한 색 구간 = 상위30%→최대값.
              &nbsp;막대가 길수록 단가 편차가 큰 것을 의미합니다.
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#222" }}>단말별 3사 도매단가 통계 테이블</h2>
            <TableView chartData={chartData} />
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>
              * 값 20 이하 제외 후 산출 | 단위: 만원
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

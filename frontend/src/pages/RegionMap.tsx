import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

// ── Types ──────────────────────────────────────────────────────────────────
type Level = "sido" | "sigungu" | "dong";
type Competitor = "KT" | "LGU" | "전체";
type SubType = "010" | "MNP" | "기변" | "전체";
type SupportType = "공시" | "선약" | "전체";

interface RegionStats {
  SKT: number | null;
  KT: number | null;
  LGU: number | null;
  advantage: number;
}

interface SelectedRegion {
  name: string;
  level: Level;
  stats: RegionStats | null;
}

// ── Constants ──────────────────────────────────────────────────────────────
const DEVICE_LIST = [
  "전체", "아이폰17프로맥스", "아이폰17프로", "아이폰17", "아이폰17플러스",
  "아이폰16프로맥스", "아이폰16프로", "아이폰16",
  "갤럭시S26울트라", "갤럭시S26+", "갤럭시S26",
  "갤럭시S25울트라", "갤럭시S25+", "갤럭시S25",
  "갤럭시Z폴드7", "갤럭시Z플립7", "갤럭시Z폴드6", "갤럭시Z플립6",
  "갤럭시A56", "아이폰SE4", "갤럭시퀀텀5",
];

// ── Region data ────────────────────────────────────────────────────────────
const SIGUNGU_BY_SIDO: Record<string, string[]> = {
  서울특별시: ["강남구","서초구","송파구","마포구","강서구","노원구","성북구","은평구","강동구","동작구","영등포구","용산구","종로구","중구","광진구","성동구","중랑구","도봉구","강북구","구로구","관악구","금천구","양천구","동대문구","서대문구"],
  부산광역시: ["해운대구","부산진구","동래구","남구","북구","사하구","금정구","연제구","수영구","사상구","기장군","강서구","서구","동구","영도구","중구"],
  인천광역시: ["미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군","동구","중구"],
  경기도: ["수원시","성남시","용인시","고양시","화성시","안산시","안양시","남양주시","평택시","의정부시","파주시","시흥시"],
  강원특별자치도: ["춘천시","원주시","강릉시","동해시","속초시","횡성군","태백시","삼척시"],
  충청남도: ["천안시","아산시","논산시","공주시","서산시","당진시","보령시","홍성군","예산군"],
  충청북도: ["청주시","충주시","제천시","음성군","진천군","괴산군","보은군","옥천군"],
  세종특별자치시: ["세종시"],
  대전광역시: ["서구","유성구","중구","동구","대덕구"],
  경상북도: ["포항시","경주시","구미시","안동시","경산시","칠곡군","영천시","상주시","문경시","김천시"],
  대구광역시: ["수성구","달서구","북구","동구","중구","달성군","서구","남구"],
  울산광역시: ["남구","북구","중구","동구","울주군"],
  전북특별자치도: ["전주시","익산시","군산시","정읍시","남원시","김제시","완주군","고창군"],
  광주광역시: ["북구","광산구","서구","남구","동구"],
  전라남도: ["여수시","순천시","목포시","광양시","나주시","무안군","담양군","화순군","해남군"],
  경상남도: ["창원시","진주시","김해시","통영시","거제시","양산시","밀양시","사천시","의령군","함안군"],
  제주특별자치도: ["제주시","서귀포시"],
};

const DONG_BY_SIGUNGU: Record<string, string[]> = {
  강남구: ["역삼동","삼성동","논현동","청담동","대치동","개포동","도곡동"],
  서초구: ["서초동","방배동","반포동","양재동","잠원동"],
  송파구: ["잠실동","방이동","풍납동","거여동","마천동","오금동"],
  해운대구: ["우동","중동","좌동","재송동","반여동","송정동"],
  수원시: ["영통동","권선동","팔달동","장안동","매탄동","망포동"],
  성남시: ["분당구","수정구","중원구"],
  창원시: ["성산구","의창구","마산합포구","마산회원구","진해구"],
};

const SIDO_LIST = Object.keys(SIGUNGU_BY_SIDO);

// ── Rectangular Korea Cartogram ─────────────────────────────────────────────
const CELL_W = 96;
const CELL_H = 70;
const SG_CELL_W = 88;
const SG_CELL_H = 64;

interface GridCell {
  key: string;
  short: string;
  row: number;
  col: number;
}

// Korea cartogram: 5 cols (row0) | 6 cols (row1) | 5 cols (row2) | 1 cell (row3:제주)
// Mimics Korea peninsula shape (wider in center, narrower at top/bottom, Jeju at bottom)
const SIDO_CELLS: GridCell[] = [
  { key: "인천광역시",        short: "인천", row: 0, col: 0 },
  { key: "서울특별시",        short: "서울", row: 0, col: 1 },
  { key: "경기도",            short: "경기", row: 0, col: 2 },
  { key: "강원특별자치도",    short: "강원", row: 0, col: 3 },
  { key: "경상북도",          short: "경북", row: 0, col: 4 },
  { key: "충청남도",          short: "충남", row: 1, col: 0 },
  { key: "대전광역시",        short: "대전", row: 1, col: 1 },
  { key: "세종특별자치시",    short: "세종", row: 1, col: 2 },
  { key: "충청북도",          short: "충북", row: 1, col: 3 },
  { key: "대구광역시",        short: "대구", row: 1, col: 4 },
  { key: "울산광역시",        short: "울산", row: 1, col: 5 },
  { key: "전북특별자치도",    short: "전북", row: 2, col: 0 },
  { key: "광주광역시",        short: "광주", row: 2, col: 1 },
  { key: "전라남도",          short: "전남", row: 2, col: 2 },
  { key: "경상남도",          short: "경남", row: 2, col: 3 },
  { key: "부산광역시",        short: "부산", row: 2, col: 4 },
  { key: "제주특별자치도",    short: "제주", row: 3, col: 2 },
];

// Predefined sigungu map layouts for key provinces
const SIGUNGU_LAYOUTS: Record<string, Record<string, { row: number; col: number }>> = {
  서울특별시: {
    은평구: {row:0,col:0}, 서대문구:{row:0,col:1}, 종로구:{row:0,col:2},
    성북구: {row:0,col:3}, 강북구: {row:0,col:4}, 도봉구:{row:0,col:5}, 노원구:{row:0,col:6},
    강서구: {row:1,col:0}, 마포구: {row:1,col:1}, 용산구:{row:1,col:2},
    중구:   {row:1,col:3}, 성동구: {row:1,col:4}, 광진구:{row:1,col:5}, 중랑구:{row:1,col:6},
    양천구: {row:2,col:0}, 영등포구:{row:2,col:1}, 동작구:{row:2,col:2},
    서초구: {row:2,col:3}, 강남구: {row:2,col:4}, 송파구:{row:2,col:5}, 강동구:{row:2,col:6},
    구로구: {row:3,col:0}, 관악구: {row:3,col:1}, 금천구:{row:3,col:2}, 동대문구:{row:3,col:3},
  },
  경기도: {
    파주시:  {row:0,col:0}, 고양시:  {row:0,col:1}, 의정부시:{row:0,col:2}, 남양주시:{row:0,col:3},
    안산시:  {row:1,col:0}, 안양시:  {row:1,col:1}, 수원시:  {row:1,col:2}, 성남시:  {row:1,col:3},
    시흥시:  {row:2,col:0}, 화성시:  {row:2,col:1}, 평택시:  {row:2,col:2}, 용인시:  {row:2,col:3},
  },
  부산광역시: {
    강서구:  {row:0,col:0}, 북구:    {row:0,col:1}, 금정구:  {row:0,col:2}, 기장군:  {row:0,col:3},
    사하구:  {row:1,col:0}, 사상구:  {row:1,col:1}, 부산진구:{row:1,col:2}, 동래구:  {row:1,col:3},
    동구:    {row:2,col:0}, 서구:    {row:2,col:1}, 연제구:  {row:2,col:2}, 해운대구:{row:2,col:3},
    영도구:  {row:3,col:0}, 남구:    {row:3,col:1}, 수영구:  {row:3,col:2}, 중구:    {row:3,col:3},
  },
  대구광역시: {
    서구:    {row:0,col:0}, 북구:    {row:0,col:1}, 동구:    {row:0,col:2}, 달성군:  {row:0,col:3},
    달서구:  {row:1,col:0}, 중구:    {row:1,col:1}, 수성구:  {row:1,col:2}, 남구:    {row:1,col:3},
  },
  인천광역시: {
    강화군:  {row:0,col:0}, 계양구:  {row:0,col:1}, 서구:    {row:0,col:2}, 옹진군:  {row:0,col:3},
    부평구:  {row:1,col:0}, 남동구:  {row:1,col:1}, 동구:    {row:1,col:2}, 중구:    {row:1,col:3},
    미추홀구:{row:2,col:0}, 연수구:  {row:2,col:1},
  },
};

// ── Color scale ────────────────────────────────────────────────────────────
function heatColor(adv: number): { bg: string; tc: string; label: string } {
  if (adv >= 20000) return { bg: "#1e3a8a", tc: "white",   label: "우위 강" };
  if (adv >= 10000) return { bg: "#2563eb", tc: "white",   label: "우위 중" };
  if (adv > 1000)   return { bg: "#60a5fa", tc: "#1e3a8a", label: "우위 약" };
  if (adv >= -1000) return { bg: "#9ca3af", tc: "white",   label: "동일" };
  if (adv > -10000) return { bg: "#f87171", tc: "#7f1d1d", label: "열세 약" };
  if (adv > -20000) return { bg: "#dc2626", tc: "white",   label: "열세 중" };
  return              { bg: "#991b1b", tc: "white",         label: "열세 강" };
}

const LEGEND = [
  { bg: "#1e3a8a", label: "우위 강 (>2만)" },
  { bg: "#2563eb", label: "우위 중 (1~2만)" },
  { bg: "#60a5fa", label: "우위 약" },
  { bg: "#9ca3af", label: "동일" },
  { bg: "#f87171", label: "열세 약" },
  { bg: "#dc2626", label: "열세 중 (1~2만)" },
  { bg: "#991b1b", label: "열세 강 (>2만)" },
];

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtW = (v: number | null) => v != null ? `${Math.round(v / 10000)}만` : "-";
const fmtDiff = (adv: number) => (adv >= 0 ? "+" : "") + Math.round(adv / 1000) + "천";

// ── Stats computation ───────────────────────────────────────────────────────
function computeStats(
  rows: any[], competitor: Competitor, device: string,
  subType: SubType, supportType: SupportType
): Map<string, RegionStats> {
  const filtered = rows.filter((r) => {
    if (device !== "전체" && r.device_name !== device) return false;
    if (subType !== "전체" && r.sub_type !== subType) return false;
    if (supportType === "공시" && r.support_type !== "공시") return false;
    if (supportType === "선약" && r.support_type !== "선약") return false;
    return true;
  });
  const acc = new Map<string, { SKT: number[]; KT: number[]; LGU: number[] }>();
  for (const r of filtered) {
    const key = r.region_key;
    if (!key || !r.carrier || r.avg_price == null) continue;
    if (!acc.has(key)) acc.set(key, { SKT: [], KT: [], LGU: [] });
    const b = acc.get(key)!;
    if (r.carrier === "SKT") b.SKT.push(r.avg_price);
    else if (r.carrier === "KT") b.KT.push(r.avg_price);
    else if (r.carrier === "LGU") b.LGU.push(r.avg_price);
  }
  const result = new Map<string, RegionStats>();
  acc.forEach((v, key) => {
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const skt = avg(v.SKT); const kt = avg(v.KT); const lgu = avg(v.LGU);
    let compAvg: number | null = null;
    if (competitor === "KT") compAvg = kt;
    else if (competitor === "LGU") compAvg = lgu;
    else { const c = [kt, lgu].filter((x): x is number => x != null); compAvg = c.length ? c.reduce((a, b) => a + b) / c.length : null; }
    result.set(key, { SKT: skt, KT: kt, LGU: lgu, advantage: skt != null && compAvg != null ? skt - compAvg : 0 });
  });
  return result;
}

// ── Mock stats generator (fallback) ─────────────────────────────────────────
function mockStats(name: string): RegionStats {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 250000 + (seed % 80000);
  const ktDiff = (seed % 40000) - 20000;
  const lguDiff = ((seed * 7) % 40000) - 20000;
  const compAvg = base + (ktDiff + lguDiff) / 2;
  return { SKT: base, KT: base + ktDiff, LGU: base + lguDiff, advantage: base - compAvg };
}

// ── Region detail data generator ────────────────────────────────────────────
function generateDetail(name: string, stats: RegionStats | null) {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (min: number, max: number) => min + (seed % (max - min + 1));
  const effective = stats ?? mockStats(name);
  const { SKT: skt, KT: kt, LGU: lgu, advantage: adv } = effective;
  const isLeading = adv > 0;
  const mnpIn  = 120 + r(0, 230);
  const mnpOut = 80  + r(0, 180);
  const netMnp = mnpIn - mnpOut;
  const sktShare = 32 + r(0, 18);
  const ktShare  = 25 + r(0, 10);
  const lguShare = 22 + r(0, 10);
  const etcShare = 100 - sktShare - ktShare - lguShare;

  const stores = [
    { name: `PNF ${name.slice(0,2)} 직영점`, type: "PNF 직영", code: `P${(10000 + seed) % 99999}`, status: "정상", mnp: r(30, 90) },
    { name: `${name.slice(0,2)} SKT 공식대리점`, type: "공식 대리점", code: `S${(20000 + seed * 3) % 99999}`, status: "정상", mnp: r(20, 70) },
    { name: `${name.slice(0,2)} 통신판매`, type: "일반 판매점", code: `A${(seed % 99).toString().padStart(2,"0")}`, status: r(0,5)>3 ? "모니터링" : "정상", mnp: r(10, 40) },
  ];

  const months = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  const history = [
    { date: `${months[r(3,6)]}월 ${r(10,28)}일`, event: "정기 단가 점검 완료", detail: `담당: ${["김","이","박","최"][r(0,3)]}○○ 팀장`, type: "check" },
    { date: `${months[r(0,3)]}월 ${r(5,25)}일`, event: "경쟁사 단가 급등 보고", detail: `KT ${Math.round((kt??300000)*1.05/10000)}만원 → 즉시 대응 요청`, type: "alert" },
    { date: `${months[r(0,2)]}월 ${r(1,20)}일`, event: "MNP 유입 목표 달성", detail: `목표 ${r(80,120)}건 대비 실적 ${r(90,140)}건 (${r(110,145)}%)`, type: "success" },
    { date: `전분기`, event: "평균 단가 이력", detail: `평균 ${Math.round((skt??280000)*1.03/10000)}만원 → 현재 ${Math.round((skt??280000)/10000)}만원 (${isLeading?"▼ 개선":"▲ 상승"})`, type: "info" },
  ];

  const aiText = [
    `**📊 단가 현황** | SKT **${Math.round((skt??280000)/10000)}만원** · KT **${Math.round((kt??290000)/10000)}만원** · LGU+ **${Math.round((lgu??285000)/10000)}만원**`,
    "",
    `**🏆 경쟁 포지션** ${isLeading
      ? `SKT가 경쟁사 평균 대비 **${Math.abs(Math.round(adv/1000))}천원 우위**. 현재 단가 경쟁력 확보 상태로 추가 고객 유치에 유리한 환경입니다.`
      : `SKT 단가가 경쟁사 평균 대비 **${Math.abs(Math.round(adv/1000))}천원 열세**. 주요 기종 단가 조정 또는 부가혜택 강화가 시급합니다.`}`,
    "",
    `**🔄 번호이동(MNP) 현황** (최근 30일)`,
    `유입 **${mnpIn}건** · 유출 **${mnpOut}건** · 순${netMnp>=0?"유입":"유출"} **${Math.abs(netMnp)}건**`,
    netMnp>=0 ? "▲ 유입 우세 — 현재 시장 점유율 확대 중" : "▼ 유출 우세 — 즉각적 단가·혜택 대응 필요",
    "",
    `**📈 추정 점유율** | SKT ${sktShare}% · KT ${ktShare}% · LGU+ ${lguShare}% · 기타 ${etcShare}%`,
    "",
    `**🏪 인근 대리점 동향** | ${stores.length}개 거점 운영 중. ${stores.filter(s=>s.status==="정상").length}개 정상, ${stores.filter(s=>s.status==="모니터링").length}개 모니터링.`,
    "",
    `**💡 AI 대응 권고**`,
    isLeading
      ? `현 우위 유지를 위해 고가요금제(9만원↑) 고객 대상 추가 혜택 제공 권장. 아이폰17프로 MNP 한정 ${r(2,5)}만원 추가 인하 시 점유율 ${r(1,3)}%p 추가 확보 전망. 경쟁사(KT) 단가 모니터링 강화 요망.`
      : `주력 기종 단가 ${r(2,5)}만원 인하 우선 검토. MNP 고객 한정 적용으로 수익성 방어. 단, 갤럭시S26·아이폰17프로 집중 투자 시 이탈 방어 효과 ${r(60,90)}% 예상.`,
  ].join("\n");

  return { skt, kt, lgu, adv, isLeading, mnpIn, mnpOut, netMnp, sktShare, ktShare, lguShare, etcShare, stores, history, aiText };
}

// ── API hook ────────────────────────────────────────────────────────────────
function useRegionAgg(level: Level) {
  return useQuery({
    queryKey: ["region-agg", level],
    queryFn: async () => {
      const { data } = await api.get(`/aggregation/region/${level}`);
      return data as any[];
    },
  });
}

// ── Dropdown ────────────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange, minWidth = 120 }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; minWidth?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 font-semibold tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth }}
        className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-xs focus:outline-none focus:border-blue-400 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

// ── RegionCell (rectangular, used for both sido and sigungu) ────────────────
function RegionCell({
  label, stats, onClick, w, h, noData,
}: {
  label: string; stats: RegionStats | null; onClick?: () => void;
  w: number; h: number; noData?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const { bg, tc } = stats ? heatColor(stats.advantage) : { bg: "#e5e7eb", tc: "#9ca3af" };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: w, height: h, background: bg,
        cursor: onClick ? "pointer" : "default",
        transform: hov && onClick ? "scale(1.04)" : "scale(1)",
        transition: "transform 0.12s",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
        boxSizing: "border-box",
        outline: hov && onClick ? "2px solid rgba(0,0,0,0.3)" : "1px solid rgba(0,0,0,0.08)",
        outlineOffset: -1,
        zIndex: hov ? 2 : 1,
        position: "relative",
      }}
    >
      <span style={{ color: tc, fontWeight: 700, fontSize: Math.min(w / 4.5, 15), lineHeight: 1, textAlign: "center", padding: "0 4px" }}>
        {label}
      </span>
      {stats ? (
        <>
          <span style={{ color: tc, fontSize: 10, opacity: 0.9 }}>{fmtW(stats.SKT)}</span>
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: stats.advantage >= 0
              ? (tc === "white" ? "#bfdbfe" : "#1d4ed8")
              : (tc === "white" ? "#fecaca" : "#991b1b"),
          }}>
            {fmtDiff(stats.advantage)}
          </span>
        </>
      ) : noData ? null : (
        <span style={{ color: "#d1d5db", fontSize: 9 }}>-</span>
      )}
    </div>
  );
}

// ── AbsoluteGrid ──────────────────────────────────────────────────────────
function AbsoluteGrid({
  cells, cellW, cellH, onCellClick,
}: {
  cells: { key: string; short: string; row: number; col: number; stats: RegionStats | null }[];
  cellW: number; cellH: number;
  onCellClick: (key: string, short: string, stats: RegionStats | null) => void;
}) {
  const maxRow = cells.reduce((m, c) => Math.max(m, c.row), 0);
  const maxCol = cells.reduce((m, c) => Math.max(m, c.col), 0);
  const canvasW = (maxCol + 1) * cellW;
  const canvasH = (maxRow + 1) * cellH;

  return (
    <div style={{ position: "relative", width: canvasW, height: canvasH }}>
      {cells.map((cell) => (
        <div
          key={cell.key}
          style={{
            position: "absolute",
            left: cell.col * cellW,
            top: cell.row * cellH,
            width: cellW,
            height: cellH,
          }}
        >
          <RegionCell
            label={cell.short}
            stats={cell.stats}
            onClick={() => onCellClick(cell.key, cell.short, cell.stats)}
            w={cellW}
            h={cellH}
          />
        </div>
      ))}
    </div>
  );
}

// ── FlexGrid (for provinces without predefined layout) ─────────────────────
function FlexGrid({
  cells, cellW, cellH, onCellClick,
}: {
  cells: { name: string; stats: RegionStats | null }[];
  cellW: number; cellH: number;
  onCellClick: (key: string, short: string, stats: RegionStats | null) => void;
}) {
  const cols = Math.ceil(Math.sqrt(cells.length * 1.2));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cellW}px)`, gap: 0 }}>
      {cells.map((cell) => (
        <RegionCell
          key={cell.name}
          label={cell.name.replace(/[시군구도특별자치]/g, "").slice(0, 4) || cell.name}
          stats={cell.stats}
          onClick={() => onCellClick(cell.name, cell.name, cell.stats)}
          w={cellW}
          h={cellH}
        />
      ))}
    </div>
  );
}

// ── Region Detail Panel ─────────────────────────────────────────────────────
function RegionDetailPanel({ region, onClose }: { region: SelectedRegion; onClose: () => void }) {
  const detail = useMemo(() => generateDetail(region.name, region.stats), [region]);
  const barData = [
    { label: "SKT", value: detail.sktShare, color: "#e8003d" },
    { label: "KT",  value: detail.ktShare,  color: "#f03f13" },
    { label: "LGU+",value: detail.lguShare, color: "#a100ff" },
    { label: "기타", value: detail.etcShare, color: "#9ca3af" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">{region.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${detail.isLeading ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
            {detail.isLeading ? `SKT 우위 +${Math.abs(Math.round(detail.adv/1000))}천원` : `SKT 열세 -${Math.abs(Math.round(detail.adv/1000))}천원`}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Price comparison */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📊 3사 단가 비교</h4>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              {[
                { carrier: "SKT", price: detail.skt ?? 0, color: "#e8003d" },
                { carrier: "KT",  price: detail.kt  ?? 0, color: "#f03f13" },
                { carrier: "LGU+", price: detail.lgu ?? 0, color: "#a100ff" },
              ].map(({ carrier, price, color }) => {
                const maxP = Math.max(detail.skt??0, detail.kt??0, detail.lgu??0);
                const pct = maxP > 0 ? (price / maxP) * 100 : 50;
                return (
                  <div key={carrier} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0">
                    <span className="w-10 text-xs font-bold" style={{ color }}>{carrier}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-14 text-right">{Math.round(price/10000)}만원</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market share */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📈 추정 점유율</h4>
            <div className="flex rounded-lg overflow-hidden h-8">
              {barData.map((b) => (
                <div
                  key={b.label}
                  style={{ width: `${b.value}%`, background: b.color, display: "flex", alignItems: "center", justifyContent: "center" }}
                  title={`${b.label} ${b.value}%`}
                >
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{b.value}%</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-1.5">
              {barData.map((b) => (
                <span key={b.label} className="flex items-center gap-1 text-xs text-gray-500">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color, display: "inline-block" }} />
                  {b.label} {b.value}%
                </span>
              ))}
            </div>
          </div>

          {/* MNP */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🔄 MNP 현황 (최근 30일)</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "유입", value: detail.mnpIn, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "유출", value: detail.mnpOut, color: "text-red-500", bg: "bg-red-50" },
                { label: `순${detail.netMnp>=0?"유입":"유출"}`, value: Math.abs(detail.netMnp), color: detail.netMnp>=0?"text-blue-700":"text-red-700", bg: detail.netMnp>=0?"bg-blue-100":"bg-red-100" },
              ].map((m) => (
                <div key={m.label} className={`${m.bg} rounded-lg p-3 text-center`}>
                  <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby stores */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🏪 인근 대리점·판매점</h4>
            <div className="space-y-1.5">
              {detail.stores.map((s) => (
                <div key={s.code} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-700 truncate">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.type} · {s.code} · MNP {s.mnp}건/월</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status==="정상"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📋 관리 히스토리</h4>
            <div className="space-y-2">
              {detail.history.map((h, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <span className="text-gray-400 whitespace-nowrap pt-0.5">{h.date}</span>
                  <div>
                    <span className={`font-semibold ${h.type==="alert"?"text-red-600":h.type==="success"?"text-green-600":"text-gray-700"}`}>
                      {h.event}
                    </span>
                    <div className="text-gray-400 mt-0.5">{h.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: AI analysis */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🤖 AI 경쟁 분석 요약</h4>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed space-y-2">
            {detail.aiText.split("\n").map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-1" />;
              const parts = line.split(/\*\*(.*?)\*\*/g);
              return (
                <div key={i} className={line.startsWith("▲") || line.startsWith("▼") ? "ml-2 text-xs text-gray-500" : ""}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-900">{part}</strong> : part
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function RegionMap() {
  const [level, setLevel] = useState<Level>("sido");
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");
  const [competitor, setCompetitor] = useState<Competitor>("전체");
  const [device, setDevice] = useState("전체");
  const [subType, setSubType] = useState<SubType>("전체");
  const [supportType, setSupportType] = useState<SupportType>("전체");
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);

  const { data: sidoRaw = [] } = useRegionAgg("sido");
  const { data: sigunguRaw = [] } = useRegionAgg("sigungu");
  const { data: dongRaw = [] } = useRegionAgg("dong");

  const sidoStats   = useMemo(() => computeStats(sidoRaw,   competitor, device, subType, supportType), [sidoRaw,   competitor, device, subType, supportType]);
  const sigunguStats= useMemo(() => computeStats(sigunguRaw,competitor, device, subType, supportType), [sigunguRaw,competitor, device, subType, supportType]);
  const dongStats   = useMemo(() => computeStats(dongRaw,   competitor, device, subType, supportType), [dongRaw,   competitor, device, subType, supportType]);

  const sidoCells = useMemo(() =>
    SIDO_CELLS.map((c) => ({ ...c, stats: sidoStats.get(c.key) ?? null }))
  , [sidoStats]);  // eslint-disable-line

  const sigunguList = SIGUNGU_BY_SIDO[selectedSido] ?? [];
  const dongList = DONG_BY_SIGUNGU[selectedSigungu] ?? [];

  const onLevelChange = (l: Level) => {
    setLevel(l);
    setSelectedRegion(null);
    if (l === "sido") { setSelectedSido(""); setSelectedSigungu(""); }
    if (l === "sigungu") setSelectedSigungu("");
  };

  const handleSidoClick = (key: string, _short: string, stats: RegionStats | null) => {
    setSelectedRegion({ name: key, level: "sido", stats });
    setSelectedSido(key);
    setLevel("sigungu");
  };

  const handleSigunguClick = (key: string, _short: string, stats: RegionStats | null) => {
    setSelectedRegion({ name: key, level: "sigungu", stats });
  };

  const handleDongClick = (key: string, _short: string, stats: RegionStats | null) => {
    setSelectedRegion({ name: key, level: "dong", stats });
  };

  const compLabel = competitor === "전체" ? "KT·LGU 평균 대비" : `${competitor} 대비`;

  // Build sigungu grid cells
  const predefinedLayout = selectedSido ? SIGUNGU_LAYOUTS[selectedSido] : null;
  const sigunguAbsoluteCells = useMemo(() => {
    if (!predefinedLayout) return null;
    return sigunguList.map((name) => {
      const pos = predefinedLayout[name];
      if (!pos) return null;
      const stats = sigunguStats.get(name) ?? null;
      return { key: name, short: name.replace(/[시군구]/g, "").slice(0,3) || name.slice(0,3), row: pos.row, col: pos.col, stats };
    }).filter(Boolean) as { key: string; short: string; row: number; col: number; stats: RegionStats | null }[];
  }, [sigunguList, predefinedLayout, sigunguStats]);

  const sigunguFlexCells = useMemo(() => {
    if (predefinedLayout) return [];
    return sigunguList.map((name) => ({ name, stats: sigunguStats.get(name) ?? null }));
  }, [sigunguList, predefinedLayout, sigunguStats]);

  const dongFlexCells = useMemo(() =>
    dongList.map((d) => ({ name: d, stats: dongStats.get(d) ?? null }))
  , [dongList, dongStats]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">지역별 경쟁 현황</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-5">
        <div className="flex items-end gap-3">
          <Dropdown
            label="지역 단위"
            value={level}
            options={[
              { value: "sido", label: "전국 시도" },
              { value: "sigungu", label: "시군구" },
              { value: "dong", label: "읍면동" },
            ]}
            onChange={(v) => onLevelChange(v as Level)}
            minWidth={110}
          />
          {(level === "sigungu" || level === "dong") && (
            <Dropdown
              label="시도 선택"
              value={selectedSido}
              options={[{ value: "", label: "시도 선택..." }, ...SIDO_LIST.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => { setSelectedSido(v); setSelectedSigungu(""); setSelectedRegion(null); }}
              minWidth={160}
            />
          )}
          {level === "dong" && selectedSido && (
            <Dropdown
              label="시군구 선택"
              value={selectedSigungu}
              options={[{ value: "", label: "시군구 선택..." }, ...sigunguList.map((s) => ({ value: s, label: s }))]}
              onChange={setSelectedSigungu}
              minWidth={130}
            />
          )}
        </div>

        <div className="w-px h-9 bg-gray-200 self-center" />

        <div className="flex items-end gap-3 flex-wrap">
          <Dropdown
            label="비교 경쟁사"
            value={competitor}
            options={[{ value: "전체", label: "KT + LGU 평균" }, { value: "KT", label: "KT만" }, { value: "LGU", label: "LGU+만" }]}
            onChange={(v) => setCompetitor(v as Competitor)}
            minWidth={130}
          />
          <Dropdown
            label="단말 선택"
            value={device}
            options={DEVICE_LIST.map((d) => ({ value: d, label: d }))}
            onChange={setDevice}
            minWidth={150}
          />
          <Dropdown
            label="가입유형"
            value={subType}
            options={[{ value: "전체", label: "전체" }, { value: "010", label: "010 (신규)" }, { value: "MNP", label: "MNP (번이)" }, { value: "기변", label: "기변" }]}
            onChange={(v) => setSubType(v as SubType)}
            minWidth={120}
          />
          <Dropdown
            label="약정유형"
            value={supportType}
            options={[{ value: "전체", label: "전체" }, { value: "공시", label: "공시지원금" }, { value: "선약", label: "선택약정" }]}
            onChange={(v) => setSupportType(v as SupportType)}
            minWidth={120}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <span className="text-gray-500 text-xs font-semibold">SKT 단가 ({compLabel})</span>
        {LEGEND.map((l) => (
          <span key={l.bg} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span style={{ background: l.bg, width: 12, height: 12, borderRadius: 3, display: "inline-block", border: "1px solid rgba(0,0,0,0.1)" }} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-gray-400 text-xs">
          {device !== "전체" ? device : "전 기종"} · {subType !== "전체" ? subType : "전 가입유형"}
        </span>
      </div>

      {/* Map panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center bg-gray-50/60">
          <span className="text-gray-700 font-bold text-sm">
            {level === "sido" && "전국 시도별 현황 — 셀을 클릭하면 시군구 상세 보기"}
            {level === "sigungu" && (selectedSido ? `${selectedSido} 시군구별 현황` : "시군구별 현황 — 시도를 선택하세요")}
            {level === "dong" && (selectedSigungu ? `${selectedSigungu} 읍면동별 현황` : "읍면동별 현황 — 시군구를 선택하세요")}
          </span>
          {level !== "sido" && (
            <button
              onClick={() => onLevelChange(level === "dong" ? "sigungu" : "sido")}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              ← 상위 레벨로
            </button>
          )}
        </div>

        <div className="p-6 overflow-auto">
          {/* Sido: Korea cartogram */}
          {level === "sido" && (
            <AbsoluteGrid
              cells={sidoCells}
              cellW={CELL_W}
              cellH={CELL_H}
              onCellClick={handleSidoClick}
            />
          )}

          {/* Sigungu */}
          {level === "sigungu" && (
            selectedSido ? (
              <div>
                <p className="text-gray-400 text-xs mb-4">
                  {selectedSido} · {sigunguList.length}개 시군구 ·
                  <span className="text-gray-300 ml-1">셀 클릭 시 상세 분석 확인</span>
                </p>
                {predefinedLayout && sigunguAbsoluteCells ? (
                  <AbsoluteGrid
                    cells={sigunguAbsoluteCells}
                    cellW={SG_CELL_W}
                    cellH={SG_CELL_H}
                    onCellClick={handleSigunguClick}
                  />
                ) : (
                  <FlexGrid
                    cells={sigunguFlexCells}
                    cellW={SG_CELL_W}
                    cellH={SG_CELL_H}
                    onCellClick={handleSigunguClick}
                  />
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400 text-sm">
                상단의 <span className="font-semibold text-gray-500">시도 선택</span> 드롭다운에서 시도를 선택하세요.
              </div>
            )
          )}

          {/* Dong */}
          {level === "dong" && (
            selectedSigungu ? (
              <div>
                <p className="text-gray-400 text-xs mb-4">{selectedSido} {selectedSigungu} · {dongList.length}개 읍면동</p>
                <FlexGrid
                  cells={dongFlexCells}
                  cellW={80}
                  cellH={58}
                  onCellClick={handleDongClick}
                />
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400 text-sm">
                {selectedSido
                  ? <><span className="font-semibold text-gray-500">시군구 선택</span> 드롭다운에서 시군구를 선택하세요.</>
                  : "시도와 시군구를 차례로 선택하세요."}
              </div>
            )
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedRegion && (
        <RegionDetailPanel region={selectedRegion} onClose={() => setSelectedRegion(null)} />
      )}
    </div>
  );
}

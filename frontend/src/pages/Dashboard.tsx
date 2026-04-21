import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { useDevices } from "../api/devices";
import MultiSelect from "../components/MultiSelect";
import PriceBoxPlot, { DeviceBoxData } from "../components/PriceBoxPlot";

type ViewMode = "boxplot" | "table";
type SupportType = "공시" | "선약";
const ALL_CARRIERS = ["SKT", "KT", "LGU"];
const TOP20_COUNT = 20;

// ── Region data ─────────────────────────────────────────────────────────────

const SIDO_LIST = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const SIGUNGU_MAP: Record<string, string[]> = {
  서울: ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  경기: ["수원시","성남시","고양시","용인시","부천시","안산시","안양시","남양주시","화성시","평택시","의정부시","광주시","김포시","광명시","군포시","하남시","오산시","이천시","파주시","양주시"],
  인천: ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
  부산: ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
  대구: ["중구","동구","서구","남구","북구","수성구","달서구","달성군"],
  광주: ["동구","서구","남구","북구","광산구"],
  대전: ["동구","중구","서구","유성구","대덕구"],
  울산: ["중구","남구","동구","북구","울주군"],
  세종: ["세종시"],
  강원: ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
  충북: ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
  충남: ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
  전북: ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
  전남: ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
  경북: ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","군위군","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
  경남: ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
  제주: ["제주시","서귀포시"],
};

const DONG_MAP: Record<string, string[]> = {
  강남구: ["역삼동","삼성동","대치동","청담동","논현동","개포동","도곡동","압구정동","신사동","일원동"],
  강서구: ["화곡동","등촌동","가양동","마곡동","방화동","공항동","발산동","염창동","신정동"],
  서초구: ["서초동","잠원동","반포동","방배동","양재동","내곡동"],
  송파구: ["잠실동","방이동","오금동","가락동","문정동","장지동","거여동","마천동"],
  수원시: ["장안구","권선구","팔달구","영통구"],
  성남시: ["수정구","중원구","분당구"],
  고양시: ["덕양구","일산동구","일산서구"],
  용인시: ["처인구","기흥구","수지구"],
};

// ── Aggregation hook ─────────────────────────────────────────────────────────

function useFilteredAggregation(supportType: SupportType, sido: string, sigungu: string) {
  return useQuery({
    queryKey: ["aggregation-all-devices", supportType, sido, sigungu],
    queryFn: async () => {
      const params: Record<string, string> = { support_type: supportType };
      if (sido) params.region_sido = sido;
      if (sigungu) params.region_sigungu = sigungu;
      const { data } = await api.get("/aggregation/latest", { params });
      return data as any[];
    },
    refetchInterval: 60_000,
  });
}

// ── Hardcoded example data ───────────────────────────────────────────────────

const BASE_BOX_DATA: DeviceBoxData[] = [
  {
    deviceId: 1, deviceName: "아이폰17프로맥스",
    carriers: {
      SKT: { avg: 860000, top30: 930000, max: 995000 },
      KT:  { avg: 895000, top30: 965000, max: 1030000 },
      LGU: { avg: 845000, top30: 915000, max: 975000 },
    },
  },
  {
    deviceId: 2, deviceName: "아이폰17프로",
    carriers: {
      SKT: { avg: 710000, top30: 775000, max: 840000 },
      KT:  { avg: 745000, top30: 810000, max: 880000 },
      LGU: { avg: 700000, top30: 765000, max: 825000 },
    },
  },
  {
    deviceId: 3, deviceName: "아이폰17",
    carriers: {
      SKT: { avg: 560000, top30: 615000, max: 670000 },
      KT:  { avg: 585000, top30: 645000, max: 700000 },
      LGU: { avg: 550000, top30: 605000, max: 660000 },
    },
  },
  {
    deviceId: 4, deviceName: "갤럭시S26울트라",
    carriers: {
      SKT: { avg: 780000, top30: 855000, max: 920000 },
      KT:  { avg: 810000, top30: 885000, max: 955000 },
      LGU: { avg: 765000, top30: 840000, max: 905000 },
    },
  },
  {
    deviceId: 5, deviceName: "갤럭시S26+",
    carriers: {
      SKT: { avg: 620000, top30: 685000, max: 745000 },
      KT:  { avg: 650000, top30: 715000, max: 780000 },
      LGU: { avg: 610000, top30: 675000, max: 730000 },
    },
  },
  {
    deviceId: 6, deviceName: "갤럭시S26",
    carriers: {
      SKT: { avg: 490000, top30: 545000, max: 600000 },
      KT:  { avg: 515000, top30: 570000, max: 630000 },
      LGU: { avg: 480000, top30: 535000, max: 590000 },
    },
  },
  {
    deviceId: 7, deviceName: "갤럭시Z폴드7",
    carriers: {
      SKT: { avg: 960000, top30: 1045000, max: 1120000 },
      KT:  { avg: 990000, top30: 1075000, max: 1160000 },
      LGU: { avg: 945000, top30: 1030000, max: 1100000 },
    },
  },
  {
    deviceId: 8, deviceName: "갤럭시Z플립7",
    carriers: {
      SKT: { avg: 580000, top30: 640000, max: 700000 },
      KT:  { avg: 605000, top30: 670000, max: 735000 },
      LGU: { avg: 570000, top30: 630000, max: 690000 },
    },
  },
  {
    deviceId: 9, deviceName: "아이폰16프로",
    carriers: {
      SKT: { avg: 590000, top30: 650000, max: 710000 },
      KT:  { avg: 620000, top30: 685000, max: 745000 },
      LGU: { avg: 580000, top30: 640000, max: 700000 },
    },
  },
  {
    deviceId: 10, deviceName: "갤럭시A56",
    carriers: {
      SKT: { avg: 195000, top30: 220000, max: 250000 },
      KT:  { avg: 210000, top30: 235000, max: 265000 },
      LGU: { avg: 190000, top30: 215000, max: 245000 },
    },
  },
];

function applyFilters(data: DeviceBoxData[], supportType: SupportType, sido: string): DeviceBoxData[] {
  const supportFactor = supportType === "선약" ? 0.91 : 1.0;
  const regionFactor = sido ? 0.97 + Math.abs(sido.charCodeAt(0) % 5) * 0.01 : 1.0;
  const factor = supportFactor * regionFactor;
  if (Math.abs(factor - 1) < 0.001) return data;
  return data.map((d) => ({
    ...d,
    carriers: Object.fromEntries(
      Object.entries(d.carriers).map(([c, v]) => [c, v ? {
        avg: Math.round(v.avg * factor),
        top30: Math.round(v.top30 * factor),
        max: Math.round(v.max * factor),
      } : v])
    ),
  }));
}


// ── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("boxplot");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(ALL_CARRIERS);
  const [supportType, setSupportType] = useState<SupportType>("공시");
  const [regionSido, setRegionSido] = useState("");
  const [regionSigungu, setRegionSigungu] = useState("");
  const [regionDong, setRegionDong] = useState("");

  const { data: devices } = useDevices();
  const { data: aggData } = useFilteredAggregation(supportType, regionSido, regionSigungu);

  const sigunguList = regionSido ? (SIGUNGU_MAP[regionSido] ?? []) : [];
  const dongList = regionSigungu ? (DONG_MAP[regionSigungu] ?? []) : [];

  const deviceOptions = useMemo(() => {
    if (!devices) return [];
    return (devices as any[]).slice(0, TOP20_COUNT).map((d: any) => ({
      value: String(d.id),
      label: d.device_name,
    }));
  }, [devices]);

  const effectiveDevices = useMemo(() => {
    if (selectedDevices.length > 0) return selectedDevices;
    return deviceOptions.map((o) => o.value);
  }, [selectedDevices, deviceOptions]);

  const boxData = useMemo<DeviceBoxData[]>(() => {
    if (!devices || !aggData) return [];
    const deviceMap = new Map<number, string>(
      (devices as any[]).map((d: any) => [d.id, d.device_name])
    );
    const grouped = new Map<number, Map<string, { avg: number; top30: number; max: number }>>();
    for (const row of aggData) {
      if (!row.device_id || !row.carrier) continue;
      if (!grouped.has(row.device_id)) grouped.set(row.device_id, new Map());
      grouped.get(row.device_id)!.set(row.carrier, {
        avg: row.avg_price ?? 0,
        top30: row.top30_price ?? 0,
        max: row.max_price ?? 0,
      });
    }
    return effectiveDevices
      .map((idStr) => {
        const id = Number(idStr);
        const name = deviceMap.get(id);
        if (!name) return null;
        return { deviceId: id, deviceName: name, carriers: Object.fromEntries(grouped.get(id) ?? []) } as DeviceBoxData;
      })
      .filter(Boolean) as DeviceBoxData[];
  }, [devices, aggData, effectiveDevices]);

  const isMockData = boxData.length === 0 || boxData.every((d) => Object.keys(d.carriers).length === 0);

  const displayData = useMemo<DeviceBoxData[]>(() => {
    if (!isMockData) return boxData;
    // Use hardcoded example data, apply filter factors
    const filtered = selectedDevices.length > 0
      ? BASE_BOX_DATA.filter((d) => selectedDevices.includes(String(d.deviceId)))
      : BASE_BOX_DATA;
    return applyFilters(filtered, supportType, regionSido);
  }, [boxData, isMockData, selectedDevices, supportType, regionSido]);

  const carrierOptions = ALL_CARRIERS.map((c) => ({ value: c, label: c }));

  const regionLabel = [regionSido, regionSigungu, regionDong].filter(Boolean).join(" > ") || "전국";

  return (
    <div className="space-y-4">
      {/* Support type tabs + region row */}
      <div className="bg-white rounded-xl border shadow-sm">
        {/* Support type tabs */}
        <div className="flex border-b">
          {(["공시", "선약"] as SupportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSupportType(type)}
              className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                supportType === type
                  ? "border-blue-600 text-blue-700 bg-blue-50/40"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {type === "공시" ? "공시지원금" : "선택약정 (선약)"}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center px-4 text-xs text-gray-400">
            {supportType === "공시" ? "공시지원금 적용 단가 기준" : "선택약정 할인 적용 단가 기준"}
          </div>
        </div>

        {/* Region selectors */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">지역</span>

          {/* 시도 */}
          <select
            value={regionSido}
            onChange={(e) => { setRegionSido(e.target.value); setRegionSigungu(""); setRegionDong(""); }}
            className="px-3 py-1.5 border rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-blue-400 min-w-[100px]"
          >
            <option value="">전국</option>
            {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* 구군 */}
          <select
            value={regionSigungu}
            onChange={(e) => { setRegionSigungu(e.target.value); setRegionDong(""); }}
            disabled={!regionSido}
            className="px-3 py-1.5 border rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-blue-400 min-w-[120px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">시군구 전체</option>
            {sigunguList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* 동 */}
          <select
            value={regionDong}
            onChange={(e) => setRegionDong(e.target.value)}
            disabled={!regionSigungu || dongList.length === 0}
            className="px-3 py-1.5 border rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-blue-400 min-w-[120px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">읍면동 전체</option>
            {dongList.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Active region pill */}
          {(regionSido || regionSigungu || regionDong) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">
              {regionLabel}
              <button
                onClick={() => { setRegionSido(""); setRegionSigungu(""); setRegionDong(""); }}
                className="ml-0.5 text-blue-400 hover:text-blue-600 leading-none"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Header row with view/carrier/device filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">
          단말 단가 현황
          <span className="ml-2 text-sm font-normal text-gray-400">
            {supportType === "공시" ? "공시지원금" : "선약"} · {regionLabel}
          </span>
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["boxplot", "table"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === m ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "boxplot" ? "박스플롯" : "테이블"}
              </button>
            ))}
          </div>

          {/* Carrier filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">이통사</span>
            <MultiSelect
              options={carrierOptions}
              selected={selectedCarriers}
              onChange={setSelectedCarriers}
              placeholder="이통사 선택"
              maxDisplay={3}
            />
          </div>

          {/* Device filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">기종</span>
            <MultiSelect
              options={deviceOptions}
              selected={selectedDevices}
              onChange={setSelectedDevices}
              placeholder={`주요 ${TOP20_COUNT}개 기종`}
              maxDisplay={2}
            />
          </div>
        </div>
      </div>

      {/* Mock data notice */}
      {isMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          ※ 단가 데이터가 없어 출고가 기반 예시 데이터가 표시됩니다. 단가 수집 탭에서 데이터를 입력하면 실제 값이 표시됩니다.
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {selectedCarriers.length === 0 ? (
          <div className="py-20 text-center text-gray-400">이통사를 하나 이상 선택하세요.</div>
        ) : displayData.length === 0 ? (
          <div className="py-20 text-center text-gray-400">단말 데이터가 없습니다.</div>
        ) : viewMode === "boxplot" ? (
          <div className="p-4">
            <PriceBoxPlot data={displayData} selectedCarriers={selectedCarriers} height={420} />
          </div>
        ) : (
          <TableView data={displayData} selectedCarriers={selectedCarriers} />
        )}
      </div>
    </div>
  );
}

// ── Table view ───────────────────────────────────────────────────────────────

function TableView({ data, selectedCarriers }: { data: DeviceBoxData[]; selectedCarriers: string[] }) {
  const CARRIER_COLORS: Record<string, string> = {
    SKT: "#e8003d", KT: "#f03f13", LGU: "#a100ff",
  };
  const carriers = selectedCarriers.filter((c) => c in CARRIER_COLORS);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="px-4 py-3 text-left border-b font-medium sticky left-0 bg-gray-50 z-10">단말</th>
            {carriers.map((c) => (
              <th
                key={c}
                className="px-3 py-3 border-b font-medium text-center"
                colSpan={3}
                style={{ borderBottom: `2px solid ${CARRIER_COLORS[c]}` }}
              >
                <span style={{ color: CARRIER_COLORS[c] }}>{c}</span>
              </th>
            ))}
          </tr>
          <tr className="bg-gray-50 text-xs text-gray-400">
            <th className="px-4 py-1.5 border-b sticky left-0 bg-gray-50" />
            {carriers.map((c) =>
              ["평균", "상위30%", "최대"].map((label) => (
                <th key={`${c}-${label}`} className="px-3 py-1.5 border-b text-center">
                  {label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((device, i) => (
            <tr key={device.deviceId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="px-4 py-2.5 border-b font-medium text-gray-700 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                {device.deviceName}
              </td>
              {carriers.map((c) => {
                const v = device.carriers[c];
                return (
                  <>
                    <td key={`${c}-avg`} className="px-3 py-2.5 border-b text-right font-mono text-gray-700">
                      {v ? `${Math.round(v.avg / 10000)}만` : "—"}
                    </td>
                    <td key={`${c}-top30`} className="px-3 py-2.5 border-b text-right font-mono text-gray-700">
                      {v ? `${Math.round(v.top30 / 10000)}만` : "—"}
                    </td>
                    <td key={`${c}-max`} className="px-3 py-2.5 border-b text-right font-mono font-semibold" style={{ color: v ? CARRIER_COLORS[c] : undefined }}>
                      {v ? `${Math.round(v.max / 10000)}만` : "—"}
                    </td>
                  </>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

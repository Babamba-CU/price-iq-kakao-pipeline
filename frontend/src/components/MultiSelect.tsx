import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
}

export default function MultiSelect({ options, selected, onChange, placeholder = "선택", maxDisplay = 2 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length <= maxDisplay
      ? selected.join(", ")
      : `${selected.slice(0, maxDisplay).join(", ")} 외 ${selected.length - maxDisplay}개`;

  return (
    <div ref={ref} className="relative inline-block min-w-[160px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border rounded-lg bg-white text-sm hover:border-blue-400 focus:outline-none"
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-gray-700"}>{displayLabel}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
          <div className="flex gap-2 px-3 py-2 border-b">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">전체선택</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">초기화</button>
            <span className="ml-auto text-xs text-gray-400">{selected.length}/{options.length}</span>
          </div>
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

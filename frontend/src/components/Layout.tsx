import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth";

const NAV = [
  { to: "/", label: "대시보드" },
  { to: "/map", label: "지역 현황" },
  { to: "/analysis", label: "경쟁 분석" },
  { to: "/ingest", label: "단가 수집" },
  { to: "/admin", label: "관리자" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <span className="font-bold text-lg text-blue-700">PNF PRICE-IQ</span>
        <nav className="flex gap-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `text-sm px-3 py-1 rounded ${isActive ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-600 hover:text-blue-600"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{(user as any)?.full_name ?? (user as any)?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
            로그아웃
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

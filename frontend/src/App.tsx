import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./api/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegionMap from "./pages/RegionMap";
import CompetitionAnalysis from "./pages/CompetitionAnalysis";
import IngestPage from "./pages/IngestPage";
import AdminPage from "./pages/AdminPage";
import WholesaleDashboard from "./pages/WholesaleDashboard";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="map" element={<RegionMap />} />
        <Route path="analysis" element={<CompetitionAnalysis />} />
        <Route path="ingest" element={<IngestPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="wholesale" element={<WholesaleDashboard />} />
      </Route>
      <Route path="/wholesale-simple" element={<WholesaleDashboard />} />
    </Routes>
  );
}

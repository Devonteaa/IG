import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AppShell from "./AppShell";
import Overview from "./pages/Overview";
import Inventory from "./pages/Inventory";
import StockAdjustments from "./pages/StockAdjustments";
import Trends from "./pages/Trends";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Forecast from "./pages/Forecast";
import Settings from "./pages/Settings";
import TrackedEquipment from "./pages/TrackedEquipment";
import { StoreProvider } from "./store";
import { initTeams } from "./teams";

export default function App() {
  useEffect(() => { initTeams(); }, []);

  return (
    <StoreProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/stock-adjustments" element={<StockAdjustments />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/tracked-equipment" element={<TrackedEquipment />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}

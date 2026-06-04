import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { CRMPage } from "../pages/CRM/CRMPage";
import { StockPage } from "../pages/Stock/StockPage";
import { FinancialPage } from "../pages/Financial/FinancialPage";
import { SchedulePage } from "../pages/Schedule/SchedulePage";
import { ReportsPage } from "../pages/Reports/ReportsPage";
import { SettingsPage } from "../pages/Settings/SettingsPage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/financial" element={<FinancialPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

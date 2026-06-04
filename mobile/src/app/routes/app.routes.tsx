import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DashboardScreen } from "../../screens/Dashboard/DashboardScreen";
import { CRMScreen } from "../../screens/CRM/CRMScreen";
import { StockScreen } from "../../screens/Stock/StockScreen";
import { FinancialScreen } from "../../screens/Financial/FinancialScreen";
import { ScheduleScreen } from "../../screens/Schedule/ScheduleScreen";
import { ReportsScreen } from "../../screens/Reports/ReportsScreen";
import { SettingsScreen } from "../../screens/Settings/SettingsScreen";

const Tab = createBottomTabNavigator();

export function AppRoutes() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="CRM" component={CRMScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="Financial" component={FinancialScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

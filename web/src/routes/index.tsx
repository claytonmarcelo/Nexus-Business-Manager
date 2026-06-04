import React from "react";
import { AuthRoutes } from "./auth.routes";
import { AppRoutes } from "./app.routes";

type RoutesProps = {
  isAuthenticated?: boolean;
};

export function Routes({ isAuthenticated = false }: RoutesProps) {
  return isAuthenticated ? <AppRoutes /> : <AuthRoutes />;
}

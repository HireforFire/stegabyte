import type { Metadata } from "next";
import { DashboardPage } from "@/features/dashboard/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your Stegabyte workspace.",
};

export default function Page() {
  return <DashboardPage />;
}

import { getCurrentUser } from "@/lib/auth/user";

import { DashboardTopbar } from "./dashboard-topbar";

export async function DashboardTopbarUser() {
  const user = await getCurrentUser();

  return <DashboardTopbar user={{ fullName: user.fullName, email: user.email }} />;
}

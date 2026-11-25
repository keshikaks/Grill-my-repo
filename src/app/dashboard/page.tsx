import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth/session";
import { getUserDashboardData } from "@/lib/services/persistence/persistence-service";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = {
  title: "Engineer Dashboard | Grill My Repo",
  description: "View your analysed repositories, active grilling sessions, and viva defence report cards.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const data = await getUserDashboardData(user.id);

  const initialData = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    ...data,
  };

  return <DashboardView initialData={initialData} />;
}

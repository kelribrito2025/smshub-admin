import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "./DashboardLayout";
import TopNavLayout from "./TopNavLayout";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { BreadcrumbItem } from './Breadcrumbs';

export default function DashboardLayoutWrapper({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  const { loading: authLoading } = useAuth();
  const { data: navLayout, isLoading: layoutLoading } = trpc.auth.getNavLayout.useQuery(undefined, {
    enabled: !authLoading,
  });

  if (authLoading || layoutLoading) {
    return <DashboardLayoutSkeleton />;
  }

  // Use TopNavLayout if user prefers top navigation, otherwise use sidebar
  if (navLayout === "top") {
    return (
      <TopNavLayout breadcrumbs={breadcrumbs}>
        {children}
      </TopNavLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      {children}
    </DashboardLayout>
  );
}

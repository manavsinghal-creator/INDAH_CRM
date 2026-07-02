import { getActivityLogs } from '@/app/actions';
import { ReportingDashboard } from '@/components/reporting-dashboard';

export default async function ReportsPage() {
  const logs = await getActivityLogs();

  return (
    <main className="container mx-auto px-4 py-8 md:px-6">
      <ReportingDashboard logs={logs} />
    </main>
  );
}

import { getActivityLogs } from '@/app/actions';
import { ActivityLogList } from '@/components/activity-log-list';

export default async function ActivityPage() {
  const activityLogs = await getActivityLogs();

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <ActivityLogList initialLogs={activityLogs} />
    </main>
  );
}

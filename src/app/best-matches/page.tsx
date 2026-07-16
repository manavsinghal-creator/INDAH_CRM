import { getContacts, getListings, getSiteVisits } from '@/app/actions';
import { BestMatchesDashboard } from '@/components/best-matches-dashboard';
import { buildBestMatches } from '@/lib/best-matches';

export default async function BestMatchesPage() {
  const [contacts, listings, siteVisits] = await Promise.all([
    getContacts(),
    getListings(),
    getSiteVisits(),
  ]);

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <BestMatchesDashboard initialData={buildBestMatches(contacts, listings, siteVisits)} />
    </main>
  );
}

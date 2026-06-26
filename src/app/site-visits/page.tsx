import { getContacts, getListings, getSiteVisits } from '@/app/actions';
import { SiteVisitList } from '@/components/site-visit-list';

export default async function SiteVisitsPage() {
  const [siteVisits, contacts, listings] = await Promise.all([
    getSiteVisits(),
    getContacts(),
    getListings(),
  ]);

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <SiteVisitList initialSiteVisits={siteVisits} contacts={contacts} listings={listings} />
    </main>
  );
}

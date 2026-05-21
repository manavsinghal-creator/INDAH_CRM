
import { getChannelPartners } from "@/app/actions";
import { ChannelPartnerList } from "@/components/channel-partner-list";

export default async function PartnersPage() {
  const initialPartners = await getChannelPartners();

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <ChannelPartnerList initialPartners={initialPartners} />
    </main>
  );
}

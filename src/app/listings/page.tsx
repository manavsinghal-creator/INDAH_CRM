import { getListings } from "@/app/actions";
import { ListingList } from "@/components/listing-list";

export default async function ListingsPage() {
  const initialListings = await getListings();

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <ListingList initialListings={initialListings} />
    </main>
  );
}

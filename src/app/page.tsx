import { getContacts, getListings } from "@/app/actions";
import { ContactList } from "@/components/contact-list";

export default async function Home() {
  const initialContacts = await getContacts();
  const listings = await getListings();

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <ContactList initialContacts={initialContacts} allListings={listings} />
    </main>
  );
}

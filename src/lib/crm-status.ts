import type { Contact, LeadStage, Listing, ListingAvailability } from '@/lib/types';

export function getContactLeadStage(contact: Contact): LeadStage {
  return contact.leadStage || 'New';
}

export function getListingAvailability(listing: Listing): ListingAvailability {
  if (listing.isActive === false && (!listing.availabilityStatus || listing.availabilityStatus === 'Available')) {
    return 'Temporarily Unavailable';
  }
  if (listing.availabilityStatus) return listing.availabilityStatus;
  return 'Available';
}

export function isListingAvailable(listing: Listing) {
  return getListingAvailability(listing) === 'Available' && listing.isActive !== false;
}

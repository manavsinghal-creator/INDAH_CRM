import type { Listing } from '@/lib/types';

export function getListingDisplayTitle(listing: Pick<Listing, 'titleProjectName' | 'listingName'>) {
  return listing.titleProjectName?.trim() || listing.listingName;
}

export function formatListingPrice(listing: Pick<Listing, 'basePrice'> & { priceOnRequest?: boolean }) {
  if (listing.priceOnRequest) return 'Price on request';
  if (!listing.basePrice) return 'Price not set';
  return `₹${Number(listing.basePrice).toLocaleString('en-IN')} Cr`;
}

export function formatListingPricePlain(listing: Pick<Listing, 'basePrice'> & { priceOnRequest?: boolean }) {
  if (listing.priceOnRequest) return 'Price on request';
  if (!listing.basePrice) return 'Price not set';
  return `INR ${Number(listing.basePrice).toLocaleString('en-IN')} Cr`;
}

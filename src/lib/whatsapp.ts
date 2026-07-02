export type WhatsAppListing = {
  id: string;
  listingId?: string;
  listingName: string;
  titleProjectName?: string;
  location: string;
  bhkConfiguration: string;
  propertyType: string;
  basePrice: number;
  priceOnRequest?: boolean;
  listingUrl?: string;
  externalPublicLink?: string;
  matchReason?: string;
};

export function normalizeWhatsAppPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  if (digits.length === 10) digits = `91${digits}`;

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function formatListingPrice(price: number) {
  return `INR ${Number(price).toLocaleString('en-IN')} Cr`;
}

function listingBlock(listing: WhatsAppListing) {
  const link = listing.externalPublicLink || listing.listingUrl;
  const title = listing.titleProjectName || listing.listingName;
  const highlights = listing.matchReason
    ? listing.matchReason
      .replace(/^why it matches:\s*/i, '')
      .replace(/\.$/, '')
    : '';
  return [
    `*${title}*${listing.listingId ? ` (${listing.listingId})` : ''}`,
    `${listing.bhkConfiguration} ${listing.propertyType} in ${listing.location}`,
    `Price: ${listing.priceOnRequest ? 'Price on request' : formatListingPrice(listing.basePrice)}`,
    highlights ? `Highlights: ${highlights}` : null,
    `Location: ${listing.location}`,
    link ? `Please open this link to see the photos and full details: ${link}` : null,
  ].filter(Boolean).join('\n');
}

export function generateWhatsAppDraft(recipientName: string, listings: WhatsAppListing[]) {
  const firstName = recipientName.trim().split(/\s+/)[0] || 'there';
  const intro = listings.length === 1
    ? 'I found one property that is worth your attention based on what you had discussed with us.'
    : 'I shortlisted a few properties that are worth your attention based on what you had discussed with us.';
  const cta = listings.length === 1
    ? 'Please open the link once and tell me if you would like me to share more details or plan a site visit.'
    : 'Please open the links once and tell me which ones you would like to discuss or visit.';

  return [
    `Hi ${firstName},`,
    '',
    intro,
    '',
    listings.map(listingBlock).join('\n\n'),
    '',
    cta,
    '',
    'Regards,',
    'INDAH Sales Team',
  ].join('\n');
}

export function createWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

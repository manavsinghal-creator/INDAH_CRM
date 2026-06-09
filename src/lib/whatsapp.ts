export type WhatsAppListing = {
  id: string;
  listingId?: string;
  listingName: string;
  location: string;
  bhkConfiguration: string;
  propertyType: string;
  basePrice: number;
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
  return [
    `*${listing.listingName}*${listing.listingId ? ` (${listing.listingId})` : ''}`,
    listing.matchReason ? `Why it matches: ${listing.matchReason}` : null,
    `Price: ${formatListingPrice(listing.basePrice)}`,
    `Location: ${listing.location}`,
    `Configuration: ${listing.bhkConfiguration} ${listing.propertyType}`,
    link ? `View listing: ${link}` : null,
  ].filter(Boolean).join('\n');
}

export function generateWhatsAppDraft(recipientName: string, listings: WhatsAppListing[]) {
  const firstName = recipientName.trim().split(/\s+/)[0] || 'there';
  const intro = listings.length === 1
    ? 'I found a property that looks like a strong match for your preferences:'
    : 'I found a few properties that look like strong matches for your preferences:';

  return [
    `Hello ${firstName},`,
    '',
    intro,
    '',
    listings.map(listingBlock).join('\n\n'),
    '',
    listings.length === 1
      ? 'Would you like more details or to arrange a viewing?'
      : 'Which of these would you like to explore further?',
    '',
    'Best regards,',
    'INDAH LIVING',
  ].join('\n');
}

export function createWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

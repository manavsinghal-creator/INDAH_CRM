import type { WhatsAppListing } from '@/lib/whatsapp';
import { formatListingPrice } from '@/lib/whatsapp';

function listingBlock(listing: WhatsAppListing) {
  const link = listing.externalPublicLink || listing.listingUrl;
  return [
    `${listing.listingName}${listing.listingId ? ` (${listing.listingId})` : ''}`,
    listing.matchReason ? `Why it matches: ${listing.matchReason}` : null,
    `Price: ${formatListingPrice(listing.basePrice)}`,
    `Location: ${listing.location}`,
    `Configuration: ${listing.bhkConfiguration} ${listing.propertyType}`,
    link ? `View listing: ${link}` : null,
  ].filter(Boolean).join('\n');
}

export function generatePropertyEmail(recipientName: string, listings: WhatsAppListing[]) {
  const firstName = recipientName.trim().split(/\s+/)[0] || 'there';
  const subject = listings.length === 1
    ? `A property selected for you - ${listings[0].listingId || listings[0].listingName}`
    : `Interesting property options selected for you`;
  const body = [
    `Hi ${firstName},`,
    '',
    listings.length === 1
      ? 'I am sharing a property that looks like a strong match for your requirements:'
      : 'I am sharing a few properties that look like strong matches for your requirements:',
    '',
    listings.map(listingBlock).join('\n\n'),
    '',
    'Please let me know which options interest you, and our sales team will be happy to share more details or arrange a viewing.',
    '',
    'Regards,',
    'Sales Team',
    'INDAH LIVING',
  ].join('\n');

  return { subject, body };
}

export function createPropertyEmailUrl(email: string, subject: string, body: string) {
  if (!email.trim()) return null;
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

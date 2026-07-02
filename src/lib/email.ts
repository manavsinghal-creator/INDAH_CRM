import type { WhatsAppListing } from '@/lib/whatsapp';
import { formatListingPricePlain } from '@/lib/listing-display';

function listingBlock(listing: WhatsAppListing) {
  const link = listing.externalPublicLink || listing.listingUrl;
  const title = listing.titleProjectName || listing.listingName;
  return [
    `${title}${listing.listingId ? ` (${listing.listingId})` : ''}`,
    `${listing.bhkConfiguration} ${listing.propertyType} in ${listing.location}`,
    `Price: ${formatListingPricePlain(listing)}`,
    listing.matchReason ? `Highlights: ${listing.matchReason.replace(/^why it matches:\s*/i, '').replace(/\.$/, '')}` : null,
    `Location: ${listing.location}`,
    link ? `Open full listing details: ${link}` : null,
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

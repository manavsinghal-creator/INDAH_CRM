export type WhatsAppListing = {
  id: string;
  listingId?: string;
  listingName: string;
  titleProjectName?: string;
  location: string;
  description?: string;
  bhkConfiguration: string;
  propertyType: string;
  basePrice: number;
  priceOnRequest?: boolean;
  projectStatus?: string;
  expectedPossessionDate?: string;
  usps?: string[];
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
  return `INR ${Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function formatPossession(listing: WhatsAppListing) {
  if (listing.projectStatus === 'Ready to Move') return 'Ready to move in';
  if (listing.projectStatus === 'Under Construction') {
    return listing.expectedPossessionDate
      ? `Under construction, expected possession ${listing.expectedPossessionDate}`
      : 'Under construction';
  }
  return listing.projectStatus || 'Status available on request';
}

function fallbackUsps(listing: WhatsAppListing) {
  const values = [
    listing.location ? `Located in ${listing.location}` : null,
    listing.propertyType ? `${listing.propertyType} format` : null,
    listing.bhkConfiguration ? `${listing.bhkConfiguration} configuration` : null,
    listing.projectStatus ? formatPossession(listing) : null,
    listing.matchReason
      ? listing.matchReason
        .replace(/^why it matches:\s*/i, '')
        .replace(/\.$/, '')
      : null,
  ];
  return values.filter((value): value is string => Boolean(value));
}

function formatUsps(listing: WhatsAppListing) {
  const usps = (listing.usps?.length ? listing.usps : fallbackUsps(listing))
    .map((usp) => usp.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!usps.length) return ['Details and investment fit can be reviewed on the website link.'];
  return usps;
}

function listingBlock(listing: WhatsAppListing) {
  const link = listing.externalPublicLink || listing.listingUrl;
  const title = listing.titleProjectName || listing.listingName;
  const description = listing.description?.trim()
    || `${listing.bhkConfiguration} ${listing.propertyType} in ${listing.location}`;
  const usps = formatUsps(listing);

  return [
    `*${title}*`,
    `Description: ${description}`,
    `Price: ${listing.priceOnRequest ? 'Price on request' : formatListingPrice(listing.basePrice)}`,
    'Key highlights:',
    ...usps.map((usp, index) => `${index + 1}. ${usp}`),
    `Position: ${formatPossession(listing)}`,
    link ? `Website link: ${link}` : null,
  ].filter(Boolean).join('\n');
}

export function generateWhatsAppDraft(recipientName: string, listings: WhatsAppListing[]) {
  const firstName = recipientName.trim().split(/\s+/)[0] || 'there';
  const intro = listings.length === 1
    ? 'I found one property that is worth your attention based on what you had discussed with us.'
    : 'I shortlisted a few properties that are worth your attention based on what you had discussed with us.';
  const cta = listings.length === 1
    ? 'Please open the website link once, see the photos and details, and tell me if you would like me to arrange a site visit.'
    : 'Please open the website links once, see the photos and details, and tell me which options you would like to discuss or visit.';

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

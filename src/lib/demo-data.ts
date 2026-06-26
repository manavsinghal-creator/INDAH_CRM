import type {
  ChannelPartner,
  ChannelPartnerFormData,
  Contact,
  ContactFormData,
  Listing,
  ListingFormData,
  SiteVisit,
  SiteVisitFormData,
} from '@/lib/types';

const now = new Date().toISOString();

export const demoContacts: Contact[] = [
  {
    id: 'demo-contact-1',
    serialNumber: 'N101',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '+91 98765 43210',
    budget: '3-6',
    status: 'Hot',
    city: 'Mumbai',
    contactType: 'Buyer',
    leadStage: 'Qualified',
    locationPreference: 'Assagao, Siolim',
    requirementPurpose: ['Purchase for Self Use', 'Investment'],
    propertyPreference: ['Villa', 'Apartment'],
    offeredListings: ['demo-listing-1'],
    notes: 'Looking for a premium holiday home with rental potential.',
    referenceContact: 'Instagram lead',
    isActive: true,
    createdAt: '2026-05-18T10:30:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-contact-2',
    serialNumber: 'N102',
    name: 'Nisha Kapoor',
    email: 'nisha.kapoor@example.com',
    phone: '+91 99887 77665',
    budget: '6-10',
    status: 'Warm',
    city: 'Delhi',
    contactType: 'Buyer',
    leadStage: 'Property Shared',
    locationPreference: 'Anjuna, Vagator',
    requirementPurpose: ['Investment', 'Short-Term Rental'],
    propertyPreference: ['Villa'],
    offeredListings: ['demo-listing-2'],
    notes: 'Prefers gated projects with clear title and private pool.',
    referenceContact: 'Channel partner',
    isActive: true,
    createdAt: '2026-05-20T09:15:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-contact-3',
    serialNumber: 'N103',
    name: 'Rohan Dsouza',
    email: 'rohan.dsouza@example.com',
    phone: '+91 91234 56780',
    budget: '1-3',
    status: 'Cold',
    city: 'Goa',
    contactType: 'Seller',
    leadStage: 'New',
    locationPreference: 'Porvorim',
    requirementPurpose: ['Lease'],
    propertyPreference: ['Apartment'],
    offeredListings: [],
    notes: 'Owns a resale apartment and may list after valuation.',
    referenceContact: 'Walk-in',
    isActive: true,
    createdAt: '2026-05-22T12:45:00.000Z',
    updatedAt: now,
  },
];

export const demoListings: Listing[] = [
  {
    id: 'demo-listing-1',
    listingId: 'L201',
    listingName: 'Assagao Courtyard Villa',
    projectName: 'The Banyan Residences',
    developerName: 'Indah Living',
    contactPerson: 'Meera Rao',
    phone: '+91 90000 11111',
    email: 'sales@indahliving.example',
    propertyAddress: 'Assagao, North Goa',
    location: 'Assagao',
    description: 'A private 3 BHK villa with a courtyard pool, tropical landscaping, and high rental appeal.',
    dateOfMeeting: '2026-05-15',
    propertyType: 'Villa',
    furnishing: 'Fully Furnished',
    projectStatus: 'Ready to Move',
    websiteStatus: 'Approved for website upload',
    highlight: 'Top Choice',
    expectedPossessionDate: 'Ready',
    bhkConfiguration: '3 BHK',
    builtUpArea: 2850,
    carpetArea: 2350,
    plotArea: 420,
    floors: 'G+1',
    unitFloor: 'Villa',
    totalUnits: 8,
    availableUnits: 2,
    basePrice: 5.75,
    pricePerSqFt: 24468,
    taxesApplicable: ['GST', 'Registration'],
    paymentSchedule: '20% booking, 30% agreement, balance on possession',
    amenities: ['Swimming Pool', '24/7 Security', 'Garden', 'Power Backup'],
    reraRegistration: 'GOA-DEMO-001',
    titleClear: true,
    completionCertificate: 'Available',
    constructionQuality: 'High',
    architectDesigner: 'Studio Verde',
    exclusiveMandate: true,
    marketingMaterials: ['Photos', 'Floor Plan', 'Brochure'],
    listingUrl: 'https://example.com/assagao-courtyard-villa',
    externalPublicLink: '',
    virtualTourLink: '',
    stagingAvailable: true,
    modelFlatReady: true,
    idealBuyerProfile: 'HNIs looking for a managed vacation home with rental yield.',
    accessibility: 'Internal Road',
    distanceFromMainRoad: '600 m',
    usps: ['tropical villa', 'clear title', 'rental friendly', 'amazing pool'],
    notes: 'High-priority showcase listing for North Goa buyers.',
    additionalActions: ['Upload website copy', 'Schedule drone shoot'],
    availabilityStatus: 'Available',
    isActive: true,
    createdAt: '2026-05-12T08:00:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-listing-2',
    listingId: 'L202',
    listingName: 'Vagator Hill View Estate',
    projectName: 'Casa Alto',
    developerName: 'Casa Alto Developers',
    contactPerson: 'Karan Shah',
    phone: '+91 90000 22222',
    email: 'karan@example.com',
    propertyAddress: 'Near Vagator Hill, North Goa',
    location: 'Vagator',
    description: 'A 4 BHK luxury villa with hill views, private pool, and premium finishes.',
    dateOfMeeting: '2026-05-17',
    propertyType: 'Villa',
    furnishing: 'Semi Furnished',
    projectStatus: 'Under Construction',
    websiteStatus: 'Uploaded on website',
    highlight: 'Amazing View',
    expectedPossessionDate: '2026-12-31',
    bhkConfiguration: '4 BHK',
    builtUpArea: 4100,
    carpetArea: 3600,
    plotArea: 650,
    floors: 'G+1',
    unitFloor: 'Villa',
    totalUnits: 5,
    availableUnits: 1,
    basePrice: 8.5,
    pricePerSqFt: 23611,
    taxesApplicable: ['GST', 'Stamp Duty'],
    paymentSchedule: 'Construction-linked plan',
    amenities: ['Swimming Pool', 'Gym/Fitness Center', 'Terrace', 'Power Backup'],
    reraRegistration: 'GOA-DEMO-002',
    titleClear: true,
    completionCertificate: 'Pending',
    constructionQuality: 'High',
    architectDesigner: 'Atelier North',
    exclusiveMandate: false,
    marketingMaterials: ['Render Images', 'Brochure'],
    listingUrl: 'https://example.com/vagator-hill-view-estate',
    externalPublicLink: '',
    virtualTourLink: '',
    stagingAvailable: false,
    modelFlatReady: false,
    idealBuyerProfile: 'Luxury buyers wanting views and privacy.',
    accessibility: 'Main Road',
    distanceFromMainRoad: '250 m',
    usps: ['hill view', 'designer home', 'high roi'],
    notes: 'Good match for Delhi and Mumbai buyers.',
    additionalActions: ['Confirm possession timeline'],
    availabilityStatus: 'Available',
    isActive: true,
    createdAt: '2026-05-14T08:00:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-listing-3',
    listingId: 'L203',
    listingName: 'Porvorim Smart Apartment',
    projectName: 'Urban Nest',
    developerName: 'Urban Nest Goa',
    contactPerson: 'Dev Fernandes',
    phone: '+91 90000 33333',
    email: 'dev@example.com',
    propertyAddress: 'Porvorim, North Goa',
    location: 'Porvorim',
    description: 'A compact 2 BHK apartment close to schools, offices, and daily conveniences.',
    dateOfMeeting: '2026-05-19',
    propertyType: 'Apartment',
    furnishing: 'Unfurnished',
    projectStatus: 'Ready to Move',
    websiteStatus: 'Approved for website upload',
    expectedPossessionDate: 'Ready',
    bhkConfiguration: '2 BHK',
    builtUpArea: 1250,
    carpetArea: 980,
    plotArea: 0,
    floors: 'G+6',
    unitFloor: '4',
    totalUnits: 42,
    availableUnits: 6,
    basePrice: 1.65,
    pricePerSqFt: 16837,
    taxesApplicable: ['Registration'],
    paymentSchedule: 'Standard bank loan plan',
    amenities: ['Lift', 'Power Backup', '24/7 Security'],
    reraRegistration: 'GOA-DEMO-003',
    titleClear: true,
    completionCertificate: 'Available',
    constructionQuality: 'Standard',
    architectDesigner: 'Local Design Studio',
    exclusiveMandate: true,
    marketingMaterials: ['Photos'],
    listingUrl: 'https://example.com/porvorim-smart-apartment',
    externalPublicLink: '',
    virtualTourLink: '',
    stagingAvailable: false,
    modelFlatReady: true,
    idealBuyerProfile: 'End users and first-time investors.',
    accessibility: 'Main Road',
    distanceFromMainRoad: '100 m',
    usps: ['family friendly', 'prime lane', 'high-speed internet'],
    notes: 'Good entry-level listing for warm leads.',
    additionalActions: ['Add carpet area certificate'],
    availabilityStatus: 'Available',
    isActive: true,
    createdAt: '2026-05-16T08:00:00.000Z',
    updatedAt: now,
  },
];

export const demoSiteVisits: SiteVisit[] = [
  {
    id: 'demo-site-visit-1',
    contactId: 'demo-contact-1',
    contactName: 'Aarav Mehta',
    listingIds: ['demo-listing-1'],
    listingLabels: ['L201 - Assagao Courtyard Villa'],
    visitAt: now,
    outcome: 'Interested',
    notes: 'Liked the villa layout and asked for rental projection.',
    followUpDate: '',
    createdByName: 'Admin',
    createdByEmail: 'manavsinghal@gmail.com',
    createdAt: now,
    updatedAt: now,
  },
];

export const demoChannelPartners: ChannelPartner[] = [
  {
    id: 'demo-partner-1',
    serialNumber: 'P301',
    name: 'Priya Malhotra',
    companyName: 'Coastal Keys Realty',
    phone: '+91 91111 22222',
    alternatePhone: '+91 93333 44444',
    email: 'priya@coastalkeys.example',
    city: 'Mumbai',
    partnerType: 'Official',
    clienteleType: 'High',
    investmentPreference: 'Residential',
    createdAt: '2026-05-10T08:00:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-partner-2',
    serialNumber: 'P302',
    name: 'Kabir Sethi',
    companyName: 'North Goa Property Circle',
    phone: '+91 92222 33333',
    alternatePhone: '',
    email: 'kabir@ngpc.example',
    city: 'Goa',
    partnerType: 'General',
    clienteleType: 'Medium',
    investmentPreference: 'Commercial',
    createdAt: '2026-05-11T08:00:00.000Z',
    updatedAt: now,
  },
  {
    id: 'demo-partner-3',
    serialNumber: 'P303',
    name: 'Ananya Iyer',
    companyName: 'Metro Luxury Homes',
    phone: '+91 94444 55555',
    alternatePhone: '',
    email: 'ananya@metroluxury.example',
    city: 'Bengaluru',
    partnerType: 'Official',
    clienteleType: 'High',
    investmentPreference: 'Residential',
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: now,
  },
];

function nextSerial(prefix: string, serials: Array<string | undefined>) {
  const highest = serials.reduce((max, serial) => {
    if (!serial?.startsWith(prefix)) return max;
    const value = Number(serial.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `${prefix}${highest + 1}`;
}

export function addDemoContact(data: ContactFormData): Contact {
  const timestamp = new Date().toISOString();
  const contact: Contact = {
    id: `demo-contact-${Date.now()}`,
    serialNumber: nextSerial('N', demoContacts.map((contact) => contact.serialNumber)),
    ...data,
    createdByName: 'Admin',
    createdByEmail: 'manavsinghal@gmail.com',
    updatedByName: 'Admin',
    updatedByEmail: 'manavsinghal@gmail.com',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  demoContacts.unshift(contact);
  return contact;
}

export function updateDemoContact(id: string, data: ContactFormData): Contact | null {
  const index = demoContacts.findIndex((contact) => contact.id === id);
  if (index === -1) return null;

  const contact: Contact = {
    ...demoContacts[index],
    ...data,
    id,
    serialNumber: demoContacts[index].serialNumber,
    createdAt: demoContacts[index].createdAt,
    updatedByName: 'Admin',
    updatedByEmail: 'manavsinghal@gmail.com',
    updatedAt: new Date().toISOString(),
  };

  demoContacts[index] = contact;
  return contact;
}

export function deleteDemoContact(id: string) {
  const index = demoContacts.findIndex((contact) => contact.id === id);
  if (index === -1) return false;
  demoContacts.splice(index, 1);
  return true;
}

export function addDemoSiteVisit(data: SiteVisitFormData, contactName: string, listingLabels: string[]): SiteVisit {
  const timestamp = new Date().toISOString();
  const siteVisit: SiteVisit = {
    id: `demo-site-visit-${Date.now()}`,
    contactName,
    listingLabels,
    ...data,
    createdByName: 'Admin',
    createdByEmail: 'manavsinghal@gmail.com',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  demoSiteVisits.unshift(siteVisit);
  return siteVisit;
}

export function addDemoListing(data: ListingFormData): Listing {
  const timestamp = new Date().toISOString();
  const listing: Listing = {
    id: `demo-listing-${Date.now()}`,
    ...data,
    listingId: data.listingId || nextSerial('L', demoListings.map((item) => item.listingId)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  demoListings.unshift(listing);
  return listing;
}

export function updateDemoListing(id: string, data: ListingFormData): Listing | null {
  const index = demoListings.findIndex((listing) => listing.id === id);
  if (index === -1) return null;

  const listing: Listing = {
    ...demoListings[index],
    ...data,
    id,
    createdAt: demoListings[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  demoListings[index] = listing;
  return listing;
}

export function deleteDemoListing(id: string) {
  const index = demoListings.findIndex((listing) => listing.id === id);
  if (index === -1) return false;
  demoListings.splice(index, 1);
  return true;
}

export function addDemoChannelPartner(data: ChannelPartnerFormData): ChannelPartner {
  const timestamp = new Date().toISOString();
  const partner: ChannelPartner = {
    id: `demo-partner-${Date.now()}`,
    serialNumber: nextSerial('P', demoChannelPartners.map((item) => item.serialNumber)),
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  demoChannelPartners.unshift(partner);
  return partner;
}

export function updateDemoChannelPartner(id: string, data: ChannelPartnerFormData): ChannelPartner | null {
  const index = demoChannelPartners.findIndex((partner) => partner.id === id);
  if (index === -1) return null;

  const partner: ChannelPartner = {
    ...demoChannelPartners[index],
    ...data,
    id,
    serialNumber: demoChannelPartners[index].serialNumber,
    createdAt: demoChannelPartners[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  demoChannelPartners[index] = partner;
  return partner;
}

export function deleteDemoChannelPartner(id: string) {
  const index = demoChannelPartners.findIndex((partner) => partner.id === id);
  if (index === -1) return false;
  demoChannelPartners.splice(index, 1);
  return true;
}

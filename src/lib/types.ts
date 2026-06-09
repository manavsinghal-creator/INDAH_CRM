
import { z } from "zod";

export const budgetOptions = [
  "<1",
  "1-3",
  "3-6",
  "6-10",
  ">10",
] as const;

export const statusOptions = ["Cold", "Warm", "Hot"] as const;
export const contactTypeOptions = ["Buyer", "Seller"] as const;
export const propertyTypeOptions = ["Apartment", "Villa", "Plot", "Commercial", "Other"] as const;
export const leadStageOptions = [
  "New",
  "Contacted",
  "Qualified",
  "Property Shared",
  "Site Visit",
  "Negotiating",
  "Closed/Lost",
] as const;
export type LeadStage = typeof leadStageOptions[number];


export const ContactSchema = z.object({
  id: z.string(),
  serialNumber: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  budget: z.enum(budgetOptions, { required_error: "Budget is required." }),
  status: z.enum(statusOptions, { required_error: "Status is required." }),
  city: z.string().optional(),
  contactType: z.enum(contactTypeOptions).optional(),
  leadStage: z.enum(leadStageOptions).optional().default("New"),
  locationPreference: z.string().optional(),
  propertyPreference: z.array(z.string()).optional(),
  offeredListings: z.array(z.string()).optional(),
  notes: z.string().optional(),
  referenceContact: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  createdByName: z.string().optional(),
  createdByEmail: z.string().email().optional(),
  updatedByName: z.string().optional(),
  updatedByEmail: z.string().email().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const ContactFormSchema = ContactSchema.omit({
  id: true,
  serialNumber: true,
  createdByName: true,
  createdByEmail: true,
  updatedByName: true,
  updatedByEmail: true,
  createdAt: true,
  updatedAt: true,
});
export type ContactFormData = z.infer<typeof ContactFormSchema>;

export const projectStatusOptions = ["Pre-Launch", "Under Construction", "Ready to Move"] as const;
export const websiteStatusOptions = ["Approved for website upload", "Uploaded on website"] as const;
export const bhkOptions = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "6 BHK", "7 BHK", "8 BHK", "9 BHK", "10 BHK"] as const;
export const constructionQualityOptions = ["High", "Medium", "Standard"] as const;
export const accessibilityOptions = ["Main Road", "Internal Road"] as const;
export const highlightOptions = ["Top Choice", "Amazing View", "Super Luxury", "Architectural Marvel"] as const;
export const furnishingOptions = ["Unfurnished", "Semi Furnished", "Fully Furnished"] as const;
export const listingAvailabilityOptions = ["Available", "On Hold", "Sold", "Temporarily Unavailable"] as const;
export type ListingAvailability = typeof listingAvailabilityOptions[number];

export const uspTagOptions = [
  "mediterranean",
  "walk to beach",
  "prime lane",
  "sunset view",
  "near cafes",
  "near nightlife",
  "quiet lane",
  "clubhouse",
  "clear title",
  "high roi",
  "rental friendly",
  "homestay potential",
  "family friendly",
  "pet friendly",
  "boho chic",
  "portuguese",
  "bali style",
  "modern minimal",
  "rustic luxe",
  "designer home",
  "municipal water",
  "hill view",
  "paddy field view",
  "amazing pool",
  "top-class location",
  "river view",
  "sea view",
  "tropical villa",
  "heritage home",
  "serviced apartment",
  "duplex",
  "high ceilings",
  "beach front",
  "high-speed internet",
  "Modern Portuguese Villa",
  "2 Side road excess",
  "Vaastu Approved",
] as const;


export const ListingSchema = z.object({
  id: z.string(),
  listingId: z.string().optional(),
  listingName: z.string().min(1, "Listing Name is required."),
  projectName: z.string().min(1, "Project Name is required."),
  developerName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  propertyAddress: z.string().optional(),
  location: z.string().min(1, "Location is required."),
  description: z.string().optional(),
  dateOfMeeting: z.string().optional(),
  propertyType: z.enum(propertyTypeOptions),
  propertyTypeOther: z.string().optional(),
  furnishing: z.enum(furnishingOptions).optional(),
  projectStatus: z.enum(projectStatusOptions),
  websiteStatus: z.enum(websiteStatusOptions).optional(),
  highlight: z.enum(highlightOptions).optional(),
  expectedPossessionDate: z.string().optional(),
  bhkConfiguration: z.enum(bhkOptions),
  builtUpArea: z.coerce.number().optional(),
  carpetArea: z.coerce.number().optional(),
  plotArea: z.coerce.number().optional(),
  floors: z.string().optional(),
  unitFloor: z.string().optional(),
  totalUnits: z.coerce.number().optional(),
  availableUnits: z.coerce.number().optional(),
  basePrice: z.coerce.number().min(0, "Price must be a positive number."),
  pricePerSqFt: z.coerce.number().optional(),
  taxesApplicable: z.array(z.string()).optional(),
  taxesApplicableOther: z.string().optional(),
  paymentSchedule: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  reraRegistration: z.string().optional(),
  titleClear: z.boolean().optional(),
  completionCertificate: z.string().optional(),
  constructionQuality: z.enum(constructionQualityOptions).optional(),
  architectDesigner: z.string().optional(),
  exclusiveMandate: z.boolean().optional(),
  marketingMaterials: z.array(z.string()).optional(),
  listingUrl: z.string().optional(),
  externalPublicLink: z.string().optional(),
  virtualTourLink: z.string().optional(),
  stagingAvailable: z.boolean().optional(),
  modelFlatReady: z.boolean().optional(),
  idealBuyerProfile: z.string().optional(),
  accessibility: z.enum(accessibilityOptions).optional(),
  distanceFromMainRoad: z.string().optional(),
  usps: z.array(z.string()).optional(),
  notes: z.string().optional(),
  additionalActions: z.array(z.string()).optional(),
  availabilityStatus: z.enum(listingAvailabilityOptions).optional().default("Available"),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});


export type Listing = z.infer<typeof ListingSchema>;

export const ListingFormSchema = ListingSchema.omit({ id: true, createdAt: true, updatedAt: true }).extend({
    usps: z.array(z.string()).optional(),
});
export type ListingFormData = z.infer<typeof ListingFormSchema>;

export const GenerateDescriptionInputSchema = ListingFormSchema.pick({
    listingName: true,
    projectName: true,
    location: true,
    propertyType: true,
    bhkConfiguration: true,
    builtUpArea: true,
    plotArea: true,
    amenities: true,
    usps: true,
    projectStatus: true,
}).partial();


// Sales Channel Partner Types
export const clienteleTypeOptions = ["High", "Medium", "Low"] as const;
export const investmentPreferenceOptions = ["Commercial", "Residential"] as const;
export const partnerTypeOptions = ["Official", "General"] as const;

export const ChannelPartnerSchema = z.object({
  id: z.string(),
  serialNumber: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters."),
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  alternatePhone: z.string().optional(),
  email: z.string().email("Invalid email address."),
  city: z.string().min(1, "City is required."),
  partnerType: z.enum(partnerTypeOptions, { required_error: "Partner type is required."}),
  clienteleType: z.enum(clienteleTypeOptions, { required_error: "Clientele type is required."}),
  investmentPreference: z.enum(investmentPreferenceOptions, { required_error: "Investment preference is required."}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChannelPartner = z.infer<typeof ChannelPartnerSchema>;

export const ChannelPartnerFormSchema = ChannelPartnerSchema.omit({ id: true, serialNumber: true, createdAt: true, updatedAt: true });
export type ChannelPartnerFormData = z.infer<typeof ChannelPartnerFormSchema>;

export type ActivityAction = 'created' | 'updated' | 'deleted' | 'whatsappDraftOpened' | 'signedIn';
export type ActivityEntityType = 'contact' | 'listing' | 'channelPartner' | 'session';

export type ActivityChange = {
  field: string;
  before: string;
  after: string;
};

export type ActivityLog = {
  id: string;
  userEmail: string;
  userName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
  changes: ActivityChange[];
  createdAt: string;
};

// TASK GENERATOR (Rule-based)
export const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['Contact', 'Listing']),
  priority: z.enum(['High', 'Medium', 'Low']),
  relatedId: z.string(),
  relatedName: z.string(),
  suggestedAction: z.string(),
  phone: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const MatchMetadataSchema = z.object({
  source: z.enum(['gemini', 'local-fallback']),
  cached: z.boolean(),
  candidateCount: z.number(),
});
export type MatchMetadata = z.infer<typeof MatchMetadataSchema>;

export const QuickPropertyMatcherInputSchema = z.object({
  budget: z.string().optional(),
  locationPreference: z.string().optional(),
  bhkConfiguration: z.string().optional(),
});

export const QuickPropertyMatcherOutputSchema = z.object({
  matchedListings: z.array(
    z.object({
      listingId: z.string(),
      listingName: z.string(),
      location: z.string(),
      bhkConfiguration: z.string(),
      propertyType: z.string(),
      basePrice: z.number(),
      listingUrl: z.string().optional(),
      externalPublicLink: z.string().optional(),
      matchScore: z.number().optional(),
      matchReason: z.string().optional(),
    })
  ),
  matchMetadata: MatchMetadataSchema,
});
export type QuickPropertyMatcherOutput = z.infer<typeof QuickPropertyMatcherOutputSchema>;

export const ContactMatcherOutputSchema = z.object({
  matchedContacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    matchReason: z.string(),
    matchScore: z.number().describe('A score from 0 to 100 representing match quality'),
    keyFitFactors: z.array(z.string()).optional(),
    concernFactors: z.array(z.string()).optional(),
  })),
  matchMetadata: MatchMetadataSchema,
});
export type ContactMatcherOutput = z.infer<typeof ContactMatcherOutputSchema>;

export const ContactMatcherInputSchema = z.object({
  listing: z.any().describe('The property listing object.'),
});
export type ContactMatcherInput = z.infer<typeof ContactMatcherInputSchema>;

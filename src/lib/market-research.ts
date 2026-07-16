import type { Contact, Listing, MarketBenchmark } from '@/lib/types';
import { isListingAvailable } from '@/lib/crm-status';

export type MarketResearchRow = {
  key: string;
  location: string;
  propertyType: string;
  bhkConfiguration: string;
  comparableCount: number;
  buyerDemand: number;
  buyerDemandContactIds: string[];
  minPricePerSqFt: number;
  medianPricePerSqFt: number;
  averagePricePerSqFt: number;
  maxPricePerSqFt: number;
  manualBenchmark?: MarketBenchmark;
};

export type MarketResearchData = {
  rows: MarketResearchRow[];
  benchmarks: MarketBenchmark[];
  locations: string[];
  propertyTypes: string[];
  bhkConfigurations: string[];
  activeComparableCount: number;
  overallMedianPricePerSqFt: number | null;
};

export function normalizeMarketLocation(value: string | undefined): string {
  const firstPart = (value || '').split(',')[0]?.trim() || '';
  return firstPart.replace(/\s+/g, ' ').toLowerCase();
}

export function displayMarketLocation(value: string | undefined): string {
  const firstPart = (value || '').split(',')[0]?.trim() || '';
  return firstPart || 'Not specified';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function getListingPricePerSqFt(listing: Listing): number | null {
  const storedPrice = Number(listing.pricePerSqFt);
  if (Number.isFinite(storedPrice) && storedPrice > 0) return storedPrice;

  const basePrice = Number(listing.basePrice);
  const builtUpArea = Number(listing.builtUpArea);
  if (!listing.priceOnRequest && basePrice > 0 && builtUpArea > 0) {
    return Math.round((basePrice * 10_000_000) / builtUpArea);
  }

  return null;
}

function matchesBuyerDemand(contact: Contact, location: string, propertyType: string): boolean {
  if (contact.contactType !== 'Buyer' || contact.isActive === false) return false;
  const preferredLocation = normalizeMarketLocation(contact.locationPreference);
  const locationMatches = !preferredLocation || preferredLocation.includes(location) || location.includes(preferredLocation);
  const propertyPreferences = (contact.propertyPreference || []).map((item) => item.toLowerCase());
  const propertyMatches = !propertyPreferences.length || propertyPreferences.some((item) => item.includes(propertyType.toLowerCase()));
  return locationMatches && propertyMatches;
}

function chooseManualBenchmark(
  benchmarks: MarketBenchmark[],
  location: string,
  propertyType: string,
  bhkConfiguration: string,
): MarketBenchmark | undefined {
  const candidates = benchmarks
    .filter((benchmark) => normalizeMarketLocation(benchmark.location) === location)
    .filter((benchmark) => benchmark.propertyType === 'All' || benchmark.propertyType === propertyType)
    .filter((benchmark) => benchmark.bhkConfiguration === 'All' || benchmark.bhkConfiguration === bhkConfiguration)
    .sort((a, b) => {
      const aSpecificity = Number(a.propertyType === propertyType) + Number(a.bhkConfiguration === bhkConfiguration);
      const bSpecificity = Number(b.propertyType === propertyType) + Number(b.bhkConfiguration === bhkConfiguration);
      return bSpecificity - aSpecificity || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  return candidates[0];
}

export function buildMarketResearchData(
  listings: Listing[],
  contacts: Contact[],
  benchmarks: MarketBenchmark[],
): MarketResearchData {
  const comparableListings = listings
    .filter(isListingAvailable)
    .map((listing) => ({ listing, pricePerSqFt: getListingPricePerSqFt(listing) }))
    .filter((item): item is { listing: Listing; pricePerSqFt: number } => item.pricePerSqFt !== null);

  const grouped = new Map<string, { location: string; propertyType: string; bhkConfiguration: string; prices: number[] }>();
  for (const { listing, pricePerSqFt } of comparableListings) {
    const location = normalizeMarketLocation(listing.location);
    if (!location) continue;
    const propertyType = listing.propertyType;
    const bhkConfiguration = listing.bhkConfiguration;
    const key = [location, propertyType, bhkConfiguration].join('|');
    const current = grouped.get(key) || {
      location: displayMarketLocation(listing.location),
      propertyType,
      bhkConfiguration,
      prices: [],
    };
    current.prices.push(pricePerSqFt);
    grouped.set(key, current);
  }

  const rows = Array.from(grouped.entries())
    .map(([key, group]) => {
      const demandContacts = contacts.filter((contact) => matchesBuyerDemand(contact, normalizeMarketLocation(group.location), group.propertyType));
      return {
        key,
        location: group.location,
        propertyType: group.propertyType,
        bhkConfiguration: group.bhkConfiguration,
        comparableCount: group.prices.length,
        buyerDemand: demandContacts.length,
        buyerDemandContactIds: demandContacts.map((contact) => contact.id),
        minPricePerSqFt: Math.min(...group.prices),
        medianPricePerSqFt: median(group.prices),
        averagePricePerSqFt: Math.round(group.prices.reduce((sum, price) => sum + price, 0) / group.prices.length),
        maxPricePerSqFt: Math.max(...group.prices),
        manualBenchmark: chooseManualBenchmark(benchmarks, normalizeMarketLocation(group.location), group.propertyType, group.bhkConfiguration),
      };
    })
    .sort((a, b) => b.comparableCount - a.comparableCount || a.location.localeCompare(b.location));

  const allPrices = comparableListings.map((item) => item.pricePerSqFt);
  return {
    rows,
    benchmarks,
    locations: Array.from(new Set(rows.map((row) => row.location))).sort(),
    propertyTypes: Array.from(new Set(rows.map((row) => row.propertyType))).sort(),
    bhkConfigurations: Array.from(new Set(rows.map((row) => row.bhkConfiguration))).sort(),
    activeComparableCount: comparableListings.length,
    overallMedianPricePerSqFt: allPrices.length ? median(allPrices) : null,
  };
}

import 'server-only';

import type { Contact, Listing } from '@/lib/types';

export type RankedListing = {
  listing: Listing;
  localScore: number;
  keyFitFactors: string[];
  concernFactors: string[];
};

const budgetBands = ['<1', '1-3', '3-6', '6-10', '10-20', '20-30', '>30'] as const;

export function normalizeMatchText(value?: string) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function meaningfulWords(value?: string) {
  return new Set(
    normalizeMatchText(value)
      .split(' ')
      .filter((word) => word.length > 2)
  );
}

export function hasMatchTextOverlap(left?: string, right?: string) {
  const leftWords = meaningfulWords(left);
  return [...meaningfulWords(right)].some((word) => leftWords.has(word));
}

function listingBudgetBand(listing: Listing) {
  if (listing.priceOnRequest) return null;
  if (listing.basePrice < 1) return 0;
  if (listing.basePrice <= 3) return 1;
  if (listing.basePrice <= 6) return 2;
  if (listing.basePrice <= 10) return 3;
  if (listing.basePrice <= 20) return 4;
  if (listing.basePrice <= 30) return 5;
  return 6;
}

export function scoreListingForContact(listing: Listing, contact: Contact): RankedListing {
  let localScore = 0;
  const keyFitFactors: string[] = [];
  const concernFactors: string[] = [];

  const listingBudget = listingBudgetBand(listing);
  if (listingBudget === null) {
    localScore += 12;
    keyFitFactors.push('Price available on request');
  } else {
    const budgetDistance = Math.abs(budgetBands.indexOf(contact.budget) - listingBudget);
    if (budgetDistance === 0) {
      localScore += 45;
      keyFitFactors.push(`Within ${contact.budget} Cr budget`);
    } else if (budgetDistance === 1) {
      localScore += 12;
      concernFactors.push(`May sit outside the ${contact.budget} Cr budget`);
    } else {
      concernFactors.push(`Outside the ${contact.budget} Cr budget`);
    }
  }

  if (!contact.locationPreference) {
    localScore += 5;
  } else if (
    hasMatchTextOverlap(contact.locationPreference, listing.location)
    || normalizeMatchText(contact.locationPreference).includes(normalizeMatchText(listing.location))
    || normalizeMatchText(listing.location).includes(normalizeMatchText(contact.locationPreference))
  ) {
    localScore += 30;
    keyFitFactors.push(`${listing.location} matches location preference`);
  } else {
    concernFactors.push(`Location differs from ${contact.locationPreference}`);
  }

  const propertyPreferences = contact.propertyPreference || [];
  if (propertyPreferences.length === 0) {
    localScore += 5;
  } else if (propertyPreferences.some((preference) => hasMatchTextOverlap(preference, listing.propertyType))) {
    localScore += 20;
    keyFitFactors.push(`${listing.propertyType} matches property preference`);
  } else {
    concernFactors.push(`Property type differs from ${propertyPreferences.join(', ')}`);
  }

  const listingKeywords = [
    ...(listing.usps || []),
    ...(listing.amenities || []),
    listing.idealBuyerProfile,
    listing.notes,
  ].filter(Boolean).join(' ');
  if (contact.notes && hasMatchTextOverlap(contact.notes, listingKeywords)) {
    localScore += 10;
    keyFitFactors.push('Features align with preferences in notes');
  }

  return {
    listing,
    localScore: Math.min(localScore, 100),
    keyFitFactors,
    concernFactors,
  };
}

export function scoreListingForCriteria(
  listing: Listing,
  criteria: { budget?: string; locationPreference?: string; bhkConfiguration?: string }
): RankedListing {
  let earnedScore = 0;
  let possibleScore = 0;
  const keyFitFactors: string[] = [];
  const concernFactors: string[] = [];

  if (criteria.budget) {
    possibleScore += 50;
    const budgetIndex = budgetBands.indexOf(criteria.budget as typeof budgetBands[number]);
    const listingBudget = listingBudgetBand(listing);
    if (listingBudget === null) {
      earnedScore += 12;
      keyFitFactors.push('Price available on request');
    } else {
      const budgetDistance = Math.abs(budgetIndex - listingBudget);
      if (budgetDistance === 0) {
        earnedScore += 50;
        keyFitFactors.push(`Within ${criteria.budget} Cr budget`);
      } else if (budgetDistance === 1) {
        earnedScore += 15;
        concernFactors.push(`May sit outside the ${criteria.budget} Cr budget`);
      } else {
        concernFactors.push(`Outside the ${criteria.budget} Cr budget`);
      }
    }
  }

  if (criteria.locationPreference) {
    possibleScore += 30;
    if (hasMatchTextOverlap(criteria.locationPreference, listing.location)) {
      earnedScore += 30;
      keyFitFactors.push(`${listing.location} matches requested location`);
    } else {
      concernFactors.push(`Location differs from ${criteria.locationPreference}`);
    }
  }

  if (criteria.bhkConfiguration) {
    possibleScore += 20;
    if (normalizeMatchText(criteria.bhkConfiguration) === normalizeMatchText(listing.bhkConfiguration)) {
      earnedScore += 20;
      keyFitFactors.push(`${listing.bhkConfiguration} configuration matches`);
    } else {
      concernFactors.push(`Configuration is ${listing.bhkConfiguration}`);
    }
  }

  const localScore = possibleScore === 0 ? 50 : Math.round((earnedScore / possibleScore) * 100);
  return { listing, localScore, keyFitFactors, concernFactors };
}

export function compactListingForMatch({ listing, localScore, keyFitFactors, concernFactors }: RankedListing) {
  return {
    id: listing.id,
    listingId: listing.listingId,
    listingName: listing.listingName,
    titleProjectName: listing.titleProjectName,
    projectName: listing.projectName,
    listingType: listing.listingType || 'Public',
    priceOnRequest: listing.priceOnRequest || false,
    basePrice: listing.basePrice,
    location: listing.location,
    propertyType: listing.propertyType,
    bhkConfiguration: listing.bhkConfiguration,
    furnishing: listing.furnishing,
    projectStatus: listing.projectStatus,
    idealBuyerProfile: listing.idealBuyerProfile?.slice(0, 250),
    amenities: listing.amenities?.slice(0, 10),
    usps: listing.usps?.slice(0, 10),
    localFitScore: localScore,
    localFitFactors: keyFitFactors,
    localConcerns: concernFactors,
  };
}

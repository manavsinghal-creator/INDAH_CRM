import 'server-only';

import { getContactLeadStage, isListingAvailable } from '@/lib/crm-status';
import { scoreListingForContact } from '@/lib/property-matching';
import type { Contact, Listing, SiteVisit } from '@/lib/types';

export type BestMatchInteraction = 'new' | 'shared' | 'visited';

export type BestListingMatch = {
  listing: Listing;
  score: number;
  keyFitFactors: string[];
  concernFactors: string[];
  interaction: BestMatchInteraction;
};

export type BestBuyerMatch = {
  contact: Contact;
  matches: BestListingMatch[];
};

export type BestMatchesData = {
  buyers: BestBuyerMatch[];
  eligibleBuyerCount: number;
  availableListingCount: number;
  strongOpportunityCount: number;
};

const eligibleStages = new Set(['Qualified', 'Property Shared', 'Site Visit', 'Negotiating']);
const minimumMatchScore = 45;
const strongMatchScore = 75;

function getInteraction(contact: Contact, listing: Listing, siteVisits: SiteVisit[]): BestMatchInteraction {
  const wasShown = siteVisits.some((visit) => visit.contactId === contact.id && (visit.listingIds || []).includes(listing.id));
  if (wasShown) return 'visited';
  return contact.offeredListings?.includes(listing.id) ? 'shared' : 'new';
}

export function buildBestMatches(
  contacts: Contact[],
  listings: Listing[],
  siteVisits: SiteVisit[],
): BestMatchesData {
  const eligibleBuyers = contacts.filter((contact) => (
    contact.contactType === 'Buyer'
    && contact.isActive !== false
    && eligibleStages.has(getContactLeadStage(contact))
  ));
  const availableListings = listings.filter(isListingAvailable);

  const buyers = eligibleBuyers
    .map((contact) => ({
      contact,
      matches: availableListings
        .map((listing) => {
          const ranked = scoreListingForContact(listing, contact);
          return {
            listing,
            score: ranked.localScore,
            keyFitFactors: ranked.keyFitFactors,
            concernFactors: ranked.concernFactors,
            interaction: getInteraction(contact, listing, siteVisits),
          } satisfies BestListingMatch;
        })
        .filter((match) => match.score >= minimumMatchScore)
        .sort((first, second) => second.score - first.score),
    }))
    .filter((buyer) => buyer.matches.length > 0)
    .sort((first, second) => second.matches[0].score - first.matches[0].score);

  return {
    buyers,
    eligibleBuyerCount: eligibleBuyers.length,
    availableListingCount: availableListings.length,
    strongOpportunityCount: buyers.reduce(
      (total, buyer) => total + buyer.matches.filter((match) => match.score >= strongMatchScore && match.interaction === 'new').length,
      0,
    ),
  };
}

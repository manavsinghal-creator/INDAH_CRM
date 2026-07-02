'use server';

/**
 * @fileOverview A two-stage contact-to-property matcher.
 */

import { ai } from '@/ai/genkit';
import { getListings, getSiteVisits } from '@/app/actions';
import { createMatchCacheKey, getCachedMatch, setCachedMatch } from '@/lib/ai-match-cache';
import {
  compactListingForMatch,
  scoreListingForContact,
  type RankedListing,
} from '@/lib/property-matching';
import { MatchMetadataSchema, type Contact } from '@/lib/types';
import { isListingAvailable } from '@/lib/crm-status';
import { z } from 'zod';

const MAX_AI_CANDIDATES = 20;
const MAX_RETURNED_MATCHES = 5;
const MIN_LOCAL_CANDIDATE_SCORE = 20;
const AI_TIMEOUT_MS = 10_000;

const PropertyMatcherInputSchema = z.object({
  contact: z.any().describe('The contact object with their details and preferences.'),
});
export type PropertyMatcherInput = z.infer<typeof PropertyMatcherInputSchema>;

const SuggestedPropertySchema = z.object({
  id: z.string(),
  listingId: z.string(),
  name: z.string(),
  matchScore: z.number(),
  matchReason: z.string(),
  keySellingPoints: z.array(z.string()),
});

const AiPropertyMatcherOutputSchema = z.object({
  recommendations: z.string(),
  suggestedProperties: z.array(SuggestedPropertySchema),
});

const PropertyMatcherOutputSchema = z.object({
  recommendations: z.string(),
  suggestedProperties: z.array(SuggestedPropertySchema),
  matchMetadata: MatchMetadataSchema,
});
export type PropertyMatcherOutput = z.infer<typeof PropertyMatcherOutputSchema>;

function compactContact(contact: Contact) {
  return {
    id: contact.id,
    updatedAt: contact.updatedAt,
    name: contact.name,
    budget: contact.budget,
    status: contact.status,
    city: contact.city,
    locationPreference: contact.locationPreference,
    requirementPurpose: contact.requirementPurpose,
    propertyPreference: contact.propertyPreference,
    notes: contact.notes?.slice(0, 300),
  };
}

function compactContactWithSiteVisits(contact: Contact, siteVisits: Awaited<ReturnType<typeof getSiteVisits>>) {
  return {
    ...compactContact(contact),
    siteVisits: siteVisits
      .filter((visit) => visit.contactId === contact.id)
      .slice(0, 8)
      .map((visit) => ({
        visitAt: visit.visitAt,
        listingsShown: visit.listingLabels,
        notes: visit.notes?.slice(0, 220),
      })),
    sharedListingIds: contact.offeredListings || [],
  };
}

function createLocalFallback(candidates: RankedListing[]): PropertyMatcherOutput {
  const suggestedProperties = candidates
    .filter((candidate) => candidate.localScore >= 45)
    .slice(0, MAX_RETURNED_MATCHES)
    .map(({ listing, localScore, keyFitFactors }) => ({
      id: listing.id,
      listingId: listing.listingId || '',
      name: listing.listingName,
      matchScore: localScore,
      matchReason: keyFitFactors.length
        ? `${listing.listingName} aligns with ${keyFitFactors.join(', ').toLowerCase()}.`
        : `${listing.listingName} may suit this buyer profile.`,
      keySellingPoints: keyFitFactors,
    }));

  const recommendations = suggestedProperties.length
    ? suggestedProperties
      .map((property) => `**${property.name}** (${property.matchScore}% match)\n- ${property.matchReason}`)
      .join('\n\n')
    : 'No strong property matches were found. Try broadening the contact preferences.';

  return {
    recommendations,
    suggestedProperties,
    matchMetadata: {
      source: 'local-fallback',
      cached: false,
      candidateCount: candidates.length,
    },
  };
}

function hideInternalListingIds(text: string, candidates: RankedListing[]) {
  return candidates.reduce(
    (sanitized, candidate) => sanitized.replaceAll(
      candidate.listing.id,
      candidate.listing.listingId || candidate.listing.listingName
    ),
    text
  );
}

export async function propertyMatcher(input: PropertyMatcherInput): Promise<PropertyMatcherOutput> {
  return propertyMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyMatcherPrompt',
  input: { schema: z.object({ contact: z.string(), listings: z.string() }) },
  output: { schema: AiPropertyMatcherOutputSchema },
  prompt: `You are a real-estate consultant refining a locally ranked property shortlist for one buyer.

Verify the local ranking and return no more than ${MAX_RETURNED_MATCHES} strong properties. Do not invent listing IDs.

For each selected property:
- Assign a matchScore from 0 to 100.
- Write one concise personalized matchReason.
- List short keySellingPoints.

Also provide a concise recommendations summary in readable markdown.

Buyer:
{{{contact}}}

Locally ranked property shortlist:
{{{listings}}}`,
});

const propertyMatcherFlow = ai.defineFlow(
  {
    name: 'propertyMatcherFlow',
    inputSchema: PropertyMatcherInputSchema,
    outputSchema: PropertyMatcherOutputSchema,
  },
  async (input) => {
    const contact = input.contact as Contact;
    const siteVisits = await getSiteVisits();
    const compactBuyerProfile = compactContactWithSiteVisits(contact, siteVisits);
    const cacheKey = createMatchCacheKey('property-matcher', compactBuyerProfile);
    const cachedResult = getCachedMatch<PropertyMatcherOutput>(cacheKey);
    if (cachedResult) return cachedResult;

    const listings = await getListings();
    const candidates = listings
      .filter(isListingAvailable)
      .map((listing) => scoreListingForContact(listing, contact))
      .filter((candidate) => candidate.localScore >= MIN_LOCAL_CANDIDATE_SCORE)
      .sort((left, right) => right.localScore - left.localScore)
      .slice(0, MAX_AI_CANDIDATES);

    if (candidates.length === 0) {
      const result = createLocalFallback(candidates);
      setCachedMatch(cacheKey, result);
      return result;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), AI_TIMEOUT_MS);

    try {
      const { output } = await prompt({
        contact: JSON.stringify(compactBuyerProfile),
        listings: JSON.stringify(candidates.map(compactListingForMatch)),
      }, {
        abortSignal: abortController.signal,
      });

      if (!output) {
        const result = createLocalFallback(candidates);
        setCachedMatch(cacheKey, result);
        return result;
      }

      const listingsById = new Map<string, RankedListing>();
      candidates.forEach((candidate) => {
        listingsById.set(candidate.listing.id, candidate);
        if (candidate.listing.listingId) listingsById.set(candidate.listing.listingId, candidate);
      });

      const suggestedProperties = output.suggestedProperties
        .map((property) => {
          const candidate = listingsById.get(property.id);
          if (!candidate) return null;
          return {
            ...property,
            id: candidate.listing.id,
            listingId: candidate.listing.listingId || '',
            name: candidate.listing.listingName,
          };
        })
        .filter((property): property is NonNullable<typeof property> => Boolean(property))
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, MAX_RETURNED_MATCHES);

      if (suggestedProperties.length === 0) {
        const result = createLocalFallback(candidates);
        setCachedMatch(cacheKey, result);
        return result;
      }

      const result: PropertyMatcherOutput = {
        recommendations: hideInternalListingIds(output.recommendations, candidates),
        suggestedProperties,
        matchMetadata: {
          source: 'gemini',
          cached: false,
          candidateCount: candidates.length,
        },
      };
      setCachedMatch(cacheKey, result);
      return result;
    } catch {
      console.info('AI property matching unavailable; using local shortlist.');
      const result = createLocalFallback(candidates);
      setCachedMatch(cacheKey, result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
);

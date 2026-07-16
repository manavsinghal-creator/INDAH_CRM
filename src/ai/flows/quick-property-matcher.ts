'use server';

import { ai } from '@/ai/genkit';
import { getListings } from '@/app/actions';
import { createMatchCacheKey, getCachedMatch, setCachedMatch } from '@/lib/ai-match-cache';
import {
  compactListingForMatch,
  scoreListingForCriteria,
  type RankedListing,
} from '@/lib/property-matching';
import {
  QuickPropertyMatcherInputSchema,
  QuickPropertyMatcherOutputSchema,
  type QuickPropertyMatcherOutput,
} from '@/lib/types';
import { z } from 'zod';
import { isListingAvailable } from '@/lib/crm-status';

const MAX_AI_CANDIDATES = 20;
const MAX_RETURNED_MATCHES = 5;
const MIN_LOCAL_CANDIDATE_SCORE = 40;
const AI_TIMEOUT_MS = 8_000;

const AiQuickPropertyMatcherOutputSchema = z.object({
  matchedListings: z.array(z.object({
    id: z.string(),
    matchScore: z.number(),
    matchReason: z.string(),
  })),
});

type QuickCriteria = z.infer<typeof QuickPropertyMatcherInputSchema>;

function normalizeCriteria(input: QuickCriteria): QuickCriteria {
  return {
    budget: input.budget?.trim() || undefined,
    locationPreference: input.locationPreference?.trim() || undefined,
    bhkConfiguration: input.bhkConfiguration?.trim() || undefined,
  };
}

function toMatchedListing({ listing, localScore, keyFitFactors }: RankedListing) {
  return {
    recordId: listing.id,
    listingId: listing.listingId || '',
    listingName: listing.listingName,
    titleProjectName: listing.titleProjectName,
    location: listing.location,
    bhkConfiguration: listing.bhkConfiguration,
    propertyType: listing.propertyType,
    basePrice: listing.basePrice,
    priceOnRequest: listing.priceOnRequest || false,
    listingUrl: listing.listingUrl,
    externalPublicLink: listing.externalPublicLink,
    heroImageUrl: listing.heroImageUrl,
    matchScore: localScore,
    matchReason: keyFitFactors.length
      ? keyFitFactors.join(', ')
      : 'A generally relevant active listing.',
  };
}

function createLocalFallback(candidates: RankedListing[]): QuickPropertyMatcherOutput {
  return {
    matchedListings: candidates.slice(0, MAX_RETURNED_MATCHES).map(toMatchedListing),
    matchMetadata: {
      source: 'local-fallback',
      cached: false,
      candidateCount: candidates.length,
    },
  };
}

export async function quickPropertyMatcher(input: QuickCriteria): Promise<QuickPropertyMatcherOutput> {
  return quickPropertyMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quickPropertyMatcherPrompt',
  input: { schema: z.object({ criteria: z.string(), listings: z.string() }) },
  output: { schema: AiQuickPropertyMatcherOutputSchema },
  prompt: `Refine a locally ranked shortlist and return the top ${MAX_RETURNED_MATCHES} properties matching the requested criteria.

Do not invent IDs. For each result, return its id, a matchScore from 0 to 100, and one concise matchReason.

Criteria:
{{{criteria}}}

Locally ranked shortlist:
{{{listings}}}`,
});

const quickPropertyMatcherFlow = ai.defineFlow(
  {
    name: 'quickPropertyMatcherFlow',
    inputSchema: QuickPropertyMatcherInputSchema,
    outputSchema: QuickPropertyMatcherOutputSchema,
  },
  async (input) => {
    const criteria = normalizeCriteria(input);
    const cacheKey = createMatchCacheKey('quick-property-matcher', criteria);
    const cachedResult = getCachedMatch<QuickPropertyMatcherOutput>(cacheKey);
    if (cachedResult) return cachedResult;

    const hasCriteria = Boolean(criteria.budget || criteria.locationPreference || criteria.bhkConfiguration);
    const listings = await getListings();
    const candidates = listings
      .filter(isListingAvailable)
      .map((listing) => scoreListingForCriteria(listing, criteria))
      .filter((candidate) => !hasCriteria || candidate.localScore >= MIN_LOCAL_CANDIDATE_SCORE)
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
        criteria: JSON.stringify(criteria),
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

      const matchedListings = output.matchedListings
        .map((match) => {
          const candidate = listingsById.get(match.id);
          if (!candidate) return null;
          return {
            ...toMatchedListing(candidate),
            matchScore: match.matchScore,
            matchReason: match.matchReason,
          };
        })
        .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, MAX_RETURNED_MATCHES);

      if (matchedListings.length === 0) {
        const result = createLocalFallback(candidates);
        setCachedMatch(cacheKey, result);
        return result;
      }

      const result: QuickPropertyMatcherOutput = {
        matchedListings,
        matchMetadata: {
          source: 'gemini',
          cached: false,
          candidateCount: candidates.length,
        },
      };
      setCachedMatch(cacheKey, result);
      return result;
    } catch {
      console.info('AI quick property matching unavailable; using local shortlist.');
      const result = createLocalFallback(candidates);
      setCachedMatch(cacheKey, result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
);

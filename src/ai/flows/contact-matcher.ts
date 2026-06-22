'use server';

/**
 * @fileOverview A two-stage property-to-contact matcher.
 *
 * Contacts are ranked locally first so Gemini only evaluates a small, compact
 * shortlist instead of receiving every full CRM record.
 */

import { ai } from '@/ai/genkit';
import { getContacts } from '@/app/actions';
import { createMatchCacheKey, getCachedMatch, setCachedMatch } from '@/lib/ai-match-cache';
import { MatchMetadataSchema, type Contact, type Listing } from '@/lib/types';
import { isListingAvailable } from '@/lib/crm-status';
import { z } from 'zod';

const MAX_AI_CANDIDATES = 30;
const MAX_RETURNED_MATCHES = 15;
const MIN_LOCAL_CANDIDATE_SCORE = 20;
const AI_TIMEOUT_MS = 10_000;

const ContactMatcherInputSchema = z.object({
  listing: z.any().describe('The property listing object.'),
});
export type ContactMatcherInput = z.infer<typeof ContactMatcherInputSchema>;

const AiContactMatcherOutputSchema = z.object({
  matchedContacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    matchReason: z.string(),
    matchScore: z.number().describe('A score from 0 to 100 representing match quality'),
    keyFitFactors: z.array(z.string()).optional().describe('Top reasons why this is a good fit'),
    concernFactors: z.array(z.string()).optional().describe('Potential concerns or mismatches'),
  })),
});

const ContactMatcherOutputSchema = z.object({
  matchedContacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    matchReason: z.string(),
    matchScore: z.number(),
    keyFitFactors: z.array(z.string()).optional(),
    concernFactors: z.array(z.string()).optional(),
  })),
  matchMetadata: MatchMetadataSchema,
});
export type ContactMatcherOutput = z.infer<typeof ContactMatcherOutputSchema>;

type RankedContact = {
  contact: Contact;
  localScore: number;
  keyFitFactors: string[];
  concernFactors: string[];
};

const budgetBands = ['<1', '1-3', '3-6', '6-10', '10-20', '20-30', '>30'] as const;

function normalize(value?: string) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function meaningfulWords(value?: string) {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((word) => word.length > 2)
  );
}

function hasTextOverlap(left?: string, right?: string) {
  const leftWords = meaningfulWords(left);
  return [...meaningfulWords(right)].some((word) => leftWords.has(word));
}

function scoreContact(contact: Contact, listing: Listing): RankedContact {
  let localScore = 0;
  const keyFitFactors: string[] = [];
  const concernFactors: string[] = [];

  const contactBudgetIndex = budgetBands.indexOf(contact.budget);
  const listingBudgetIndex = listing.basePrice < 1
    ? 0
    : listing.basePrice <= 3
      ? 1
      : listing.basePrice <= 6
        ? 2
        : listing.basePrice <= 10
          ? 3
          : listing.basePrice <= 20
            ? 4
            : listing.basePrice <= 30
              ? 5
              : 6;
  const budgetDistance = Math.abs(contactBudgetIndex - listingBudgetIndex);

  if (budgetDistance === 0) {
    localScore += 45;
    keyFitFactors.push(`Within ${contact.budget} Cr budget`);
  } else if (budgetDistance === 1) {
    localScore += 12;
    concernFactors.push(`Property may sit outside the ${contact.budget} Cr budget`);
  } else {
    concernFactors.push(`Property is outside the ${contact.budget} Cr budget`);
  }

  if (!contact.locationPreference) {
    localScore += 5;
  } else if (
    hasTextOverlap(contact.locationPreference, listing.location)
    || normalize(contact.locationPreference).includes(normalize(listing.location))
    || normalize(listing.location).includes(normalize(contact.locationPreference))
  ) {
    localScore += 30;
    keyFitFactors.push(`${listing.location} matches location preference`);
  } else {
    concernFactors.push(`Preferred location is ${contact.locationPreference}`);
  }

  const propertyPreferences = contact.propertyPreference || [];
  if (propertyPreferences.length === 0) {
    localScore += 5;
  } else if (propertyPreferences.some((preference) => hasTextOverlap(preference, listing.propertyType))) {
    localScore += 20;
    keyFitFactors.push(`${listing.propertyType} matches property preference`);
  } else {
    concernFactors.push(`Prefers ${propertyPreferences.join(', ')}`);
  }

  const listingKeywords = [
    ...(listing.usps || []),
    ...(listing.amenities || []),
    listing.idealBuyerProfile,
    listing.notes,
  ].filter(Boolean).join(' ');
  if (contact.notes && hasTextOverlap(contact.notes, listingKeywords)) {
    localScore += 10;
    keyFitFactors.push('Preferences in notes align with property features');
  }

  if (contact.status === 'Hot') localScore += 5;
  if (contact.status === 'Warm') localScore += 3;

  return { contact, localScore: Math.min(localScore, 100), keyFitFactors, concernFactors };
}

function compactListing(listing: Listing) {
  return {
    id: listing.id,
    updatedAt: listing.updatedAt,
    availabilityStatus: listing.availabilityStatus,
    isActive: listing.isActive,
    listingName: listing.listingName,
    projectName: listing.projectName,
    basePrice: listing.basePrice,
    location: listing.location,
    propertyType: listing.propertyType,
    bhkConfiguration: listing.bhkConfiguration,
    furnishing: listing.furnishing,
    projectStatus: listing.projectStatus,
    idealBuyerProfile: listing.idealBuyerProfile?.slice(0, 300),
    amenities: listing.amenities?.slice(0, 12),
    usps: listing.usps?.slice(0, 12),
  };
}

function compactCandidate(candidate: RankedContact) {
  const { contact } = candidate;
  return {
    id: contact.id,
    name: contact.name,
    budget: contact.budget,
    status: contact.status,
    city: contact.city,
    locationPreference: contact.locationPreference,
    requirementPurpose: contact.requirementPurpose,
    propertyPreference: contact.propertyPreference,
    notes: contact.notes?.slice(0, 300),
    localFitScore: candidate.localScore,
    localFitFactors: candidate.keyFitFactors,
    localConcerns: candidate.concernFactors,
  };
}

function createLocalFallback(candidates: RankedContact[]): ContactMatcherOutput {
  return {
    matchedContacts: candidates
      .filter((candidate) => candidate.localScore >= 45)
      .slice(0, MAX_RETURNED_MATCHES)
      .map(({ contact, localScore, keyFitFactors, concernFactors }) => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email || undefined,
        matchReason: keyFitFactors.length
          ? `${contact.name}'s preferences align with this property based on ${keyFitFactors.join(', ').toLowerCase()}.`
          : `${contact.name}'s buyer profile may align with this property.`,
        matchScore: localScore,
        keyFitFactors,
        concernFactors,
      })),
    matchMetadata: {
      source: 'local-fallback',
      cached: false,
      candidateCount: candidates.length,
    },
  };
}

export async function contactMatcher(
  input: ContactMatcherInput
): Promise<ContactMatcherOutput> {
  return contactMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contactMatcherPrompt',
  input: { schema: z.object({ listing: z.any(), contacts: z.string() }) },
  output: { schema: AiContactMatcherOutputSchema },
  prompt: `You are a real-estate matchmaking expert. Refine a locally ranked shortlist of buyers for one property.

The shortlist has already been ranked using budget, location, property type, notes, and lead status. Verify that ranking and improve the reasoning. Do not invent contacts or IDs.

For each strong candidate:
- Assign a matchScore from 0 to 100.
- Write one concise, personalized matchReason.
- List short keyFitFactors and concernFactors.

Return only candidates with a matchScore of 45 or higher, sorted by matchScore descending. Return no more than ${MAX_RETURNED_MATCHES} candidates.

Property:
{{{listing}}}

Locally ranked buyer shortlist:
{{{contacts}}}`,
});

const contactMatcherFlow = ai.defineFlow(
  {
    name: 'contactMatcherFlow',
    inputSchema: ContactMatcherInputSchema,
    outputSchema: ContactMatcherOutputSchema,
  },
  async (input) => {
    const listing = input.listing as Listing;
    if (!isListingAvailable(listing)) {
      return createLocalFallback([]);
    }
    const cacheKey = createMatchCacheKey('contact-matcher', compactListing(listing));
    const cachedResult = getCachedMatch<ContactMatcherOutput>(cacheKey);
    if (cachedResult) return cachedResult;

    const allContacts = await getContacts();
    const candidates = allContacts
      .filter((contact) => contact.contactType === 'Buyer' && contact.isActive !== false)
      .map((contact) => scoreContact(contact, listing))
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
        listing: JSON.stringify(compactListing(listing)),
        contacts: JSON.stringify(candidates.map(compactCandidate)),
      }, {
        abortSignal: abortController.signal,
      });

      if (!output) {
        const result = createLocalFallback(candidates);
        setCachedMatch(cacheKey, result);
        return result;
      }

      const contactsById = new Map(candidates.map(({ contact }) => [contact.id, contact]));
      const matchedContacts = output.matchedContacts
        .map((match) => {
          const contact = contactsById.get(match.id);
          if (!contact) return null;
          return {
            ...match,
            name: contact.name,
            phone: contact.phone,
            email: contact.email || undefined,
          };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match))
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, MAX_RETURNED_MATCHES);

      if (matchedContacts.length === 0) {
        const result = createLocalFallback(candidates);
        setCachedMatch(cacheKey, result);
        return result;
      }

      const result: ContactMatcherOutput = {
        matchedContacts,
        matchMetadata: {
          source: 'gemini',
          cached: false,
          candidateCount: candidates.length,
        },
      };
      setCachedMatch(cacheKey, result);
      return result;
    } catch {
      console.info('AI contact matching unavailable; using local shortlist.');
      const result = createLocalFallback(candidates);
      setCachedMatch(cacheKey, result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
);

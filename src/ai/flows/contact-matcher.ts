
'use server';

/**
 * @fileOverview An AI agent that matches property listings with contacts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getContacts } from '@/app/actions';

const ContactMatcherInputSchema = z.object({
  listing: z.any().describe('The property listing object.'),
});
export type ContactMatcherInput = z.infer<typeof ContactMatcherInputSchema>;

const ContactMatcherOutputSchema = z.object({
  matchedContacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    matchReason: z.string(),
    matchScore: z.number().describe('A score from 0 to 100 representing match quality'),
    keyFitFactors: z.array(z.string()).optional().describe('Top reasons why this is a good fit'),
    concernFactors: z.array(z.string()).optional().describe('Potential concerns or mismatches'),
  })),
});
export type ContactMatcherOutput = z.infer<typeof ContactMatcherOutputSchema>;

export async function contactMatcher(
  input: ContactMatcherInput
): Promise<ContactMatcherOutput> {
  return contactMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contactMatcherPrompt',
  input: { schema: z.object({ listing: z.any(), contacts: z.string() }) },
  output: { schema: ContactMatcherOutputSchema },
  prompt: `You are an elite real-estate matchmaking expert. Match the property listing with suitable buyers from the contact list.
  
Evaluate each contact carefully against these dimensions:
1. Budget: Does the listing's basePrice ({{{listing.basePrice}}} Cr) fit the contact's budget range?
   - '<1' fits basePrice < 1
   - '1-3' fits 1 <= basePrice <= 3
   - '3-6' fits 3 <= basePrice <= 6
   - '6-10' fits 6 <= basePrice <= 10
   - '>10' fits basePrice > 10
2. Location: Does thelisting location ({{{listing.location}}}) suit their locationPreference?
3. Property Type: Does the listing propertyType ({{{listing.propertyType}}}) match their preferred property type?
4. Qualitative Alignment: Cross-reference listing USPs ({{{listing.usps}}}) and Amenities ({{{listing.amenities}}}) with their custom 'notes'.

For each matching candidate:
- Assign a precise 'matchScore' (0-100)
- Write a professional, personalized 'matchReason' explaining exactly why this property is a match for them.
- List distinct 'keyFitFactors' (e.g. "Within 3-6 Cr Budget", "Candolim location preference met", "Paddy field view fits preference")
- List key 'concernFactors' if any (e.g. "Furnishing mismatch: un-furnished", "Slightly exceeds ideal budget").

Return only candidates that have a matchScore of 45 or higher, sorted by matchScore descending.

Listing Name: {{{listing.listingName}}}
Project: {{{listing.projectName}}}
Price: {{{listing.basePrice}}} Cr
Location: {{{listing.location}}}
Type: {{{listing.propertyType}}}
BHK: {{{listing.bhkConfiguration}}}
Amenities: {{{listing.amenities}}}
USPs: {{{listing.usps}}}

Contacts List:
{{{contacts}}}`,
});

const contactMatcherFlow = ai.defineFlow(
  {
    name: 'contactMatcherFlow',
    inputSchema: ContactMatcherInputSchema,
    outputSchema: ContactMatcherOutputSchema,
  },
  async (input) => {
    const allContacts = await getContacts();
    const buyerContacts = allContacts.filter(c => c.contactType === 'Buyer');
    const { output } = await prompt({
      listing: input.listing,
      contacts: JSON.stringify(buyerContacts),
    });
    return output!;
  }
);

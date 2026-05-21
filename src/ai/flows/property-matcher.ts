
'use server';

/**
 * @fileOverview An AI agent that matches contacts with property listings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getListings } from '@/app/actions';

const PropertyMatcherInputSchema = z.object({
  contact: z.any().describe('The contact object with their details and preferences.'),
});
export type PropertyMatcherInput = z.infer<typeof PropertyMatcherInputSchema>;

const PropertyMatcherOutputSchema = z.object({
  recommendations: z
    .string()
    .describe('A concise, friendly summary of top 2-3 recommended properties in beautiful markdown.'),
  suggestedProperties: z.array(z.object({
    id: z.string(),
    name: z.string(),
    matchScore: z.number().describe('A score from 0 to 100 representing match quality'),
    matchReason: z.string().describe('Individual reason why this property fits'),
    keySellingPoints: z.array(z.string()).describe('Key USPs of this property matching client preference'),
  })).optional().describe('Structured list of properties recommended'),
});
export type PropertyMatcherOutput = z.infer<typeof PropertyMatcherOutputSchema>;

export async function propertyMatcher(
  input: PropertyMatcherInput
): Promise<PropertyMatcherOutput> {
  return propertyMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyMatcherPrompt',
  input: { schema: z.object({ contact: z.any(), listings: z.string() }) },
  output: { schema: PropertyMatcherOutputSchema },
  prompt: `You are an expert real estate consultant. Match the client with the best matching 2-3 properties from the listings.
  
Client: {{{contact.name}}}
Budget Category: {{{contact.budget}}}
Location Preference: {{{contact.locationPreference}}}
Property Preferred Type: {{{contact.propertyPreference}}}
Notes/Preferences: {{{contact.notes}}}

Evaluate how well each listing matches the client's dimensions (Budget Category vs Listing basePrice, Preferred Locations vs Listing location, Property Preference vs Listing propertyType, specific keywords in notes vs Listing amenities and USPs).

Budget Category maps:
- '<1' fits basePrice < 1
- '1-3' fits 1 <= basePrice <= 3
- '3-6' fits 3 <= basePrice <= 6
- '6-10' fits 6 <= basePrice <= 10
- '>10' fits basePrice > 10

For each selected property, assign a 'matchScore' (0-100) representing match quality.
Select the top 2-3 best properties.

Produce:
1. 'recommendations': A friendly, warm summary of these top recommendations in clean, readable markdown (using bold titles, nice negative space, and bullet list format). Do not use raw HTML. Let it sound professional, tailored to the client's explicit requirements.
2. 'suggestedProperties': A structured list of these selected listings, including their ID, name, matchScore, individual matchReason, and a list of keySellingPoints.

Listings:
{{{listings}}}`,
});

const propertyMatcherFlow = ai.defineFlow(
  {
    name: 'propertyMatcherFlow',
    inputSchema: PropertyMatcherInputSchema,
    outputSchema: PropertyMatcherOutputSchema,
  },
  async (input) => {
    const listings = await getListings();
    const { output } = await prompt({
      contact: input.contact,
      listings: JSON.stringify(listings),
    });
    return output!;
  }
);

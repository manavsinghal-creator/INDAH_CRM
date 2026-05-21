
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getListings } from '@/app/actions';
import { QuickPropertyMatcherInputSchema, QuickPropertyMatcherOutputSchema } from '@/lib/types';

export async function quickPropertyMatcher(
  input: z.infer<typeof QuickPropertyMatcherInputSchema>
): Promise<z.infer<typeof QuickPropertyMatcherOutputSchema>> {
  return quickPropertyMatcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quickPropertyMatcherPrompt',
  input: { schema: z.object({ criteria: z.any(), listings: z.string() }) },
  output: { schema: QuickPropertyMatcherOutputSchema },
  prompt: `Find the top 5 properties matching these criteria:
{{{criteria}}}

Listings:
{{{listings}}}`,
});

const quickPropertyMatcherFlow = ai.defineFlow(
  {
    name: 'quickPropertyMatcherFlow',
    inputSchema: QuickPropertyMatcherInputSchema,
    outputSchema: QuickPropertyMatcherOutputSchema,
  },
  async (input) => {
    const listings = await getListings();
    const { output } = await prompt({
      criteria: JSON.stringify(input),
      listings: JSON.stringify(listings),
    });
    return output!;
  }
);

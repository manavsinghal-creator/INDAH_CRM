
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateDescriptionInputSchema } from '@/lib/types';

const GenerateDescriptionOutputSchema = z.object({
  description: z.string(),
});
export type GenerateDescriptionOutput = z.infer<typeof GenerateDescriptionOutputSchema>;

export async function generateDescription(
  input: z.infer<typeof GenerateDescriptionInputSchema>
): Promise<GenerateDescriptionOutput> {
  return descriptionGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'descriptionGeneratorPrompt',
  input: { schema: GenerateDescriptionInputSchema },
  output: { schema: GenerateDescriptionOutputSchema },
  prompt: `Write a luxury property description for:
{{{listingName}}} in {{{location}}} ({{{bhkConfiguration}}} {{{propertyType}}})
Amenities: {{{amenities}}}
USPs: {{{usps}}}`,
});

const descriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'descriptionGeneratorFlow',
    inputSchema: GenerateDescriptionInputSchema,
    outputSchema: GenerateDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

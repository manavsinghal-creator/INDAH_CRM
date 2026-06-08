'use server';

import { z } from 'zod';
import { GenerateDescriptionInputSchema, QuickPropertyMatcherInputSchema } from '@/lib/types';
import type { PropertyMatcherInput, PropertyMatcherOutput } from '@/ai/flows/property-matcher';
import type { ContactMatcherInput, ContactMatcherOutput } from '@/lib/types';
import type { GenerateDescriptionOutput } from '@/ai/flows/description-generator';
import type { QuickPropertyMatcherOutput } from '@/lib/types';
import { requireAuthorizedUser } from '@/lib/auth-server';

export async function findPropertyMatches(input: PropertyMatcherInput): Promise<{ success: boolean; data?: PropertyMatcherOutput; error?: string }> {
  await requireAuthorizedUser();
  try {
    const { propertyMatcher } = await import('@/ai/flows/property-matcher');
    const data = await propertyMatcher(input);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function findContactMatches(input: ContactMatcherInput): Promise<{ success: boolean; data?: ContactMatcherOutput; error?: string }> {
  await requireAuthorizedUser();
  try {
    const { contactMatcher } = await import('@/ai/flows/contact-matcher');
    const data = await contactMatcher(input);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function generateListingDescription(input: z.infer<typeof GenerateDescriptionInputSchema>): Promise<{ success: boolean; data?: GenerateDescriptionOutput; error?: string }> {
  await requireAuthorizedUser();
  try {
    const { generateDescription } = await import('@/ai/flows/description-generator');
    const data = await generateDescription(input);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function findQuickPropertyMatches(input: z.infer<typeof QuickPropertyMatcherInputSchema>): Promise<{ success: boolean, data?: QuickPropertyMatcherOutput, error?: string }> {
    await requireAuthorizedUser();
    try {
        const { quickPropertyMatcher } = await import('@/ai/flows/quick-property-matcher');
        const data = await quickPropertyMatcher(input);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}

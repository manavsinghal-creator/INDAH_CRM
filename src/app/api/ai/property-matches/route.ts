import { NextRequest, NextResponse } from 'next/server';
import { propertyMatcher } from '@/ai/flows/property-matcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await propertyMatcher(body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

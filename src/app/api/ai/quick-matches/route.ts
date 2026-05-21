import { NextRequest, NextResponse } from 'next/server';
import { quickPropertyMatcher } from '@/ai/flows/quick-property-matcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await quickPropertyMatcher(body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

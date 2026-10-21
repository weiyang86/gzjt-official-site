import { NextResponse } from 'next/server';
import { getPublicCompanies } from '@/lib/cms';

export async function GET() {
  try {
    const companies = await getPublicCompanies();
    return NextResponse.json(companies);
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}

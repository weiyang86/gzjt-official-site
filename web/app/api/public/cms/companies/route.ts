import { NextResponse } from 'next/server';
import { getPublicCompanies } from '@/lib/cms';
import { fallbackCompanies } from '@/lib/cms/fallback-site';

export async function GET() {
  try {
    const companies = await getPublicCompanies();
    return NextResponse.json(companies.length ? companies : fallbackCompanies);
  } catch {
    return NextResponse.json(fallbackCompanies);
  }
}

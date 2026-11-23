import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Cleanly redirect /invitation to the static /invitation.html page
  return NextResponse.redirect(new URL('/invitation.html', request.url), 307);
}

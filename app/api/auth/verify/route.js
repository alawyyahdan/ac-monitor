import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function GET(request) {
  try {
    const token = request.cookies.get('sus_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);

    return NextResponse.json({ success: true, authenticated: true });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

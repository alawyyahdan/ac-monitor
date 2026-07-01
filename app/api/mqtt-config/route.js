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

    // Return MQTT config from env — only exposed after successful auth verification
    return NextResponse.json({
      host: process.env.MQTT_HOST || '',
      port: parseInt(process.env.MQTT_PORT || '8083'),
      username: process.env.MQTT_USERNAME || '',
      password: process.env.MQTT_PASSWORD || '',
      useSSL: process.env.MQTT_USE_SSL === 'true',
      rate: parseFloat(process.env.ELECTRICITY_RATE || '1699.53'),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

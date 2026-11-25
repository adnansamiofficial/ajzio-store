export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    currency: '৳',
    announcement: process.env.STORE_ANNOUNCEMENT || '',
    heroLine1: process.env.STORE_HERO_LINE_1 || 'Quality you can',
    heroAccent: process.env.STORE_HERO_ACCENT || 'feel',
    heroLine2: process.env.STORE_HERO_LINE_2 || 'every day',
    heroText: process.env.STORE_HERO_TEXT || 'Carefully chosen products, delivered to your door. Welcome to AJZIO Store.',
    contact: {
      phone: process.env.STORE_PHONE || '',
      whatsapp: process.env.STORE_WHATSAPP || '',
      email: process.env.STORE_EMAIL || '',
      address: process.env.STORE_ADDRESS || '',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

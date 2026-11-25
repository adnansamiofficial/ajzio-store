export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.BUSINESSKORO_API_KEY?.trim()),
    domainConfigured: Boolean(process.env.STOREFRONT_DOMAIN?.trim()),
    domain: (process.env.STOREFRONT_DOMAIN || '').trim(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

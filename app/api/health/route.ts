export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.BUSINESSKORO_API_KEY?.trim()),
    domainHeaderConfigured: Boolean(process.env.STOREFRONT_DOMAIN?.trim()),
    runtime: 'nodejs',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

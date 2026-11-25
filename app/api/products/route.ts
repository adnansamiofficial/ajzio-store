import { BusinessKoroError, clientError, getPrivateCatalog, toPublicProduct } from '../../../lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cached: { value: Awaited<ReturnType<typeof getPrivateCatalog>>; expiresAt: number } | null = null;

export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get('refresh') === '1';
    if (!force && cached && cached.expiresAt > Date.now()) {
      return Response.json({
        data: cached.value.products.map(toPublicProduct),
        deliveryCharges: cached.value.deliveryCharges,
        count: cached.value.products.length,
      }, { headers: { 'Cache-Control': 'private, max-age=30' } });
    }
    const catalog = await getPrivateCatalog();
    cached = { value: catalog, expiresAt: Date.now() + 45_000 };
    return Response.json({
      data: catalog.products.map(toPublicProduct),
      deliveryCharges: catalog.deliveryCharges,
      count: catalog.products.length,
    }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) {
    const details = clientError(error);
    const status = error instanceof BusinessKoroError ? 502 : 503;
    return Response.json(details, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

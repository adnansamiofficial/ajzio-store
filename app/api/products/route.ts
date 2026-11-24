import { BusinessKoroError, getStoreProducts } from '@/lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedProducts: { value: Awaited<ReturnType<typeof getStoreProducts>>; expiresAt: number } | null = null;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  if (!forceRefresh && cachedProducts && cachedProducts.expiresAt > Date.now()) {
    return Response.json(cachedProducts.value, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  }

  try {
    const products = await getStoreProducts();
    cachedProducts = { value: products, expiresAt: Date.now() + 60_000 };
    return Response.json(products, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    const isBusinessKoroError = error instanceof BusinessKoroError;
    return Response.json({
      error: error instanceof Error ? error.message : 'Product loading failed.',
      source: 'businesskoro',
      supplierStatus: isBusinessKoroError ? error.status : undefined,
      cloudflareBlocked: isBusinessKoroError ? error.cloudflareBlocked : false,
      ownerActionRequired: isBusinessKoroError ? error.cloudflareBlocked : false,
      rayId: isBusinessKoroError ? error.rayId : undefined,
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

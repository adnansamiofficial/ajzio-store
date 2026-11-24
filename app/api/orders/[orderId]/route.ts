import { BusinessKoroError, businessKoroRequest } from '@/lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: { orderId: string } }) {
  const orderId = String(context.params.orderId || '').trim();
  if (!orderId || orderId.length > 160 || /[\/\\]/.test(orderId)) {
    return Response.json({ error: 'Invalid order ID.' }, { status: 400 });
  }

  try {
    const result = await businessKoroRequest<unknown>(`/orders/${encodeURIComponent(orderId)}`);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const isBusinessKoroError = error instanceof BusinessKoroError;
    return Response.json({
      error: error instanceof Error ? error.message : 'Order status could not be loaded.',
      supplierStatus: isBusinessKoroError ? error.status : undefined,
      cloudflareBlocked: isBusinessKoroError ? error.cloudflareBlocked : false,
      ownerActionRequired: isBusinessKoroError ? error.cloudflareBlocked : false,
      rayId: isBusinessKoroError ? error.rayId : undefined,
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

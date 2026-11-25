import { clientError, businessKoroRequest, BusinessKoroError } from '../../../../lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: { orderId: string } }) {
  const orderId = String(context.params.orderId || '').trim();
  if (!orderId || orderId.length > 180 || /[\u0000-\u001f]/.test(orderId)) {
    return Response.json({ error: 'A valid order ID is required.' }, { status: 400 });
  }

  try {
    const status = await businessKoroRequest<unknown>(`/orders/${encodeURIComponent(orderId)}`);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = clientError(error);
    return Response.json(details, { status: error instanceof BusinessKoroError ? 502 : 503 });
  }
}

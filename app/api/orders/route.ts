import { BusinessKoroError, businessKoroRequest } from '@/lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requiredFields = [
  'productId', 'customerName', 'customerPhone', 'customerAddress',
  'customerDivision', 'customerDistrict', 'customerArea', 'sellingPrice',
] as const;

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const missing = requiredFields.filter((field) => input[field] === undefined || input[field] === null || String(input[field]).trim() === '');
    if (missing.length) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const sellingPrice = Number(input.sellingPrice);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return Response.json({ error: 'Selling price must be a positive number.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      productId: String(input.productId),
      customerName: String(input.customerName).trim().slice(0, 120),
      customerPhone: String(input.customerPhone).trim().slice(0, 32),
      customerAddress: String(input.customerAddress).trim().slice(0, 600),
      customerDivision: String(input.customerDivision).trim().slice(0, 80),
      customerDistrict: String(input.customerDistrict).trim().slice(0, 80),
      customerArea: String(input.customerArea).trim().slice(0, 100),
      sellingPrice,
      deliveryChargePaidByCustomer: input.deliveryChargePaidByCustomer !== false,
      customerNote: String(input.customerNote || '').trim().slice(0, 1000),
    };

    if (typeof input.variant === 'string' && input.variant.trim()) payload.variant = input.variant.trim().slice(0, 120);
    if (input.deliveryChargeCollectionMode === 'CUSTOMER_PAID_RESELLER_UPFRONT') {
      payload.deliveryChargeCollectionMode = 'CUSTOMER_PAID_RESELLER_UPFRONT';
    }
    if (input.allowDuplicate === true) payload.allowDuplicate = true;

    const result = await businessKoroRequest<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const isBusinessKoroError = error instanceof BusinessKoroError;
    return Response.json({
      error: error instanceof Error ? error.message : 'Order could not be submitted.',
      supplierStatus: isBusinessKoroError ? error.status : undefined,
      cloudflareBlocked: isBusinessKoroError ? error.cloudflareBlocked : false,
      ownerActionRequired: isBusinessKoroError ? error.cloudflareBlocked : false,
      rayId: isBusinessKoroError ? error.rayId : undefined,
    }, { status: isBusinessKoroError ? 502 : 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

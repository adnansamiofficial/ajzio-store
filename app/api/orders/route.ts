import {
  BusinessKoroError,
  cleanText,
  clientError,
  getPrivateCatalog,
  getSellingPrice,
  normalizeBanglaDigits,
  businessKoroRequest,
} from '../../../lib/business-koro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

function text(value: unknown, max: number) { return cleanText(value, max); }

export async function POST(request: Request) {
  try {
    const rawLength = Number(request.headers.get('content-length') || 0);
    if (rawLength > 24_000) return Response.json({ error: 'Order details are too large.' }, { status: 413 });

    const input = await request.json() as Record<string, unknown>;
    const required = ['productId', 'customerName', 'customerPhone', 'customerAddress', 'customerDivision', 'customerDistrict', 'customerArea'];
    const missing = required.filter((field) => !text(input[field], 1000));
    if (missing.length) return Response.json({ error: `Please complete: ${missing.join(', ')}.` }, { status: 400 });

    const customerName = text(input.customerName, 100);
    const customerPhone = normalizeBanglaDigits(text(input.customerPhone, 32)).replace(/[\s-]/g, '');
    const phoneValid = /^(?:01[3-9]\d{8}|\+?8801[3-9]\d{8})$/.test(customerPhone);
    if (!phoneValid) return Response.json({ error: 'Enter a valid Bangladesh mobile number, e.g. 01712345678 or +8801712345678.' }, { status: 400 });

    const productId = text(input.productId, 160);
    const customerDivision = text(input.customerDivision, 80);
    const customerDistrict = text(input.customerDistrict, 80);
    const customerArea = text(input.customerArea, 100);
    const customerAddress = text(input.customerAddress, 600);
    const deliveryChargePaidByCustomer = input.deliveryChargePaidByCustomer !== false;

    // Refresh the supplier catalogue when placing an order so stock and minimum selling prices are current.
    const catalog = await getPrivateCatalog();
    const product = catalog.products.find((item) => item.id === productId);
    if (!product) return Response.json({ error: 'This product is no longer available. Refresh the catalogue and try again.' }, { status: 409 });
    if (!product.inStock) return Response.json({ error: 'This product is out of stock.' }, { status: 409 });

    let selectedColor = text(input.color, 120);
    let selectedSize = text(input.size, 120);
    const requestedVariant = text(input.variant, 260);
    if (product.variants.length) {
      // Existing AJZIO pages submit a single display label such as `Black / Large`.
      // Resolve that label back to the exact supplier variant before sending the order.
      const matchedVariant = product.variants.find((variant) => {
        if (variant.inStock === false) return false;
        if (selectedColor || selectedSize) {
          return (variant.color || '') === selectedColor && (variant.size || '') === selectedSize;
        }
        const label = [variant.color, variant.size].filter(Boolean).join(' / ');
        return Boolean(requestedVariant) && label === requestedVariant;
      });
      if (!matchedVariant) {
        return Response.json({ error: 'Please select an available colour/size option for this product.' }, { status: 400 });
      }
      selectedColor = matchedVariant.color || '';
      selectedSize = matchedVariant.size || '';
    } else if (selectedColor || selectedSize || requestedVariant) {
      return Response.json({ error: 'This product does not have selectable variants.' }, { status: 400 });
    }

    const sellingPrice = getSellingPrice(product);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= product.costPrice || sellingPrice <= 0) {
      return Response.json({ error: 'This product is not configured with a valid selling price. Please contact the store.' }, { status: 409 });
    }

    const districtIsDhaka = /^(dhaka|ঢাকা)$/i.test(customerDistrict);
    const minimumSellingPrice = deliveryChargePaidByCustomer
      ? product.minimumSellingPrice.customerPaysDelivery
      : districtIsDhaka
        ? product.minimumSellingPrice.resellerPaysDeliveryInsideDhaka
        : product.minimumSellingPrice.resellerPaysDeliveryOutsideDhaka;
    if (minimumSellingPrice > 0 && sellingPrice < minimumSellingPrice) {
      return Response.json({
        error: 'The current selling price for this product is below the supplier minimum for the selected delivery arrangement. Please contact AJZIO before placing this order.',
        priceNeedsReview: true,
      }, { status: 409 });
    }

    const payload: Record<string, unknown> = {
      productId,
      customerName,
      customerPhone,
      customerAddress,
      customerDivision,
      customerDistrict,
      customerArea,
      sellingPrice,
      deliveryChargePaidByCustomer,
    };
    const customerNote = text(input.customerNote, 1000);
    if (customerNote) payload.customerNote = customerNote;
    if (selectedColor) payload.color = selectedColor;
    if (selectedSize) payload.size = selectedSize;
    if (selectedColor || selectedSize) payload.variant = [selectedColor, selectedSize].filter(Boolean).join(' / ');
    if (input.allowDuplicate === true) payload.allowDuplicate = true;
    if (input.deliveryChargeCollectionMode === 'CUSTOMER_PAID_RESELLER_UPFRONT') {
      payload.deliveryChargeCollectionMode = 'CUSTOMER_PAID_RESELLER_UPFRONT';
    }

    const supplierResult = await businessKoroRequest<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const root = supplierResult && typeof supplierResult === 'object' ? supplierResult as Record<string, unknown> : {};
    const nested = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : {};
    const orderId = root.orderId || root.id || nested.orderId || nested.id || null;
    const status = String(root.status || nested.status || 'SUBMITTED');
    return Response.json({ ok: true, orderId, status, duplicate: root.duplicate === true || nested.duplicate === true }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const details = clientError(error);
    const status = error instanceof BusinessKoroError ? 502 : 503;
    return Response.json(details, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

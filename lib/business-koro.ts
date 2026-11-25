const STOREFRONT_BASE = 'https://api.businesskoro.com/api/v1/storefront';

export type SupplierVariant = {
  color?: string | null;
  size?: string | null;
  inStock?: boolean;
};

export type PrivateSupplierProduct = {
  id: string;
  name: string;
  description: string;
  images: string[];
  suggestedPrice: number;
  costPrice: number;
  packagingCost: number;
  minimumSellingPrice: {
    customerPaysDelivery: number;
    resellerPaysDeliveryInsideDhaka: number;
    resellerPaysDeliveryOutsideDhaka: number;
  };
  inStock: boolean;
  variants: SupplierVariant[];
};

export type PublicStoreProduct = {
  id: string;
  name: string;
  description: string;
  images: string[];
  image: string;
  price: number;
  /** Same customer-facing amount as price; retained for the existing storefront UI. */
  suggestedPrice: number;
  category: string;
  inStock: boolean;
  variants: SupplierVariant[];
  /** Deliberately optional and not sent to the browser; the server validates supplier floors at checkout. */
  minimumSellingPrice?: {
    customerPaysDelivery?: number;
    resellerPaysDeliveryInsideDhaka?: number;
    resellerPaysDeliveryOutsideDhaka?: number;
  };
};

/** Backwards-compatible public product type used by the existing Next.js pages. */
export type StoreProduct = PublicStoreProduct;

export type StoreCatalog = {
  products: PrivateSupplierProduct[];
  deliveryCharges: { insideDhaka: number; outsideDhaka: number };
};

export class BusinessKoroError extends Error {
  status: number;
  rayId?: string;
  cloudflareBlocked: boolean;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown, rayId?: string, cloudflareBlocked = false) {
    super(message);
    this.name = 'BusinessKoroError';
    this.status = status;
    this.payload = payload;
    this.rayId = rayId;
    this.cloudflareBlocked = cloudflareBlocked;
  }
}

function configuredDomain(): string {
  return (process.env.STOREFRONT_DOMAIN || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .split('/')[0];
}

function headers(): Headers {
  const apiKey = process.env.BUSINESSKORO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('BUSINESSKORO_API_KEY is missing. Add it to Vercel Environment Variables and redeploy.');
  }

  const result = new Headers({
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  const domain = configuredDomain();
  if (domain) result.set('x-domain', domain);
  return result;
}

export async function businessKoroRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestHeaders = headers();
  if (init.headers) new Headers(init.headers).forEach((value, key) => requestHeaders.set(key, value));

  let response: Response;
  try {
    response = await fetch(`${STOREFRONT_BASE}${path}`, {
      ...init,
      headers: requestHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new Error(error instanceof Error ? `Could not reach Business Koro: ${error.message}` : 'Could not reach Business Koro.');
  }

  const raw = await response.text();
  let body: unknown = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }

  if (!response.ok) {
    const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const errorName = String(record.error_name || '');
    const errorCode = String(record.error_code || '');
    const rayId = typeof record.ray_id === 'string' ? record.ray_id : undefined;
    const cloudflareBlocked = response.status === 403 && (errorName === 'browser_signature_banned' || errorCode === '1010');
    let message = `Business Koro returned HTTP ${response.status}: ${typeof body === 'string' ? body.slice(0, 600) : JSON.stringify(body).slice(0, 600)}`;

    if (response.status === 401) message = 'Business Koro rejected the API key (401). Check BUSINESSKORO_API_KEY in the active Vercel environment and redeploy.';
    else if (response.status === 403 && /locked to domain|Origin, Referer|x-domain/i.test(raw)) {
      message = `Business Koro domain verification failed. Set STOREFRONT_DOMAIN to ${configuredDomain() || 'the exact domain locked to your API key'} in Vercel and redeploy.`;
    } else if (cloudflareBlocked) {
      message = `Business Koro Cloudflare blocked this server request (Error 1010). Do not keep retrying; ask Business Koro support to allow the Vercel server integration. ${rayId ? `Ray ID: ${rayId}` : ''}`.trim();
    }
    throw new BusinessKoroError(message, response.status, body, rayId, cloudflareBlocked);
  }

  if (body === null || typeof body !== 'object') throw new Error('Business Koro returned an unreadable response.');
  return body as T;
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function categoryFor(name: string, description: string, rawCategory?: unknown): string {
  if (typeof rawCategory === 'string' && rawCategory.trim()) return rawCategory.trim();
  const text = `${name} ${description}`.toLowerCase();
  if (/earbud|headphone|speaker|audio|microphone|mic/.test(text)) return 'Audio';
  if (/watch|fitness band|smart.?watch|wearable/.test(text)) return 'Wearables';
  if (/power bank|charger|charging|cable|adapter/.test(text)) return 'Power';
  if (/phone|mobile|tablet|case|cover|stand/.test(text)) return 'Mobile';
  if (/game|gaming|controller/.test(text)) return 'Gaming';
  if (/keyboard|mouse|laptop|computer|desk/.test(text)) return 'Workspace';
  return 'Everyday tech';
}

function extractProducts(body: unknown): Record<string, unknown>[] {
  const root = recordOf(body);
  const data = root.data ?? root.products;
  if (Array.isArray(data)) return data.map(recordOf);
  const nested = recordOf(data);
  const list = nested.products ?? nested.items ?? nested.data;
  return Array.isArray(list) ? list.map(recordOf) : [];
}

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeSupplierProduct(raw: Record<string, unknown>): PrivateSupplierProduct | null {
  if (raw.id === undefined || raw.id === null || !String(raw.name || '').trim()) return null;
  const minimum = recordOf(raw.minimumSellingPrice);
  const variants = Array.isArray(raw.variants)
    ? raw.variants.map(recordOf).map((v) => ({
      color: typeof v.color === 'string' ? v.color : null,
      size: typeof v.size === 'string' ? v.size : null,
      inStock: v.inStock !== false,
    }))
    : [];
  const images = Array.isArray(raw.images)
    ? raw.images.map((image) => typeof image === 'string' ? image : '').filter((image) => /^https?:\/\//i.test(image))
    : [];

  return {
    id: String(raw.id),
    name: String(raw.name).trim(),
    description: typeof raw.description === 'string' ? raw.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000) : '',
    images,
    suggestedPrice: numberOrZero(raw.suggestedPrice),
    costPrice: numberOrZero(raw.costPrice),
    packagingCost: numberOrZero(raw.packagingCost),
    minimumSellingPrice: {
      customerPaysDelivery: numberOrZero(minimum.customerPaysDelivery),
      resellerPaysDeliveryInsideDhaka: numberOrZero(minimum.resellerPaysDeliveryInsideDhaka),
      resellerPaysDeliveryOutsideDhaka: numberOrZero(minimum.resellerPaysDeliveryOutsideDhaka),
    },
    inStock: raw.inStock !== false,
    variants,
  };
}

export async function getPrivateCatalog(): Promise<StoreCatalog> {
  const body = await businessKoroRequest<unknown>('/products');
  const root = recordOf(body);
  const products = extractProducts(body)
    .map(normalizeSupplierProduct)
    .filter((item): item is PrivateSupplierProduct => item !== null);
  const delivery = recordOf(root.deliveryCharges);
  return {
    products,
    deliveryCharges: {
      insideDhaka: numberOrZero(delivery.insideDhaka),
      outsideDhaka: numberOrZero(delivery.outsideDhaka),
    },
  };
}

/** Public catalogue contract expected by the existing product detail route. Never returns supplier costs. */
export async function getStoreProducts(): Promise<{ data: StoreProduct[]; deliveryCharges: StoreCatalog['deliveryCharges'] }> {
  const catalog = await getPrivateCatalog();
  return {
    data: catalog.products.map(toPublicProduct),
    deliveryCharges: catalog.deliveryCharges,
  };
}

export function getSellingPrice(product: PrivateSupplierProduct): number {
  const multiplierValue = Number(process.env.AJZIO_PRICE_MULTIPLIER || '1');
  const multiplier = Number.isFinite(multiplierValue) && multiplierValue > 0 ? multiplierValue : 1;
  return Math.round(product.suggestedPrice * multiplier);
}

export function toPublicProduct(product: PrivateSupplierProduct): PublicStoreProduct {
  const price = getSellingPrice(product);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images,
    image: product.images[0] || '',
    price,
    suggestedPrice: price,
    category: categoryFor(product.name, product.description),
    inStock: product.inStock,
    variants: product.variants,
  };
}

export function clientError(error: unknown) {
  if (error instanceof BusinessKoroError) {
    return {
      error: error.message,
      supplierStatus: error.status,
      cloudflareBlocked: error.cloudflareBlocked,
      rayId: error.rayId,
    };
  }
  return { error: error instanceof Error ? error.message : 'Unexpected storefront error.' };
}

export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
}

export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

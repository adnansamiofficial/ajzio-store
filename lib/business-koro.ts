const STOREFRONT_BASE = 'https://api.businesskoro.com/api/v1/storefront';
const INTEGRATION_USER_AGENT = 'AJZIO-Store/1.0 (server-side storefront)';

export type StoreVariant = {
  color?: string | null;
  size?: string | null;
  inStock?: boolean;
};

export type MinimumSellingPrice = {
  customerPaysDelivery?: number;
  resellerPaysDeliveryInsideDhaka?: number;
  resellerPaysDeliveryOutsideDhaka?: number;
};

export type StoreProduct = {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  suggestedPrice?: number;
  minimumSellingPrice?: MinimumSellingPrice;
  inStock?: boolean;
  variants?: StoreVariant[];
};

export type ProductsResult = {
  data: StoreProduct[];
  deliveryCharges: { insideDhaka?: number; outsideDhaka?: number };
  count: number;
};

export class BusinessKoroError extends Error {
  status: number;
  cloudflareBlocked: boolean;
  rayId?: string;

  constructor(message: string, status: number, cloudflareBlocked = false, rayId?: string) {
    super(message);
    this.name = 'BusinessKoroError';
    this.status = status;
    this.cloudflareBlocked = cloudflareBlocked;
    this.rayId = rayId;
  }
}

function getHeaders(): HeadersInit {
  const apiKey = process.env.BUSINESSKORO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Business Koro API key is not configured. Add BUSINESSKORO_API_KEY to your Vercel Environment Variables or local .env file.');
  }

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': INTEGRATION_USER_AGENT,
  };

  const domain = process.env.STOREFRONT_DOMAIN?.trim();
  if (domain) headers['x-domain'] = domain;
  return headers;
}

export async function businessKoroRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(getHeaders());
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  const response = await fetch(`${STOREFRONT_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });

  const rawText = await response.text();
  let body: unknown = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const errorName = String(payload.error_name || '');
    const errorCode = String(payload.error_code || '');
    const cloudflareBlocked = response.status === 403 && (
      errorName === 'browser_signature_banned' || errorCode === '1010'
    );
    const rayId = typeof payload.ray_id === 'string' ? payload.ray_id : undefined;
    const message = cloudflareBlocked
      ? 'Business Koro blocked this server request with Cloudflare Error 1010. This is an access restriction on the supplier side. Do not keep retrying; ask Business Koro to allow the AJZIO server integration.'
      : `Business Koro returned HTTP ${response.status}: ${rawText.slice(0, 700) || response.statusText}`;
    throw new BusinessKoroError(message, response.status, cloudflareBlocked, rayId);
  }

  if (body === null) throw new Error('Business Koro returned an unreadable JSON response.');
  return body as T;
}

function normalizeProductList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  if (!raw || typeof raw !== 'object') return [];
  const record = raw as Record<string, unknown>;
  const data = record.data ?? record.products;
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    const items = nested.products ?? nested.items;
    if (Array.isArray(items)) return items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  }
  return [];
}

function publicProduct(product: Record<string, unknown>): StoreProduct | null {
  if (product.id === undefined || product.id === null || !product.name) return null;
  const variants = Array.isArray(product.variants)
    ? product.variants
        .filter((variant): variant is Record<string, unknown> => Boolean(variant) && typeof variant === 'object')
        .map((variant) => ({
          color: typeof variant.color === 'string' ? variant.color : null,
          size: typeof variant.size === 'string' ? variant.size : null,
          inStock: variant.inStock !== false,
        }))
    : [];

  const minimum = product.minimumSellingPrice && typeof product.minimumSellingPrice === 'object'
    ? product.minimumSellingPrice as Record<string, unknown>
    : {};

  return {
    id: String(product.id),
    name: String(product.name),
    description: typeof product.description === 'string' ? product.description : '',
    images: Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string' && /^https?:\/\//i.test(image)) : [],
    suggestedPrice: Number.isFinite(Number(product.suggestedPrice)) ? Number(product.suggestedPrice) : 0,
    minimumSellingPrice: {
      customerPaysDelivery: Number(minimum.customerPaysDelivery || 0),
      resellerPaysDeliveryInsideDhaka: Number(minimum.resellerPaysDeliveryInsideDhaka || 0),
      resellerPaysDeliveryOutsideDhaka: Number(minimum.resellerPaysDeliveryOutsideDhaka || 0),
    },
    inStock: product.inStock !== false,
    variants,
  };
}

export async function getStoreProducts(): Promise<ProductsResult> {
  const raw = await businessKoroRequest<Record<string, unknown>>('/products');
  const items = normalizeProductList(raw).map(publicProduct).filter((item): item is StoreProduct => item !== null);
  const delivery = raw && typeof raw.deliveryCharges === 'object' && raw.deliveryCharges
    ? raw.deliveryCharges as Record<string, unknown>
    : {};

  return {
    data: items,
    deliveryCharges: {
      insideDhaka: Number(delivery.insideDhaka || 0),
      outsideDhaka: Number(delivery.outsideDhaka || 0),
    },
    count: items.length,
  };
}

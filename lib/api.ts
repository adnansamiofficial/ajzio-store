const BASE = process.env.BUSINESSKORO_BASE_URL || "https://api.businesskoro.com/api/v1/storefront";

function headers() {
  const key = process.env.BUSINESSKORO_API_KEY;
  if (!key) throw new Error("Store API is not configured yet. Please add BUSINESSKORO_API_KEY in Vercel Environment Variables.");
  const h: Record<string, string> = { "x-api-key": key, "Content-Type": "application/json" };
  const domain = process.env.BUSINESSKORO_DOMAIN?.trim();
  if (domain) h["x-domain"] = domain;
  return h;
}

export async function storefrontFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || data?.error || `Business Koro returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export type StoreProduct = {
  id: string; name: string; description?: string; images?: string[];
  suggestedPrice?: number; costPrice?: number; packagingCost?: number;
  minimumSellingPrice?: { customerPaysDelivery?: number; resellerPaysDeliveryInsideDhaka?: number; resellerPaysDeliveryOutsideDhaka?: number };
  inStock?: boolean; variants?: { color?: string | null; size?: string | null; inStock?: boolean }[];
};

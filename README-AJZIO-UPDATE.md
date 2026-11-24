# AJZIO Store — Next.js integration update

This patch is designed for the existing `adnansamiofficial/ajzio-store` Next.js 14 App Router repository.

## Files included

- `app/page.tsx` — AJZIO sage/forest storefront, product catalogue, search, cart and checkout UI.
- `app/globals.css` — brand-standard sage and forest-charcoal styling with responsive motion.
- `app/layout.tsx` — metadata and favicon setup.
- `app/api/products/route.ts` — server-side Business Koro product proxy (filters private `costPrice`).
- `app/api/orders/route.ts` — server-side order submission with input validation.
- `app/api/orders/[orderId]/route.ts` — server-side order status lookup.
- `app/api/health/route.ts` — checks whether the server has an API key configured without exposing it.
- `lib/api.ts` — Business Koro server integration.
- `public/brand-assets/*`, `public/favicon.svg` — AJZIO logo and icon assets.

## Local setup

1. Copy `.env.example` to `.env.local` in the Next.js project root.
2. Set `BUSINESSKORO_API_KEY` in `.env.local`. Set `STOREFRONT_DOMAIN` only if Business Koro has a domain restriction configured.
3. Run `npm install` if needed, then `npm run dev`.
4. Open `http://localhost:3000`.
5. Check `http://localhost:3000/api/health` and `http://localhost:3000/api/products`.

## Vercel setup

In Project → Settings → Environment Variables, add:

- `BUSINESSKORO_API_KEY` = the private API key
- `STOREFRONT_DOMAIN` = optional; leave unset if not configured by Business Koro

Redeploy after changing environment variables. Never add the API key to `NEXT_PUBLIC_*` variables.

## Cloudflare 1010

The API proxy honestly identifies itself as `AJZIO-Store/1.0 (server-side storefront)`. If Business Koro returns Cloudflare Error 1010 (`browser_signature_banned`), the storefront reports that supplier access approval is needed and does not retry in a loop. A Vercel deployment may use a different outgoing request source, but it is not guaranteed to fix an explicit supplier-side block. Ask Business Koro support to allow the AJZIO server integration and confirm whether Vercel-hosted requests are supported.

## Important order behaviour

The supplied Business Koro API accepts one `productId` per order. Therefore the checkout requires exactly one cart line per order. It sends the selected product's listed selling price, customer-paid delivery mode, customer details and selected variant (when present). Business Koro remains authoritative for its minimum selling-price and profit validations.

The public product route only returns the documented customer-safe fields. `costPrice` and other supplier-private properties are never passed to the browser.

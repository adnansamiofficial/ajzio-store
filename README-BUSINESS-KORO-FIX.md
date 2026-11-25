# AJZIO Store — Business Koro + Vercel repair patch

This patch keeps the uploaded AJZIO Store storefront HTML, original logo files, color system, layout and animations. It replaces the generic supplier integration with Business Koro's documented Storefront API and makes the project compatible with the existing Next.js 14/Vercel repository.

## What changed

- The original UI and the three supplied logo PNG assets are kept in `public/storefront.html` and `public/logo/`.
- A Next.js rewrite serves that original storefront at `/`; Next.js continues handling `/api/*` endpoints.
- Product requests use `x-api-key` and `x-domain` from server-only environment variables. The API key is never sent to browser JavaScript.
- Product mapping uses Business Koro fields: `id`, `name`, `description`, `images[]`, `suggestedPrice`, `inStock`, `variants`, and `deliveryCharges`.
- `costPrice`, `packagingCost`, and `minimumSellingPrice` are used only inside the server order validator and are never returned in public product JSON.
- Checkout collects the Business Koro required customer fields: name, phone, full address, division, district and area. It sends the actual `sellingPrice`, delivery payer choice, note, and exact selected `color` / `size` values.
- Product stock, selected variant stock, price > cost, and the correct minimum selling price are checked server-side using a fresh supplier product list before an order is sent.
- Order submission goes directly to Business Koro. No `orders.jsonl` file or local filesystem persistence is used, because Vercel functions have ephemeral local storage.
- Order status can be checked through `GET /api/orders/{orderId}`.
- No custom User-Agent is forced; this avoids unnecessarily impersonating a browser or changing the request signature.

## Apply to the existing Next.js repository

Extract this patch into the root of the existing `AJZIO-Store-Git` folder, preserving `.env.local`:

```bash
cd ~/AJZIO-Store-Git
unzip -o ~/Downloads/AJZIO-BusinessKoro-Fixed.zip
```

Then create/update `.env.local` locally (do not commit it):

```env
BUSINESSKORO_API_KEY=your_real_key
STOREFRONT_DOMAIN=ajziostore.vercel.app
AJZIO_PRICE_MULTIPLIER=1
```

Set the same two required variables in Vercel Project Settings → Environment Variables for **Production**, then redeploy.

## Verify locally

```bash
npm run build
npm run dev
```

Open `http://localhost:3000`, then check:

- `/api/health` — confirms that the server sees the required environment variables (does not reveal the API key).
- `/api/products` — returns `{ data, deliveryCharges, count }` with no supplier cost fields.

## Order behavior and API constraints

Business Koro's documented order endpoint accepts one `productId` per order and does not support `quantity` as a meaningful field. Therefore the preserved cart UI can hold multiple products, but checkout intentionally asks the customer to submit **one product at a time**. This avoids silently dropping quantities or creating multiple unannounced supplier orders. After completing one order, the customer can return and check out the next product.

Delivery charge is estimated from Business Koro's current `deliveryCharges`. Dhaka district uses `insideDhaka`; other districts use `outsideDhaka`. If the customer pays delivery, that fee is shown separately and collected by the courier at delivery. If AJZIO pays delivery, the product price remains the customer-facing amount and the server applies the reseller-paid minimum selling-price rule.

The default displayed selling price is `suggestedPrice` (`AJZIO_PRICE_MULTIPLIER=1`). If Business Koro's minimum price for a product/route is higher than the configured selling price, the server refuses the order with a clear message instead of submitting an order that will be rejected. Adjust the multiplier deliberately only after checking your margin.

## Environment variables

Required:
- `BUSINESSKORO_API_KEY`
- `STOREFRONT_DOMAIN` — exact domain locked to the key; for the current production website use `ajziostore.vercel.app` (no `https://`, no trailing slash).

Optional:
- `AJZIO_PRICE_MULTIPLIER` (default `1`)
- `STORE_ANNOUNCEMENT`, `STORE_HERO_LINE_1`, `STORE_HERO_ACCENT`, `STORE_HERO_LINE_2`, `STORE_HERO_TEXT`
- `STORE_PHONE`, `STORE_WHATSAPP`, `STORE_EMAIL`, `STORE_ADDRESS`

Do not commit `.env.local`, supplier keys, or customer data.

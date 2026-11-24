# AJZIO Store

Luxury-style Next.js storefront designed for Vercel and Business Koro Storefront API.

## Included
- Luxury black, cream and gold responsive storefront
- Live product list from Business Koro through a server-side proxy
- Cart, checkout and order submission
- Order status lookup
- Business Koro API key kept server-side only

## Run locally
1. Install Node.js 18.17+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add your Business Koro API key to `BUSINESSKORO_API_KEY`.
5. Optional: set `BUSINESSKORO_DOMAIN` only if your Business Koro key has a domain restriction. Leave it blank otherwise.
6. Run `npm run dev` and open http://localhost:3000.

## Deploy to Vercel
1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New Project** and import the repository.
3. Add these Environment Variables in Project Settings:
   - `BUSINESSKORO_API_KEY` (required, private)
   - `BUSINESSKORO_DOMAIN` (optional; leave blank if not configured)
   - `BUSINESSKORO_BASE_URL` (optional; defaults to the documented API URL)
4. Deploy. If variables are changed later, redeploy.

## Important before launch
- Never put the API key in `NEXT_PUBLIC_*`, client components, source control, or browser code.
- The supplied API documentation shows a single `productId` per order. This starter therefore currently submits one product per order; multi-item cart checkout needs a confirmed multi-product API contract or separate order submissions.
- Checkout uses `suggestedPrice` as the initial selling price. Business Koro validates its minimum selling price and profitability rules. Set actual selling prices and test each delivery-payment mode before launch.
- `deliveryChargeCollectionMode` is not sent by default. Add it only if your business process collects delivery charges upfront from the customer.
- The product response contains `costPrice`; this app never displays it in the customer-facing storefront.
- Replace placeholder customer-care details and review your privacy, returns, delivery and terms pages before accepting real customers.
- Test a product order and order tracking with a low-risk test before announcing the store.

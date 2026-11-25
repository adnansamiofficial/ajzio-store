# AJZIO product detail pages

This update adds `/product/[id]` pages for individual Business Koro products.

- Product images gallery (all images provided by the supplier)
- Full description, price, stock status and available variants
- Add-to-setup action
- Cart setup is stored in localStorage so it survives navigation between the product page and homepage
- Product image, title and “Explore product” links open the individual page

No API key or environment file is included. The product detail server page uses the existing `getStoreProducts()` server helper and the existing Vercel environment variables.

Business Koro's order documentation says quantity is not accepted in the order payload, so the detail page intentionally does not expose a quantity selector. Existing one-product-per-supplier-order behavior is preserved.

'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Check, Headphones,
  RefreshCw, Search, ShieldCheck, ShoppingBag, Truck, X,
} from 'lucide-react';
import type { StoreProduct } from '@/lib/business-koro';

type CartLine = { product: StoreProduct; variant: string; price: number; key: string };
type ApiError = { error?: string; cloudflareBlocked?: boolean; ownerActionRequired?: boolean; rayId?: string };
type DeliveryLocation = 'inside' | 'outside';

const CART_STORAGE_KEY = 'ajzio-cart-v1';

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

function productCategory(product: StoreProduct) {
  const text = `${product.name} ${product.description || ''}`.toLowerCase();
  if (/earbud|headphone|speaker|audio|mic|microphone/.test(text)) return 'Audio';
  if (/watch|band|fitness|smart.?watch/.test(text)) return 'Wearables';
  if (/power|charger|cable|adapter|bank/.test(text)) return 'Power';
  if (/phone|mobile|tablet|stand|case/.test(text)) return 'Mobile';
  if (/game|gaming|controller/.test(text)) return 'Gaming';
  return 'Everyday tech';
}

function variantLabel(variant: NonNullable<StoreProduct['variants']>[number]) {
  return [variant.color, variant.size].filter(Boolean).join(' / ');
}

function LoadingCard() {
  return <div className="catalog-loading"><span className="loading-ring" /><b>Curating your collection...</b><small>Fetching the latest products</small></div>;
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [deliveryCharges, setDeliveryCharges] = useState<{ insideDhaka?: number; outsideDhaka?: number }>({});
  const [catalogStatus, setCatalogStatus] = useState('Connecting to the AJZIO catalogue...');
  const [catalogError, setCatalogError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CartLine | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>('inside');

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2800);
  }, []);

  const loadProducts = useCallback(async (force = false) => {
    setLoading(true);
    setCatalogError(null);
    setCatalogStatus('Connecting to the AJZIO catalogue...');
    try {
      const response = await fetch(force ? '/api/products?refresh=1' : '/api/products', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json() as { data?: StoreProduct[]; deliveryCharges?: typeof deliveryCharges } & ApiError;
      if (!response.ok) {
        setProducts([]);
        setCatalogError(payload);
        setCatalogStatus(payload.cloudflareBlocked ? 'Supplier access needs approval' : 'Could not load the catalogue');
        return;
      }
      const cleanProducts = Array.isArray(payload.data) ? payload.data.filter((item) => item && item.id && item.name) : [];
      setProducts(cleanProducts);
      setDeliveryCharges(payload.deliveryCharges || {});
      setCatalogStatus(cleanProducts.length ? `${cleanProducts.length} ${cleanProducts.length === 1 ? 'product' : 'products'} available` : 'Connected · no products returned');
    } catch (error) {
      setProducts([]);
      const message = error instanceof Error ? error.message : 'Could not connect to the AJZIO server.';
      setCatalogError({ error: message });
      setCatalogStatus('Could not load the catalogue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  // Keep the setup/cart available when a customer moves between product pages.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((line): line is CartLine => Boolean(
            line && typeof line === 'object' &&
            (line as CartLine).product && (line as CartLine).product.id &&
            typeof (line as CartLine).price === 'number' &&
            typeof (line as CartLine).key === 'string'
          )));
        }
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
    setCartReady(true);

    const params = new URLSearchParams(window.location.search);
    if (params.get('showCart') === '1') {
      setDrawerOpen(true);
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch { /* Storage may be unavailable; cart still works for this page view. */ }
  }, [cart, cartReady]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [products, loading]);

  useEffect(() => {
    document.body.classList.toggle('locked', drawerOpen || checkoutOpen);
    return () => document.body.classList.remove('locked');
  }, [drawerOpen, checkoutOpen]);

  const matchingProducts = useMemo(() => products.filter((product) => {
    const available = product.inStock !== false;
    const filterMatch = filter === 'all' || available;
    const searchText = `${product.name} ${product.description || ''} ${productCategory(product)}`.toLowerCase();
    return filterMatch && (!query.trim() || searchText.includes(query.toLowerCase().trim()));
  }), [products, query, filter]);

  const cartTotal = cart.reduce((sum, line) => sum + line.price, 0);
  const supplierBlocked = Boolean(catalogError?.cloudflareBlocked || catalogError?.ownerActionRequired);

  function addToCart(product: StoreProduct) {
    const variants = (product.variants || []).filter((variant) => variant.inStock !== false);
    const selectedVariant = selectedVariants[product.id] || (variants.length ? variantLabel(variants[0]) : '');
    const key = `${product.id}:${selectedVariant}`;
    setCart((current) => [...current, { product, variant: selectedVariant, price: Number(product.suggestedPrice || 0), key }]);
    showToast('Added to your setup');
  }

  function beginCheckout() {
    if (!cart.length) return;
    if (cart.length > 1) {
      showToast('Business Koro accepts one product per order. Remove the extras first.');
      return;
    }
    setSelectedProduct(cart[0]);
    setDrawerOpen(false);
    setCheckoutOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct || submitting) return;

    const minimum = Number(selectedProduct.product.minimumSellingPrice?.customerPaysDelivery || 0);
    if (selectedProduct.price <= 0) {
      showToast('This product has no valid selling price.');
      return;
    }
    if (minimum > 0 && selectedProduct.price < minimum) {
      showToast(`The listed price is below the supplier minimum of ${money(minimum)}.`);
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      productId: selectedProduct.product.id,
      customerName: String(form.get('customerName') || '').trim(),
      customerPhone: String(form.get('customerPhone') || '').trim(),
      customerAddress: String(form.get('customerAddress') || '').trim(),
      customerDivision: String(form.get('customerDivision') || '').trim(),
      customerDistrict: String(form.get('customerDistrict') || '').trim(),
      customerArea: String(form.get('customerArea') || '').trim(),
      sellingPrice: selectedProduct.price,
      deliveryChargePaidByCustomer: true,
      customerNote: String(form.get('customerNote') || '').trim(),
      ...(selectedProduct.variant ? { variant: selectedProduct.variant } : {}),
    };

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as Record<string, unknown> & ApiError;
      if (!response.ok) throw new Error(result.error || `Order was not accepted (HTTP ${response.status}).`);
      const nested = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {};
      const orderId = result.orderId || result.id || nested.orderId || nested.id;
      setCheckoutOpen(false);
      setCart([]);
      setSelectedProduct(null);
      formElement.reset();
      showToast(orderId ? `Order submitted · ${String(orderId)}` : 'Your order was submitted successfully.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Order could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDeliveryCharge = deliveryLocation === 'inside' ? deliveryCharges.insideDhaka : deliveryCharges.outsideDhaka;

  return (
    <>
      <div className="announcement-bar">
        <span className="announcement-mark" />
        <span>GOOD DESIGN. USEFUL TECHNOLOGY.</span>
        <span className="announcement-separator">·</span>
        <span>Delivery across Bangladesh</span>
        <a href="#shop">Discover AJZIO <span aria-hidden="true">↗</span></a>
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="AJZIO home"><img src="/brand-assets/ajzio-logo.svg" alt="AJZIO Store" /></a>
        <button className="mobile-menu" type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}><span /><span /></button>
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <a className="nav-link active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a className="nav-link" href="#shop" onClick={() => setMenuOpen(false)}>Collection</a>
          <a className="nav-link" href="#about" onClick={() => setMenuOpen(false)}>Our approach</a>
        </nav>
        <div className="header-actions">
          <button className="header-icon" type="button" aria-label="Search products" onClick={() => setSearchOpen((open) => !open)}><Search /></button>
          <button className="cart-trigger" type="button" aria-label="Open your setup" onClick={() => setDrawerOpen(true)}><ShoppingBag /><span>My setup</span><b>{cart.length}</b></button>
        </div>
      </header>

      {searchOpen && <div className="search-panel"><div className="search-inner"><Search /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audio, wearables, accessories..." aria-label="Search products" /><button type="button" onClick={() => { setSearchOpen(false); setQuery(''); }}>ESC <span>×</span></button></div></div>}

      <main id="home">
        <section className="hero-section">
          <div className="hero-grain" />
          <div className="hero-copy reveal">
            <div className="eyebrow"><span className="eyebrow-rule" /> A MORE CONSIDERED TECH STORE</div>
            <h1>Technology for<br /><em>the way you live.</em></h1>
            <p>Useful little upgrades. Thoughtful everyday essentials. A collection of gadgets chosen to make life feel simpler.</p>
            <div className="hero-actions"><a className="button button-primary" href="#shop">Explore the collection <span>↗</span></a><a className="quiet-link" href="#about">What makes us different <span>→</span></a></div>
            <div className="hero-note"><span className="note-number">01</span><span className="note-rule" /><span>Less clutter. Better choices.</span></div>
          </div>
          <div className="hero-art" aria-label="A selection of everyday technology">
            <div className="art-caption caption-top"><span>AJZIO / OBJECTS FOR EVERYDAY</span><i>EST. 2026</i></div>
            <div className="art-disc disc-back" /><div className="art-disc disc-front" />
            <div className="device device-a"><div className="device-a-top" /><div className="device-a-line" /><div className="device-a-light" /><span>01 / SOUND</span></div>
            <div className="device device-b"><div className="watch-face"><i /><b>10:08</b><small>MON · 24</small></div><div className="watch-band" /></div>
            <div className="device device-c"><div className="power-line" /><div className="power-dot" /><span>POWER / 02</span></div>
            <div className="art-caption caption-bottom"><span>SELECTED WITH PURPOSE</span><span className="caption-dash" /><b>AJZIO®</b></div>
          </div>
          <div className="hero-foot"><span>01 — 03</span><span>THE EVERYDAY EDIT</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>

        <section className="trust-strip" aria-label="Store features">
          <div className="trust-item"><span className="trust-icon"><Truck size={17} /></span><div><b>Nationwide delivery</b><small>Across Bangladesh</small></div></div>
          <div className="trust-item"><span className="trust-icon"><ShieldCheck size={17} /></span><div><b>Thoughtful selection</b><small>Useful over excessive</small></div></div>
          <div className="trust-item"><span className="trust-icon"><Check size={17} /></span><div><b>Direct ordering</b><small>Simple and convenient</small></div></div>
          <div className="trust-item"><span className="trust-icon"><Headphones size={17} /></span><div><b>Here to help</b><small>Support when needed</small></div></div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading reveal"><div><div className="section-kicker">THE AJZIO COLLECTION <span>— 01</span></div><h2>Good things,<br /><em>chosen well.</em></h2></div><p>Explore the latest gadgets and everyday accessories. No noise, just useful finds that earn their place in your routine.</p></div>
          <div className="catalog-toolbar"><div className="catalog-status-wrap"><span className={`status-indicator ${catalogError ? 'error' : ''}`} /><span>{catalogStatus}</span></div><div className="catalog-controls"><button className={`filter-button ${filter === 'all' ? 'active' : ''}`} type="button" onClick={() => setFilter('all')}>All products</button><button className={`filter-button ${filter === 'available' ? 'active' : ''}`} type="button" onClick={() => setFilter('available')}>Available</button><button className="refresh-button" type="button" title="Refresh products" disabled={loading || supplierBlocked} onClick={() => void loadProducts(true)}><RefreshCw size={14} className={loading ? 'spin-icon' : ''} /><span>{supplierBlocked ? 'Access blocked' : 'Refresh'}</span></button></div></div>
          {catalogError && <div className="catalog-message error" role="alert"><strong>{supplierBlocked ? 'Business Koro needs to allow this server integration.' : 'Product loading failed.'}</strong> {catalogError.error || 'The product catalogue could not be loaded.'} {catalogError.rayId ? <span>Cloudflare Ray ID: <code>{catalogError.rayId}</code>.</span> : null} {supplierBlocked ? 'Do not keep retrying. Contact Business Koro support and ask them to allow AJZIO-Store/1.0.' : 'Check your server environment variables and supplier response.'}</div>}
          {!catalogError && !loading && products.length === 0 && <div className="catalog-message" role="status"><strong>The catalogue is currently empty.</strong> Confirm that your Business Koro package has active products.</div>}
          <div className="products-grid" aria-live="polite">
            {loading ? <LoadingCard /> : matchingProducts.map((product, index) => {
              const variants = (product.variants || []).filter((variant) => variant.inStock !== false);
              const soldOut = product.inStock === false || (product.variants?.length && variants.length === 0);
              const selectedVariant = selectedVariants[product.id] || (variants.length ? variantLabel(variants[0]) : '');
              const image = product.images?.[0];
              return (
                <article className="product-card" key={product.id} style={{ '--delay': `${Math.min(index * 65, 390)}ms` } as CSSProperties}>
                  <Link href={`/product/${encodeURIComponent(product.id)}`} className="product-visual product-visual-link" aria-label={`View ${product.name} details`}>
                    {image ? <img src={image} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="product-fallback">A</span>}
                    <span className={`stock-pill ${soldOut ? 'out' : ''}`}>{soldOut ? 'SOLD OUT' : 'IN STOCK'}</span>
                    <span className="visual-view-label">VIEW DETAILS ↗</span>
                  </Link>
                  <div className="product-info">
                    <span className="product-category">{productCategory(product)}</span>
                    <h3><Link href={`/product/${encodeURIComponent(product.id)}`} className="product-title-link">{product.name}</Link></h3>
                    <p className="product-description">{product.description || 'A useful pick for your everyday setup.'}</p>
                    <Link href={`/product/${encodeURIComponent(product.id)}`} className="product-detail-link">Explore product <span>↗</span></Link>
                    {variants.length > 0 && <select className="variant-select" aria-label={`Choose option for ${product.name}`} value={selectedVariant} onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: event.target.value }))}>{variants.map((variant, i) => { const label = variantLabel(variant) || `Option ${i + 1}`; return <option key={`${product.id}-${i}`} value={label}>{label}</option>; })}</select>}
                    <div className="product-bottom"><strong className="product-price">{money(Number(product.suggestedPrice || 0))}</strong><button className="add-button" type="button" disabled={Boolean(soldOut)} onClick={() => addToCart(product)}>{soldOut ? 'Unavailable' : 'Add to setup +'}</button></div>
                  </div>
                </article>
              );
            })}
          </div>
          {!loading && !catalogError && matchingProducts.length === 0 && products.length > 0 && <div className="empty-state"><div className="empty-symbol">⌕</div><h3>Nothing found here.</h3><p>Try another search or take a look at the full collection.</p><button className="button button-secondary" type="button" onClick={() => { setQuery(''); setFilter('all'); }}>View all products</button></div>}
          {!loading && matchingProducts.length > 0 && <div className="catalog-footnote">Showing {matchingProducts.length} of {products.length} products <span>·</span> Updated from the AJZIO catalogue</div>}
        </section>

        <section className="about-section" id="about">
          <div className="about-art"><div className="about-grid" /><div className="about-orbit orbit-one" /><div className="about-orbit orbit-two" /><div className="about-mark">A<span>J</span></div><div className="about-art-label">THOUGHTFULLY<br />SELECTED / 2026</div></div>
          <div className="about-copy reveal"><div className="section-kicker">THE AJZIO APPROACH <span>— 02</span></div><h2>Keep what<br /><em>makes sense.</em></h2><p>Good technology should fit into your life, not complicate it. We bring practical gadgets and considered accessories together in one easy place, so choosing your next useful thing feels simple.</p><div className="about-values"><div><span>01</span><b>Purpose before hype</b></div><div><span>02</span><b>Simple shopping, clear details</b></div><div><span>03</span><b>Useful for everyday life</b></div></div><a className="quiet-link dark-link" href="#shop">Find something useful <span>↗</span></a></div>
        </section>

        <section className="closing-section"><div><div className="section-kicker">YOUR EVERYDAY, A LITTLE BETTER</div><h2>Find your next<br /><em>favourite thing.</em></h2></div><a href="#shop" className="closing-arrow" aria-label="Explore products">↗</a></section>
      </main>

      <footer className="site-footer"><a className="footer-brand" href="#home"><img src="/brand-assets/ajzio-logo.svg" alt="AJZIO Store" /></a><p>Considered tech for everyday life.</p><div className="footer-meta"><span>Bangladesh</span><span>© {new Date().getFullYear()} AJZIO Store</span></div></footer>

      {(drawerOpen || checkoutOpen) && <div className="screen-dimmer" onClick={() => { setDrawerOpen(false); setCheckoutOpen(false); }} />}
      {drawerOpen && <aside className="cart-drawer" aria-label="Your setup"><div className="drawer-heading"><div><small>YOUR EVERYDAY KIT</small><h3>My setup<span>.</span></h3></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close setup"><X /></button></div><div className="cart-items">{cart.length ? cart.map((line, index) => <div className="cart-item" key={`${line.key}-${index}`}>{line.product.images?.[0] ? <img src={line.product.images[0]} alt="" /> : <span className="product-fallback">A</span>}<div><h4>{line.product.name}</h4><small>{line.variant ? `${line.variant} · ` : ''}{money(line.price)}</small></div><button type="button" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${line.product.name}`}>×</button></div>) : <div className="cart-empty">Your setup is waiting for a good find.</div>}</div><div className="drawer-footer"><div className="cart-total"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><button className="button button-primary full-button" type="button" disabled={!cart.length} onClick={beginCheckout}>Proceed to checkout <span>↗</span></button><small>{cart.length > 1 ? 'The supplier accepts one product per order. Remove extras to continue.' : 'Delivery details are confirmed before your order is placed.'}</small></div></aside>}

      {checkoutOpen && selectedProduct && <section className="checkout-modal" aria-label="Checkout form"><div className="checkout-heading"><div><small>SECURE ORDER REQUEST</small><h3>Where should it go<span>?</span></h3></div><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X /></button></div><form onSubmit={submitOrder}>
        <div className="checkout-product">{selectedProduct.product.images?.[0] ? <img src={selectedProduct.product.images[0]} alt="" /> : null}<div><strong>{selectedProduct.product.name}</strong><small>{selectedProduct.variant ? `${selectedProduct.variant} · ` : ''}{money(selectedProduct.price)}</small></div></div>
        <div className="form-grid">
          <label>Full name<input name="customerName" required autoComplete="name" placeholder="Your name" /></label>
          <label>Phone number<input name="customerPhone" required autoComplete="tel" placeholder="01XXXXXXXXX" /></label>
          <label>Division<input name="customerDivision" required placeholder="Division" /></label>
          <label>District<input name="customerDistrict" required placeholder="District" /></label>
          <label>Area / Thana<input name="customerArea" required placeholder="Area" /></label>
          <label>Delivery location<select name="deliveryLocation" required value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value as DeliveryLocation)}><option value="inside">Inside Dhaka</option><option value="outside">Outside Dhaka</option></select></label>
          <label className="wide-field">Full address<textarea name="customerAddress" required placeholder="House, road, landmark..." /></label>
          <label className="wide-field">Order note <span>(optional)</span><textarea name="customerNote" placeholder="Anything we should know?" /></label>
        </div>
        <div className="checkout-summary">Product total: {money(selectedProduct.price)} · Delivery charge: {selectedDeliveryCharge ? `${money(selectedDeliveryCharge)} (paid by customer at delivery)` : 'confirmed by supplier'}.</div>
        <button className="button button-primary full-button" type="submit" id="submitOrder" disabled={submitting}>{submitting ? 'Sending order...' : <>Confirm my order <span>↗</span></>}</button>
        <p className="form-privacy">Your details are sent securely to Business Koro through AJZIO's server.</p>
      </form></section>}

      <div className={`toast-message ${toastMessage ? 'show' : ''}`} role="status">{toastMessage}</div>
    </>
  );
}

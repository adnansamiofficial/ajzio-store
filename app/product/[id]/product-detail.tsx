'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { StoreProduct } from '@/lib/business-koro';

type CartLine = { product: StoreProduct; variant: string; price: number; key: string };
const CART_STORAGE_KEY = 'ajzio-cart-v1';
const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const variantLabel = (variant: NonNullable<StoreProduct['variants']>[number]) => [variant.color, variant.size].filter(Boolean).join(' / ');

export default function ProductDetail({ product }: { product: StoreProduct }) {
  const router = useRouter();
  const images = useMemo(() => (product.images || []).filter(Boolean), [product.images]);
  const availableVariants = (product.variants || []).filter((variant) => variant.inStock !== false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(() => availableVariants.length ? variantLabel(availableVariants[0]) : '');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const soldOut = product.inStock === false || (Boolean(product.variants?.length) && availableVariants.length === 0);
  const price = Number(product.suggestedPrice || 0);
  // The checkout form submits with delivery paid by the customer, so validate against that minimum.
  const minimumPrice = Number(product.minimumSellingPrice?.customerPaysDelivery || 0);
  const belowMinimum = minimumPrice > 0 && price < minimumPrice;
  const activePhoto = images[activeImage];

  function checkoutNow() {
    if (soldOut || !price || belowMinimum || checkoutPending) return;
    const key = `${product.id}:${selectedVariant}`;
    const line: CartLine = { product, variant: selectedVariant, price, key };
    try {
      // Business Koro currently accepts one product per order. Start checkout with this product only.
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([line]));
    } catch {
      // The checkout page can still be opened; the customer can retry if browser storage is disabled.
    }
    setCheckoutPending(true);
    router.push('/?checkout=1');
  }

  return (
    <main className="product-detail-page">
      <div className="product-detail-topline">
        <Link href="/#shop" className="detail-back-link"><ArrowLeft size={15} /> Back to collection</Link>
        <span>AJZIO <i>/</i> OBJECT DETAILS</span>
      </div>

      <div className="product-detail-layout">
        <section className="detail-gallery" aria-label="Product images">
          <div className="detail-main-image">
            {activePhoto ? (
              <img key={activePhoto} src={activePhoto} alt={product.name} />
            ) : (
              <div className="detail-image-placeholder"><span>AJZIO</span><small>PRODUCT IMAGE</small></div>
            )}
            <span className={`detail-stock ${soldOut ? 'is-out' : ''}`}>
              <i />{soldOut ? 'OUT OF STOCK' : 'READY TO ORDER'}
            </span>
            <span className="detail-image-index">{String(activeImage + 1).padStart(2, '0')} <i>/</i> {String(Math.max(images.length, 1)).padStart(2, '0')}</span>
            {images.length > 1 && (
              <div className="gallery-arrows">
                <button type="button" aria-label="Previous image" onClick={() => setActiveImage((value) => (value - 1 + images.length) % images.length)}><ChevronLeft size={19} /></button>
                <button type="button" aria-label="Next image" onClick={() => setActiveImage((value) => (value + 1) % images.length)}><ChevronRight size={19} /></button>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="detail-thumbnails" aria-label="Choose product image">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" className={activeImage === index ? 'active' : ''} aria-label={`Show product image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="detail-gallery-note"><span>AJZIO SELECTED</span><span>USEFUL TECH, CHOSEN WITH CARE</span></div>
        </section>

        <section className="detail-information">
          <div className="detail-eyebrow-row">
            <span className="product-detail-kicker">THE EVERYDAY EDIT / 2026</span>
            <span className="detail-product-id">REF. {product.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="detail-price-row">
            <strong>{money(price)}</strong>
            <span>Including product price</span>
          </div>
          <div className="detail-stock-line"><span className={soldOut ? 'is-unavailable' : ''}><i />{soldOut ? 'Currently unavailable' : 'Available to order'}</span><span>Bangladesh delivery</span></div>

          {product.variants && product.variants.length > 0 && (
            <div className="detail-option-block">
              <label className="detail-label" htmlFor="product-variant">CHOOSE YOUR OPTION</label>
              <select id="product-variant" value={selectedVariant} disabled={!availableVariants.length} onChange={(event) => setSelectedVariant(event.target.value)}>
                {availableVariants.map((variant, index) => {
                  const label = variantLabel(variant) || `Option ${index + 1}`;
                  return <option key={`${label}-${index}`} value={label}>{label}</option>;
                })}
              </select>
            </div>
          )}

          <div className="detail-primary-action">
            <button type="button" className="detail-checkout-button" onClick={checkoutNow} disabled={soldOut || !price || belowMinimum || checkoutPending}>
              {soldOut ? 'Currently unavailable' : belowMinimum ? 'Price needs review' : <>{checkoutPending ? 'Opening checkout…' : 'Checkout now'} <ArrowUpRight size={17} /></>}
            </button>
            <p><LockKeyhole size={13} /> Secure checkout · Review your details before confirming</p>
          </div>
          {belowMinimum && <p className="detail-price-note">This listed price is below the supplier&apos;s minimum selling price of {money(minimumPrice)}. Please contact the store before ordering.</p>}

          <div className="detail-benefit-strip">
            <div><Truck size={17} /><span><b>Nationwide delivery</b><small>Inside and outside Dhaka</small></span></div>
            <div><ShieldCheck size={17} /><span><b>Order protection</b><small>Secure supplier submission</small></span></div>
          </div>

          <section className="detail-description-card">
            <div className="detail-section-heading"><span>01</span><div><small>GET TO KNOW IT</small><h2>Product overview</h2></div></div>
            <p className="detail-description">{product.description?.trim() || 'A useful pick for your everyday setup. Product information will be updated when more details are available.'}</p>
          </section>

          <section className="detail-spec-card" aria-label="Product information">
            <div><span>AVAILABILITY</span><b>{soldOut ? 'Out of stock' : 'In stock'}</b></div>
            <div><span>DELIVERY AREA</span><b>All over Bangladesh</b></div>
            <div><span>PRODUCT REFERENCE</span><b>{product.id}</b></div>
          </section>
          <Link className="detail-continue-link" href="/#shop">Continue exploring the collection <span>→</span></Link>
        </section>
      </div>

      <div className="detail-mobile-checkout" aria-label="Quick checkout">
        <div><small>YOUR PRICE</small><strong>{money(price)}</strong></div>
        <button type="button" onClick={checkoutNow} disabled={soldOut || !price || belowMinimum || checkoutPending}>
          {soldOut ? 'Unavailable' : belowMinimum ? 'Price review' : 'Checkout'} <ArrowUpRight size={16} />
        </button>
      </div>
    </main>
  );
}

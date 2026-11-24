'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
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
  const [added, setAdded] = useState(false);
  const soldOut = product.inStock === false || (Boolean(product.variants?.length) && availableVariants.length === 0);
  const minimumPrice = Number(product.minimumSellingPrice?.customerPaysDelivery || 0);
  const belowMinimum = minimumPrice > 0 && Number(product.suggestedPrice || 0) < minimumPrice;

  function addToSetup() {
    if (soldOut || !Number(product.suggestedPrice || 0)) return;
    const key = `${product.id}:${selectedVariant}`;
    const line: CartLine = { product, variant: selectedVariant, price: Number(product.suggestedPrice || 0), key };
    let current: CartLine[] = [];
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) current = parsed as CartLine[];
    } catch { current = []; }
    current.push(line);
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(current)); } catch { /* Continue to the store; cart will remain page-local if storage is blocked. */ }
    setAdded(true);
    router.push('/?showCart=1');
  }

  const activePhoto = images[activeImage];

  return (
    <main className="product-detail-page">
      <div className="product-detail-topline">
        <Link href="/#shop" className="detail-back-link"><ArrowLeft size={15} /> Back to collection</Link>
        <span>AJZIO / PRODUCT DETAILS</span>
      </div>

      <div className="product-detail-layout">
        <section className="detail-gallery" aria-label="Product images">
          <div className="detail-main-image">
            {activePhoto ? <img src={activePhoto} alt={product.name} /> : <div className="detail-image-placeholder"><span>AJZIO</span><small>PRODUCT IMAGE</small></div>}
            <span className={`detail-stock ${soldOut ? 'is-out' : ''}`}>{soldOut ? 'OUT OF STOCK' : 'AVAILABLE'}</span>
            {images.length > 1 && <div className="gallery-arrows"><button type="button" aria-label="Previous image" onClick={() => setActiveImage((value) => (value - 1 + images.length) % images.length)}><ChevronLeft size={19} /></button><button type="button" aria-label="Next image" onClick={() => setActiveImage((value) => (value + 1) % images.length)}><ChevronRight size={19} /></button></div>}
          </div>
          {images.length > 1 && <div className="detail-thumbnails">{images.map((image, index) => <button key={`${image}-${index}`} type="button" className={activeImage === index ? 'active' : ''} aria-label={`Show product image ${index + 1}`} onClick={() => setActiveImage(index)}><img src={image} alt="" /></button>)}</div>}
          <div className="detail-assurances"><div><Truck size={17} /><span>Delivery across Bangladesh</span></div><div><ShieldCheck size={17} /><span>Secure order submission</span></div></div>
        </section>

        <section className="detail-information">
          <span className="product-detail-kicker">AJZIO SELECTED / EVERYDAY TECH</span>
          <h1>{product.name}</h1>
          <div className="detail-price-row"><strong>{money(Number(product.suggestedPrice || 0))}</strong><span>Price shown in BDT</span></div>
          <div className="detail-divider" />
          <div className="detail-description-block"><span className="detail-label">ABOUT THIS PRODUCT</span><p className="detail-description">{product.description?.trim() || 'A useful pick for your everyday setup. Product information will be updated when more details are available.'}</p></div>

          {product.variants && product.variants.length > 0 && <div className="detail-option-block"><label className="detail-label" htmlFor="product-variant">SELECT OPTION</label><select id="product-variant" value={selectedVariant} disabled={!availableVariants.length} onChange={(event) => setSelectedVariant(event.target.value)}>{availableVariants.map((variant, index) => { const label = variantLabel(variant) || `Option ${index + 1}`; return <option key={`${label}-${index}`} value={label}>{label}</option>; })}</select></div>}

          <div className="detail-purchase-row"><span className="detail-purchase-caption">One product per supplier order</span><span className="detail-subtotal">Price <b>{money(Number(product.suggestedPrice || 0))}</b></span></div>

          <button type="button" className="detail-add-button" onClick={addToSetup} disabled={soldOut || !Number(product.suggestedPrice || 0) || belowMinimum}>
            {soldOut ? 'Currently unavailable' : belowMinimum ? 'Price needs review' : <><ShoppingBag size={17} /> {added ? 'Added — opening your setup' : 'Add to setup'} <span>↗</span></>}
          </button>
          {belowMinimum && <p className="detail-price-note">This listed price is below the supplier&apos;s minimum selling price. Please contact the store before ordering.</p>}
          <p className="detail-order-note"><Check size={14} /> You can review your selection before submitting an order.</p>

          <div className="detail-spec-list"><div><span>PRODUCT ID</span><b>{product.id}</b></div><div><span>AVAILABILITY</span><b>{soldOut ? 'Out of stock' : 'In stock'}</b></div><div><span>DELIVERY</span><b>Inside and outside Dhaka</b></div></div>
          <Link className="detail-continue-link" href="/#shop">Continue exploring the collection <span>→</span></Link>
        </section>
      </div>
    </main>
  );
}

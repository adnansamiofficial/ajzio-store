import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreProducts } from '@/lib/business-koro';
import ProductDetail from './product-detail';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ProductPageProps = { params: { id: string } };

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const catalog = await getStoreProducts();
    const product = catalog.data.find((item) => item.id === params.id);
    if (!product) notFound();
    return <ProductDetail product={product} />;
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return (
      <main className="product-error-page">
        <div className="product-error-card">
          <span className="product-detail-kicker">AJZIO / CATALOGUE</span>
          <h1>We couldn&apos;t load this product.</h1>
          <p>{error instanceof Error ? error.message : 'The product catalogue is temporarily unavailable.'}</p>
          <Link className="button button-primary" href="/#shop">Back to the collection <span>↗</span></Link>
        </div>
      </main>
    );
  }
}

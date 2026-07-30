import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

export default function StudioProductsPage() {
  const products = getApprovedMerchProducts();
  return (
    <>
      <header className="studio-page-header">
        <div>
          <p>Approved provider catalog</p>
          <h1>Products</h1>
        </div>
      </header>
      <section className="studio-card-grid">
        {products.map((product) => (
          <article className="studio-card" key={product.id}>
            <span>
              Blueprint {product.printifyBlueprintId} · Provider{' '}
              {product.provider.printifyProviderId}
            </span>
            <strong>{product.name}</strong>
            <p>{product.description}</p>
          </article>
        ))}
      </section>
    </>
  );
}

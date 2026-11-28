import { ProductCardSkeleton } from "@/components/commerce/ProductCard";

export function ListingSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[15.5rem_1fr] lg:gap-12" aria-busy="true">
      <div className="hidden flex-col gap-4 lg:flex">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-6" style={{ width: `${60 + ((i * 17) % 40)}%` }} />)}
      </div>
      <div>
        <div className="skeleton mb-6 h-9 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

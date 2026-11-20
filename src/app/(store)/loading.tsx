export default function Loading() {
  return (
    <div className="container-x py-10" aria-busy="true">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-6 h-14 w-2/3 max-w-xl" />
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

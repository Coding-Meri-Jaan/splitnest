export default function DashboardLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-16 w-full max-w-md sn-skeleton rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="h-80 sn-skeleton rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="h-28 sn-skeleton rounded-2xl" />
          <div className="h-44 sn-skeleton rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl lg:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
    </div>
  );
}

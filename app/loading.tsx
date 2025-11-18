export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 bg-gray-200 rounded" />
          <div className="h-28 bg-gray-200 rounded" />
          <div className="h-28 bg-gray-200 rounded" />
        </div>
        <div className="h-96 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="font-heading text-4xl font-black text-[#242f41]">Page not found</h1>
        <p className="text-sm text-[#515c70]">The route you requested does not exist in the new Next.js app structure.</p>
        <Link href="/" className="inline-flex rounded-xl bg-[#4a40e0] px-5 py-3 text-sm font-bold text-white">
          Go home
        </Link>
      </div>
    </div>
  )
}
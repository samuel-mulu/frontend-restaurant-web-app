"use client"

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <h1 className="text-lg font-semibold text-gray-900">Restaurant Management</h1>
      </div>
    </header>
  )
}


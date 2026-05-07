'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Početna' },
  { href: '/standings', label: 'Ljestvica' },
  { href: '/players', label: 'Igrači' },
  { href: '/matches', label: 'Utakmice' },
  { href: '/playoff', label: 'Playoff' },
  { href: '/seasons', label: 'Sezone' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl text-primary">
            KL Šibenik
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === l.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <Link
            href="/admin"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </Link>
        </div>
        {/* Mobile nav */}
        <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                pathname === l.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Pregled', exact: true },
  { href: '/admin/seasons', label: 'Sezone' },
  { href: '/admin/teams', label: 'Ekipe' },
  { href: '/admin/players', label: 'Igrači' },
  { href: '/admin/rounds', label: 'Kola' },
  { href: '/admin/matches', label: 'Utakmice' },
  { href: '/admin/playoff', label: 'Playoff' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-bold text-sm mr-3 text-primary shrink-0">Admin</span>
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  (l.exact ? pathname === l.href : pathname.startsWith(l.href))
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              Javni dio
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Odjava
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

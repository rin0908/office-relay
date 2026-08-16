import Link from 'next/link'
import { signOutAction } from '@/app/actions/auth'
import { OrgTypeBadge } from '@/components/badges'
import type { Organization } from '@/lib/session'

const LINKS = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/items', label: '提供資産' },
  { href: '/needs', label: 'ニーズ' },
  { href: '/services', label: 'サービス交換' },
  { href: '/matches', label: 'マッチ' },
  { href: '/transfers', label: '受け渡し' },
  { href: '/connector-factory', label: 'Connector Factory' },
]

export function AppNav({ org, email }: { org: Organization; email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-base font-black tracking-tight text-relay-700">
            OFFICE RELAY
          </Link>
          <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{org.name}</span>
          <OrgTypeBadge orgType={org.org_type} />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">{email}</span>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
              サインアウト
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-2 sm:px-6">
        <ul className="flex min-w-max items-center gap-1 pb-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-relay-50 hover:text-relay-700"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

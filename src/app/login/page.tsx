import Link from 'next/link'
import { AuthForm } from './auth-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; redirect?: string }>
}) {
  const params = await searchParams
  const mode = params.mode === 'signup' ? 'signup' : 'signin'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="text-lg font-black tracking-tight text-relay-700">
        OFFICE RELAY
      </Link>
      <div className="card mt-6 w-full max-w-md p-6">
        <AuthForm mode={mode} redirectTo={params.redirect ?? '/dashboard'} />
      </div>
      <p className="mt-6 max-w-md text-xs leading-5 text-slate-500">
        デモ用アカウント（シード投入済みの場合）: <br />
        提供企業 <code className="font-mono">donor@office-relay.demo</code> / スタートアップ{' '}
        <code className="font-mono">startup@office-relay.demo</code> — パスワードはいずれも{' '}
        <code className="font-mono">OfficeRelay!2026</code>
      </p>
    </main>
  )
}

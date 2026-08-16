import { redirect } from 'next/navigation'
import { AREAS } from '@/lib/areas'
import { getSessionContext, getUser } from '@/lib/session'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const user = await getUser()
  if (!user) redirect('/login?redirect=/onboarding')

  const context = await getSessionContext()
  if (context) redirect('/dashboard')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">組織情報の登録</h1>
      <p className="mt-2 text-sm text-slate-600">
        OFFICE RELAY は組織単位で資産をリレーします。所属する企業・団体を登録してください。
        公開エリアは他社に表示されます。正確な住所は資産ごとに登録し、マッチ成立後のみ相手に開示されます。
      </p>
      <div className="card mt-6 p-6">
        <OnboardingForm areas={AREAS} defaultEmail={user.email ?? ''} />
      </div>
    </main>
  )
}

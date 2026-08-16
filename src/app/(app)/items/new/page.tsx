import Link from 'next/link'
import { AREAS, findArea } from '@/lib/areas'
import { CATEGORIES, CONDITIONS } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { ItemForm } from './item-form'

export default async function NewItemPage() {
  const { org } = await requireSessionContext()
  const defaultArea = findArea(org.public_location)

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/items" className="text-sm font-semibold text-relay-600 hover:underline">
        ← 提供資産一覧
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">余剰資産を登録</h1>
      <p className="mt-1 text-sm text-slate-600">
        入力内容から意味ベクトル（pgvector）を生成し、スタートアップのニーズと自動マッチングします。
        写真は登録後にアップロードします。
      </p>

      <div className="card mt-6 p-6">
        <ItemForm
          orgId={org.id}
          areas={AREAS}
          defaultAreaValue={defaultArea?.value ?? ''}
          categories={CATEGORIES.map((c) => ({ ...c }))}
          conditions={CONDITIONS.map((c) => ({ ...c }))}
        />
      </div>
    </div>
  )
}

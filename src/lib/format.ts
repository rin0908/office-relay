const TZ = 'Asia/Tokyo'

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '未設定'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '未設定'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

/** "あと約12時間" / "期限切れ" */
export function formatDeadline(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '期限なし'
  const diffMs = new Date(value).getTime() - now.getTime()
  if (diffMs <= 0) return '期限切れ'
  const hours = Math.round(diffMs / 3_600_000)
  if (hours < 48) return `あと約${hours}時間`
  return `あと約${Math.round(hours / 24)}日`
}

/** datetime-local input value in Asia/Tokyo */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
  return parts.replace(' ', 'T')
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  available: '公開中',
  reserved: '受け渡し確定',
  transferred: '受け渡し完了',
  archived: '取り下げ',
}

export const NEED_STATUS_LABEL: Record<string, string> = {
  open: '募集中',
  fulfilled: 'マッチ成立',
  closed: '終了',
}

export const MATCH_STATUS_LABEL: Record<string, string> = {
  proposed: 'マッチ提案',
  pending_donor: '提供企業の承認待ち',
  accepted: 'マッチ成立',
  rejected: '見送り',
}

export const TRANSFER_STATUS_LABEL: Record<string, string> = {
  scheduled: '受け渡し予定',
  in_progress: '受け渡し中',
  completed: '完了',
  cancelled: 'キャンセル',
}

export const CONNECTOR_JOB_STATUS_LABEL: Record<string, string> = {
  queued: '待機中',
  analyzing: '解析中',
  building: '実装中',
  testing: 'テスト中',
  pr_created: 'PR作成済み',
  failed: '失敗',
}

export const CATEGORIES = [
  { value: 'desk', label: 'デスク' },
  { value: 'chair', label: 'チェア' },
  { value: 'monitor', label: 'モニター / ディスプレイ' },
  { value: 'it_device', label: 'PC / IT機器' },
  { value: 'meeting_room', label: '会議室備品' },
  { value: 'appliance', label: '家電' },
  { value: 'storage', label: '収納 / キャビネット' },
  { value: 'other', label: 'その他' },
] as const

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export const CONDITIONS = [
  { value: 'like_new', label: 'ほぼ新品' },
  { value: 'good', label: '良好' },
  { value: 'used', label: '使用感あり' },
] as const

export function conditionLabel(value: string): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value
}

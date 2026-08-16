import {
  ITEM_STATUS_LABEL,
  MATCH_STATUS_LABEL,
  NEED_STATUS_LABEL,
  TRANSFER_STATUS_LABEL,
} from '@/lib/format'

const TONE: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-relay-100 text-relay-700',
  success: 'bg-accent-100 text-accent-500',
  warn: 'bg-warn-100 text-warn-500',
  danger: 'bg-danger-100 text-danger-500',
}

function Badge({ tone, children }: { tone: keyof typeof TONE | string; children: React.ReactNode }) {
  return <span className={`badge ${TONE[tone] ?? TONE.neutral}`}>{children}</span>
}

export function ItemStatusBadge({ status }: { status: string }) {
  const tone = status === 'available' ? 'info' : status === 'reserved' ? 'warn' : 'neutral'
  return <Badge tone={tone}>{ITEM_STATUS_LABEL[status] ?? status}</Badge>
}

export function NeedStatusBadge({ status }: { status: string }) {
  const tone = status === 'open' ? 'info' : status === 'fulfilled' ? 'success' : 'neutral'
  return <Badge tone={tone}>{NEED_STATUS_LABEL[status] ?? status}</Badge>
}

export function MatchStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'accepted'
      ? 'success'
      : status === 'pending_donor'
        ? 'warn'
        : status === 'rejected'
          ? 'danger'
          : 'info'
  return <Badge tone={tone}>{MATCH_STATUS_LABEL[status] ?? status}</Badge>
}

export function TransferStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'success'
      : status === 'cancelled'
        ? 'danger'
        : status === 'in_progress'
          ? 'warn'
          : 'info'
  return <Badge tone={tone}>{TRANSFER_STATUS_LABEL[status] ?? status}</Badge>
}

export function OrgTypeBadge({ orgType }: { orgType: string }) {
  return (
    <Badge tone={orgType === 'donor' ? 'info' : 'success'}>
      {orgType === 'donor' ? '提供企業（DONOR）' : 'スタートアップ（STARTUP）'}
    </Badge>
  )
}

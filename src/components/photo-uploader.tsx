'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerItemMediaAction } from '@/app/actions/items'
import { buildStoragePath, ITEM_IMAGES_BUCKET, MAX_PHOTOS } from '@/lib/media'
import { compressImage } from '@/lib/photo-compression'
import { createClient } from '@/lib/supabase/client'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

interface Selected {
  file: File
  previewUrl: string
  originalSize: number
  compressed: boolean
}

/**
 * Photo flow: select -> preview -> upload to Supabase Storage
 * ({organization_id}/{item_id}/{filename}) -> persist item_media rows.
 * Uploads happen from the browser with the user's session, so the Storage
 * policies (organization folder ownership) are actually exercised.
 */
export function PhotoUploader({
  orgId,
  itemId,
  existingCount,
  doneHref,
}: {
  orgId: string
  itemId: string
  existingCount: number
  doneHref?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Selected[]>([])
  const [error, setError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const remaining = MAX_PHOTOS - existingCount - selected.length

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const accepted: Selected[] = []
    for (const file of files) {
      if (accepted.length >= remaining) {
        setError(`写真は最大${MAX_PHOTOS}枚までです。`)
        break
      }
      if (!ACCEPTED.includes(file.type)) {
        setError('JPEG / PNG / WebP / HEIC 形式の画像を選択してください。')
        continue
      }
      if (file.size > MAX_BYTES) {
        setError('1ファイル10MBまでにしてください。')
        continue
      }
      accepted.push({ file, previewUrl: '', originalSize: file.size, compressed: false })
    }
    if (inputRef.current) inputRef.current.value = ''

    if (accepted.length === 0) return
    setCompressing(true)
    setProgress(`${accepted.length}枚の画像を圧縮中…`)
    const compressed = await Promise.all(
      accepted.map(async (entry) => {
        const result = await compressImage(entry.file)
        return {
          file: result.file,
          previewUrl: URL.createObjectURL(result.file),
          originalSize: result.originalSize,
          compressed: result.compressed,
        }
      }),
    )
    setSelected((prev) => [...prev, ...compressed])
    setCompressing(false)
    setProgress(null)
  }

  function removeSelected(index: number) {
    setSelected((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function upload() {
    if (selected.length === 0) return
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const uploadedPaths: string[] = []

    try {
      for (const [index, entry] of selected.entries()) {
        setProgress(`${index + 1} / ${selected.length} 枚をアップロード中…`)
        const path = buildStoragePath(orgId, itemId, entry.file.name)
        const { error: uploadError } = await supabase.storage
          .from(ITEM_IMAGES_BUCKET)
          .upload(path, entry.file, { contentType: entry.file.type, upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        uploadedPaths.push(path)
      }

      const result = await registerItemMediaAction(itemId, uploadedPaths)
      if (result.error) throw new Error(result.error)

      selected.forEach((entry) => URL.revokeObjectURL(entry.previewUrl))
      setSelected([])
      setProgress(null)
      router.refresh()
      if (doneHref) router.push(doneHref)
    } catch (uploadError) {
      setError(`アップロードに失敗しました：${(uploadError as Error).message}`)
      setProgress(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="photos">
          写真（最大{MAX_PHOTOS}枚 / 1枚10MBまで・自動圧縮）
        </label>
        <input
          ref={inputRef}
          id="photos"
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          disabled={remaining <= 0 || compressing || uploading}
          onChange={handleSelect}
          className="input file:mr-3 file:rounded-md file:border-0 file:bg-relay-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-relay-700"
        />
        <p className="hint">
          残り{Math.max(0, remaining)}枚追加できます。アップロード前に1600px以内のJPEGへ自動圧縮します。
        </p>
      </div>

      {selected.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3">
          {selected.map((entry, index) => (
            <li key={entry.previewUrl} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.previewUrl}
                alt={`プレビュー ${index + 1}`}
                className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
              />
              <p className="mt-1 text-xs text-slate-500">
                {entry.compressed
                  ? `${formatFileSize(entry.originalSize)} → ${formatFileSize(entry.file.size)} に圧縮`
                  : `${formatFileSize(entry.file.size)}（圧縮なし）`}
              </p>
              <button
                type="button"
                onClick={() => removeSelected(index)}
                disabled={uploading}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-danger-500 shadow"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {error}
        </p>
      ) : null}
      {progress ? <p className="text-sm text-slate-600">{progress}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={upload}
          disabled={selected.length === 0 || compressing || uploading}
          className="btn-primary"
        >
          {compressing ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              画像を圧縮中…
            </>
          ) : uploading ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              アップロード中…
            </>
          ) : (
            'Supabase Storage にアップロード'
          )}
        </button>
        {doneHref ? (
          <button
            type="button"
            onClick={() => router.push(doneHref)}
            disabled={uploading}
            className="btn-secondary"
          >
            あとで追加する
          </button>
        ) : null}
      </div>
    </div>
  )
}

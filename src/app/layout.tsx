import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OFFICE RELAY｜企業の余剰オフィス資産をスタートアップへ',
  description:
    'OFFICE RELAY は、企業で不要になったがまだ使えるオフィス資産を、必要とするスタートアップへつなぐ B2B サーキュラー・リソース・リレー・プラットフォームです。資産・ニーズ・サービス交換・距離・引き取り期限を組み合わせてマッチングします。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}

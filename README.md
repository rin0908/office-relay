# OFFICE RELAY

企業の余剰オフィス資産と、資産を必要とするスタートアップをつなぐ
B2B Circular Resource Relay Platformです。

```text
Create Asset → Create Need → Match → Accept → Transfer
```

## 技術構成

- Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- Supabase Auth, Postgres, Storage, Realtime
- pgvectorによる資産・サービスの意味検索
- PostGISによる距離スコア
- RLSによる組織境界と非公開引き取り先情報の保護
- Edge Functions: `embed`, `connector-factory`

## ローカル起動

Node.js 20.19+ と Docker が必要です。

```bash
npm install
supabase start
supabase db reset
supabase functions serve --no-verify-jwt
npm run dev
```

## デモデータと写真

添付デモ写真を `demo-photos/` に置き、publishable keyだけでAuth/RLSを通る
デモseedを実行できます。seedは非公開Storageへ実際に写真をアップロードします。

```bash
cp /path/to/office_relay_demo_photos/*.jpg demo-photos/
npm run seed
```

## 検証

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## セキュリティ

- `service_role`、secret key、Database Passwordは使用しません。
- `item-images`はprivate bucketです。画像はRLS認可済みsigned URL経由で表示します。
- 正確な引き取り住所は公開アイテム情報と別テーブルに保存します。
- 双方承認後、DB triggerがTransferを自動生成します。

## Hosted Supabase / Vercel

Hosted Supabaseへのmigration適用にはSupabase CLI Personal Access Token、
Vercel公開にはVercel Tokenが必要です。Database Password、secret key、
service_role keyは入力しないでください。

## 既知の制約

- Connector Factoryは`DEVIN_API_KEY`をEdge Function secretに設定した場合のみ実接続します。
- embedding functionが利用できない場合は日本語lexical fallbackを使います。

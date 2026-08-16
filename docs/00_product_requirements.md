# Product Requirements

## Goal

余剰資産、必要資産、相互サービス、場所、期限を一つのマッチング体験に統合する。

## Golden Path

1. Donor creates an asset and uploads up to three photos.
2. Startup creates a need and service offer.
3. Matching engine ranks candidates using five explainable dimensions.
4. Startup accepts first; donor accepts second.
5. A database trigger creates a transfer and reserves the item.

## Security requirements

Japanese-first UI, responsive layout, private exact addresses, RLS on every
application table, private Storage, Realtime updates, graceful embedding fallback,
and no use of database/service-role secrets in the web application.

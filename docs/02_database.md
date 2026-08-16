# Database, RLS, Storage, Realtime

Migrations create organizations, members, items, private item details, media,
needs, services, matches, transfers, and connector jobs. `items.location` and
`needs.location` are PostGIS geography points; embeddings use 384-dimensional
`gte-small`.

Every application table has RLS enabled. `is_org_member` enforces organization
ownership. Exact pickup details are readable by the owner and by the recipient
only after both acceptance timestamps exist.

The `item-images` bucket is private. Paths start with
`{organization_id}/{item_id}/`; Storage policies enforce membership on that
first path segment. Pages create short-lived signed URLs.

Realtime publication includes matches, transfers, items, needs, and connector
jobs. `RealtimeRefresher` refreshes routes after Postgres events.

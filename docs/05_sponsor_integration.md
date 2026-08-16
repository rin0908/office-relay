# Sponsor / Supplier Integration

Connector Factory accepts a supplier name, CSV/API kind, and sample data. It
creates a `connector_jobs` row and invokes the Edge Function. With
`DEVIN_API_KEY` configured, the function calls Devin API with a prompt containing
the sample and asks Devin to implement a typed connector, tests, and PR.

Without the key the job is marked failed with an explicit setup message; the
system never fakes a Devin session.

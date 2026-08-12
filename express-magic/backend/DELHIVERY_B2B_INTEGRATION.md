# Delhivery B2B (LTL) integration

FastShip exposes Delhivery's B2B APIs through admin-only proxy routes. Delhivery JWTs and
account credentials stay on the backend; clients authenticate with a FastShip admin token.

The implementation is aligned with the current Delhivery B2B developer portal at:

```text
https://one.delhivery.com/developer-portal/documents/b2b/
```

## Configuration

Save the account in **Admin > Courier Credentials > Delhivery B2B (LTL)**. The required
values are API base, username, reset API password, client ID, and default warehouse ID.
The same values can be supplied by `DELHIVERY_B2B_*` environment variables; environment
values take precedence over stored credentials.

FastShip caches the returned JWT until one minute before its 24-hour expiry and shares one
in-flight login across concurrent requests. If Delhivery rejects credentials with HTTP
400/401/403, further login attempts for the same credentials are suppressed for 10 minutes
to avoid extending Delhivery's account lock. Saving corrected credentials clears the cache.
Logout is optional. FastShip sends Delhivery's required bearer token on `GET /ums/logout`
and invalidates the cached JWT only after Delhivery accepts the logout.
Before B2B manifestation, FastShip checks both origin and consignee pincodes with the
expected shipment weight in grams. An empty, malformed, or explicitly unsuccessful
serviceability response fails closed and prevents the provider booking request.
Expected TAT requires valid six-digit origin and destination pincodes. FastShip attaches the
cached UMS bearer token and a new UUID `X-Request-Id` to every call; Delhivery's non-negative
network estimate is returned in days without being treated as a contractual delivery promise.
Freight estimates require positive package dimensions in centimetres, a positive shipment
weight in grams, six-digit source and consignee pincodes, an invoice amount, and either
`prepaid` or `cod` payment mode. `cod_amount` is mandatory for COD. B2BR requests always send
the configured `fop` or `fod` freight mode, while cheque payment and carrier-risk insurance
remain optional booleans. The returned charge is an estimate and may differ after pickup.
Freight charge breakup accepts one comma-separated LRN string containing at most 25 values.
FastShip trims each value, rejects an empty or oversized list, percent-encodes the normalized
comma-separated value, and forwards it with the cached Delhivery bearer token.

Use `https://ltl-clients-api-dev.delhivery.com` only for UAT and
`https://ltl-clients-api.delhivery.com` for production. The password is the API password
created through Delhivery's forgot-password flow, not an unrelated Delhivery One password.

## API coverage

| Delhivery module | Provider request | FastShip request |
| --- | --- | --- |
| Password reset | `POST /forgot-password` | `POST /api/delhivery/b2b/auth/password-reset` |
| Login | `POST /ums/login` | `POST /api/delhivery/b2b/auth/login` |
| Logout | `GET /ums/logout` | `POST /api/delhivery/b2b/auth/logout` |
| Pincode serviceability | `GET /pincode-service/{pincode}` | `GET /api/delhivery/b2b/serviceability/{pincode}` |
| Expected TAT | `GET /tat/estimate` | `GET /api/delhivery/b2b/tat` |
| Freight estimate | `POST /freight/estimate` | `POST /api/delhivery/b2b/freight/estimate` |
| Freight charge breakup | `GET /lrn/freight-breakup/lrns={lrns}` | `GET /api/delhivery/b2b/freight/charges` |
| Warehouse creation | `POST /client-warehouse/create/` | `POST /api/delhivery/b2b/warehouses` |
| Warehouse update | `PATCH /client-warehouses/update` | `PATCH /api/delhivery/b2b/warehouses` |
| Shipment manifestation | `POST /manifest` | `POST /api/delhivery/b2b/shipments/manifest` |
| Manifest status | `GET /manifest?job_id=...` | `GET /api/delhivery/b2b/shipments/manifest/{jobId}` |
| Shipment update | `PUT /lrn/update/{lrn}` | `PUT /api/delhivery/b2b/shipments/{lrn}` |
| Shipment update status | `GET /lrn/update/status` | `GET /api/delhivery/b2b/shipments/update/{jobId}` |
| Shipment cancellation | `DELETE /lrn/cancel/{lrn}` | `DELETE /api/delhivery/b2b/shipments/{lrn}` |
| Shipment tracking | `GET /lrn/track` | `GET /api/delhivery/b2b/shipments/{lrn}/tracking` |
| Last-mile appointment | `POST /v2/appointments/lm` | `POST /api/delhivery/b2b/shipments/{lrn}/appointments` |
| Pickup request | `POST /pickup_requests` | `POST /api/delhivery/b2b/pickups` |
| Pickup cancellation | `DELETE /pickup_requests/{pickupId}` | `DELETE /api/delhivery/b2b/pickups/{pickupId}` |
| Shipping label | `GET /label/get_urls/{size}/{lrn}` | `GET /api/delhivery/b2b/shipments/{lrn}/labels/{size}` |
| LR copy | `GET /lr_copy/print/{lrn}` | `GET /api/delhivery/b2b/shipments/{lrn}/lr-copy` |
| Async document generation | `POST /generate/{documentType}` | `POST /api/delhivery/b2b/documents/{documentType}` |
| Document generation status | `GET /generate/{documentType}/status/{jobId}` | `GET /api/delhivery/b2b/documents/{documentType}/{jobId}` |
| Document download | `GET /document/download` | `GET /api/delhivery/b2b/documents` |
| Tracking/document webhooks | Delhivery push | `POST /api/webhook/delhivery/scan` and `/document` |

All proxy routes validate required fields, units, enumerations, dates, file formats, and
Delhivery limits before forwarding. Shipment and freight weights are in grams; dimensions
are in centimetres. Manifestation and shipment updates support multipart invoice files with
a maximum of 10 files and 20 MB aggregate size.

## Verification

Run both automated layers from `backend`:

```bash
npm run check:delhivery-b2b
```

`check:delhivery-b2b-apis` intercepts provider traffic and verifies request contracts,
validation, multipart fields, status mapping, token reuse, and the one-time 401 retry.
`check:delhivery-b2b-postman` runs the committed Postman collection through Newman against
an isolated mock FastShip server, including collection scripts and dynamic IDs.

For a live read-only smoke test, import the collection and environment from `postman/`, set
the FastShip admin password, leave `allowMutations=false`, and run the collection. Requests
that need a real LRN, MWN, or job ID skip their placeholder values. Set `allowMutations=true`
only for a Delhivery UAT account or when the intended production changes are approved.

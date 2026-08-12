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
Warehouse creation preserves the exact case and spacing of `name`, because the same value must
be used during manifestation. It validates the required pincode and address, weekday schedules,
optional booleans, and the 15-character alphanumeric GST value. The portal's misspelled
`buisness_hours`/`buisness_days` names are accepted as input aliases and sent using the
`business_hours`/`business_days` keys shown in Delhivery's cURL example. When
`same_as_fwd_add=true`, it takes precedence and a conflicting `ret_address` is not forwarded.
Warehouse updates preserve the exact `cl_warehouse_name`, validate and allow-list fields inside
`update_dict`, and normalize schedule aliases to `business_hours`. FastShip first calls the
HTTPS environment endpoint `/client-warehouse/update/`; if Delhivery returns 404 or 405, it
retries the conflicting cURL path `/client-warehouses/update` once.
Shipment creation sends validated multipart data to `POST /manifest`. Exactly one pickup name or
ID is required; either a drop-off store code or address is required, with the store code taking
priority when both are supplied. COD requires an amount, invoice QR or number/amount rules are
enforced, and weights/dimensions use grams/centimetres. Optional callbacks and return pincodes are
validated. Invoice uploads allow up to 10 PNG/JPG/JPEG/PDF/BMP files with a 20 MB aggregate limit
and require one matching `doc_data` entry per file. The async job ID is used by manifest status to
retrieve the generated LR and box AWBs after a bounded processing delay.
Manifest status sends the trimmed creation `job_id` as a query parameter on `GET /manifest`.
FastShip normalizes nested LR and AWB response shapes, retains every unique box/document AWB, and
does not enforce a fixed AWB count because physical-document shipments return n+1 AWBs while
paperless shipments return n.
Shipment updates send allow-listed multipart fields to `PUT /lrn/update/{lrn}` and reject an
explicit prepaid mode. COD mode requires `cod_amount`; dimensions, consignee pincode, invoices,
and HTTP(S) POST callbacks are validated. Invoice files are accepted only with invoices and one
same-order metadata entry per file, using the same 10-file, allowed-format, and 20 MB aggregate
limits as manifestation. Delhivery remains authoritative for first-mile, terminal-state,
last-mile-dispatch, and existing paperless-LR restrictions because those states are not part of
the update request.

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
| Warehouse update | `PATCH /client-warehouse/update/` (legacy fallback: `/client-warehouses/update`) | `PATCH /api/delhivery/b2b/warehouses` |
| Shipment manifestation | `POST /manifest` | `POST /api/delhivery/b2b/shipments/manifest` |
| Manifest status | `GET /manifest?job_id=...` | `GET /api/delhivery/b2b/shipments/manifest/{jobId}` |
| Shipment update | `PUT /lrn/update/{lrn}` | `PUT /api/delhivery/b2b/shipments/{lrn}` |
| Shipment update status | `GET /lrn/update/status?job_id=...` | `GET /api/delhivery/b2b/shipments/update/{jobId}` |
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

Shipment update is asynchronous: Delhivery returns an edit LR job ID from the
update call, and FastShip tracks that ID with `GET /lrn/update/status?job_id=...`
using the cached UMS bearer token.

Shipment cancellation forwards `DELETE /lrn/cancel/{lrn}`. Delhivery remains
authoritative for the allowed shipment stages: Manifested, In Transit, Pending,
Open, and Scheduled. Successful prepaid or COD cancellations transition to
Returned in Delhivery.

Shipment tracking forwards `GET /lrn/track?lrnum=...` and includes
`all_wbns=true` only when child waybill status is requested. Delhivery returns
the latest LR status only, so FastShip maps the documented status set
(`MANIFESTED` through `LOST`) without expecting historical scans.

Last-mile appointments forward `POST /v2/appointments/lm` after manifestation
and before OFD. Dates are validated as `DD/MM/YYYY`, the appointment date must be
today or later, the expiry date cannot be earlier than the appointment date, only
Delhivery's eight documented slots are accepted, and `po_number` must contain
one to five values such as `NotApplicable`.

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

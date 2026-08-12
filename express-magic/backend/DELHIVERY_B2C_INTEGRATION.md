# Delhivery B2C Integration

## API coverage

| Delhivery module | Provider request | FastShip request |
| --- | --- | --- |
| Pincode serviceability | `GET /c/api/pin-codes/json/?filter_codes={pincode}` | `GET /api/delhivery/b2c/serviceability/{pincode}` |
| Heavy product type pincode serviceability | `GET /api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode={pincode}` | `GET /api/delhivery/b2c/heavy-serviceability/{pincode}` |
| Expected TAT | `GET /api/dc/expected_tat?origin_pin={origin_pin}&destination_pin={destination_pin}&mot={mot}` | `GET /api/delhivery/b2c/tat?origin_pin={origin_pin}&destination_pin={destination_pin}&mot={mot}` |
| Fetch WayBill | `GET /waybill/api/bulk/json/?token={token}&count={count}` | `GET /api/delhivery/b2c/waybills?count={count}` |
| Fetch Single WayBill | `GET /waybill/api/fetch/json/?token={token}` | `GET /api/delhivery/b2c/waybill` |
| Shipment Tracking | `GET /api/v1/packages/json/?waybill={waybill}&ref_ids={order_id}` | `GET /api/delhivery/b2c/shipments/track?waybill={waybill}&ref_ids={order_id}` |
| Calculate Shipping Cost | `GET /api/kinko/v1/invoice/charges/.json?md={md}&ss={ss}&d_pin={d_pin}&o_pin={o_pin}&cgm={cgm}&pt={pt}` | `GET /api/delhivery/b2c/shipping-cost?md={md}&ss={ss}&d_pin={d_pin}&o_pin={o_pin}&cgm={cgm}&pt={pt}` |
| Generate Shipping Label | `GET /api/p/packing_slip?wbns={waybill}&pdf={pdf}&pdf_size={pdf_size}` | `GET /api/delhivery/b2c/shipments/label?waybill={waybill}&pdf={pdf}&pdf_size={pdf_size}` |
| Pickup Request Creation | `POST /fm/request/new/` | `POST /api/delhivery/b2c/pickup-requests` |
| Shipment Creation | `POST /api/cmu/create.json` | `POST /api/delhivery/b2c/shipments` |
| MPS Manifestation | `POST /api/cmu/create.json` | `POST /api/delhivery/b2c/shipments/mps` |
| Shipment Updation/Edit | `POST /api/p/edit` | `POST /api/delhivery/b2c/shipments/edit` |
| Shipment Cancellation | `POST /api/p/edit` | `POST /api/delhivery/b2c/shipments/cancel` |
| Ewaybill Update | `PUT /api/rest/ewaybill/{waybill}/` | `PUT /api/delhivery/b2c/shipments/{waybill}/ewaybill` |

FastShip validates a single six-digit pincode, forwards it as `filter_codes`,
and authenticates with Delhivery's `Authorization: Token ...` header. An empty
`delivery_codes` list is treated as non-serviceable. A `remarks` or `remark`
value of `Embargo` is temporary NSZ; a blank remark is serviceable.

For Heavy product type serviceability, FastShip validates a single six-digit
pincode and forwards `product_type=Heavy` with the `pincode` query parameter.
`NSZ` is treated as non-serviceable, while Delhivery's `payment_type` response
is surfaced so clients can evaluate serviceability by payment mode.

For Expected TAT, FastShip validates origin/destination as six-digit pincodes,
accepts `mot` values `S`, `E`, or `N`, and forwards optional `pdt` plus
`expected_pickup_date`. The provider response is returned unchanged under
`data` so delivery-day and expected-delivery-date fields remain available.

For Fetch WayBill, FastShip requires `count` to be an integer from 1 to 10000,
forwards Delhivery's token in the provider query string, and returns the bulk
waybill response unchanged under `data`. Delhivery generates these in backend
batches, so callers should store the fetched waybills and use them later during
manifest creation.

For Fetch Single WayBill, FastShip forwards Delhivery's token in the provider
query string and returns the single generated waybill response unchanged under
`data`.

For Shipment Tracking, FastShip requires `waybill`, accepts up to 50
comma-separated waybills, forwards optional `ref_ids`, and returns Delhivery's
current status plus scan-history payload unchanged under `data`.

For Calculate Shipping Cost, FastShip requires `md` (`E` or `S`), `cgm` in
grams, six-digit `o_pin` and `d_pin`, `ss` (`Delivered`, `RTO`, or `DTO`), and
`pt` (`Pre-paid` or `COD`). Optional `l`, `b`, `h`, and `ipkg_type` are
forwarded when present. The estimated provider charges are returned unchanged
under `data`.

For Generate Shipping Label, FastShip requires `waybill` and forwards it to
Delhivery as `wbns`. Optional `pdf` accepts `true` or `false`; optional
`pdf_size` accepts `A4` or `4R`. `pdf=true` can return a PDF/S3 link, while
`pdf=false` can return JSON for custom label rendering.

For Pickup Request Creation, FastShip requires `pickup_time` in `HH:mm:ss`,
`pickup_date` in `YYYY-MM-DD`, `pickup_location`, and positive integer
`expected_package_count`, then forwards the JSON payload to Delhivery. This is
a state-changing request against a warehouse/pickup location.

For Shipment Creation, FastShip accepts the documented JSON manifest, validates
required shipment fields plus `pickup_location.name`, canonicalizes
`payment_mode`, and forwards the provider request as URL-encoded
`format=json&data={...}` to avoid Delhivery raw-JSON special-character issues.
This is a state-changing request; only run it against an intended Delhivery
account and warehouse.

For MPS Manifestation, FastShip enforces at least two boxes, prefetched waybills
on every box, `shipment_type=MPS`, `mps_amount`, `mps_children`, and a shared
`master_id` matching the master waybill. The payload is sent to Delhivery using
the same URL-encoded manifestation API.

For Shipment Updation/Edit, FastShip requires `waybill`, forwards only the
documented editable fields, validates numeric weight/dimensions, and allows
`pt` as `COD` or `Pre-paid`. When changing `pt` to `COD`, `cod` is required.
Provider status restrictions still apply in Delhivery.

For Shipment Cancellation, FastShip requires `waybill` and sends
`cancellation=true` to Delhivery's edit endpoint. Delhivery still decides
whether cancellation is allowed based on the package status and payment mode.

For Ewaybill Update, FastShip requires the route `waybill` plus one or more
`data` entries containing `dcn` invoice number and `ewbn` e-waybill number, then
forwards the payload to Delhivery's ewaybill endpoint.

## Verification

```bash
npm run check:delhivery-b2c
```

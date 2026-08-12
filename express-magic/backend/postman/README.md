# Amazon Shipping Postman Checks

Import these files into Postman:

- `amazon-shipping.postman_collection.json`
- `amazon-shipping.local.postman_environment.json`

Before running the collection, set:

- `baseUrl`
- `xApiKey`
- `amazonAccessToken` if you want to pass a direct one-hour access token

If Amazon credentials are already saved from the admin Courier Credentials page,
leave `amazonAccessToken` blank and the backend will generate the token from the
stored refresh token and LWA client credentials.

For end-to-end purchase flow:

1. Run `Get Rates`.
2. Copy `requestToken`, a selected `rateId`, and optionally `serviceId` from the
   Amazon response into the environment.
3. Run `Purchase Shipment` or `One Click Shipment`.
4. Copy returned `shipmentId`, `trackingId`, and `carrierId` before running
   documents, tracking, cancel, or NDR checks.

Per Amazon Shipping docs, `Access Points` is configured with
`AmazonShipping_UK`; `NDR Feedback` is configured with `AmazonShipping_IN`.

## Delhivery B2B (LTL)

Import:

- `delhivery-b2b.postman_collection.json`
- `delhivery-b2b.local.postman_environment.json`

Save the production or UAT credentials from **Admin > Courier Credentials >
Delhivery B2B (LTL)**, then set `adminEmail` and `adminPassword`. The first
request signs in and stores `adminToken`; the proxy intentionally does not expose
Delhivery's JWT. Credential Preflight checks username, password, client ID, and
warehouse ID without returning any secret value.

The collection contains state-changing requests. Run password reset, warehouse
creation/update, manifestation, shipment update/cancellation, appointment, and
pickup creation/cancellation only against the intended account. They are skipped
by default; set `allowMutations=true` only when those changes are intended. Requests
that need an LRN, MWN, or job ID also skip their placeholder value.

Run the Postman collection automatically through Newman with an isolated mock server:

```bash
npm run check:delhivery-b2b-postman
```

## Delhivery B2C (Express)

Import:

- `delhivery-b2c.postman_collection.json`
- `delhivery-b2c.local.postman_environment.json`

The collection signs in as a FastShip admin and checks the Delhivery B2C
pincode serviceability, Heavy product type pincode serviceability, Expected TAT,
Fetch WayBill, Fetch Single WayBill, Shipment Tracking, Calculate Shipping Cost,
Generate Shipping Label, Download Document, Pickup Request Creation, Client
Warehouse Creation, Client Warehouse Updation, Shipment Creation, MPS
Manifestation, RVP QC 3.0 Shipment Creation, Shipment Updation/Edit, Shipment
Cancellation, Ewaybill Update, NDR Action, and NDR UPL Status proxies. Pickup
Request Creation, Client Warehouse Creation, Client Warehouse Updation,
Shipment Creation, MPS Manifestation, RVP QC 3.0 Shipment Creation, Shipment
Updation/Edit, Shipment Cancellation, Ewaybill Update, and the NDR action/status
workflow are skipped by default; set `allowMutations=true` only when the
mutation is intended. Local Newman verification:

```bash
npm run check:delhivery-b2c-postman
```

See `DELHIVERY_B2B_INTEGRATION.md` and `DELHIVERY_B2C_INTEGRATION.md` for the
complete provider-to-FastShip route matrices.

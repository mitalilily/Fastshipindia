# Delhivery B2C Integration

## API coverage

| Delhivery module | Provider request | FastShip request |
| --- | --- | --- |
| Pincode serviceability | `GET /c/api/pin-codes/json/?filter_codes={pincode}` | `GET /api/delhivery/b2c/serviceability/{pincode}` |
| Heavy product type pincode serviceability | `GET /api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode={pincode}` | `GET /api/delhivery/b2c/heavy-serviceability/{pincode}` |

FastShip validates a single six-digit pincode, forwards it as `filter_codes`,
and authenticates with Delhivery's `Authorization: Token ...` header. An empty
`delivery_codes` list is treated as non-serviceable. A `remarks` or `remark`
value of `Embargo` is temporary NSZ; a blank remark is serviceable.

For Heavy product type serviceability, FastShip validates a single six-digit
pincode and forwards `product_type=Heavy` with the `pincode` query parameter.
`NSZ` is treated as non-serviceable, while Delhivery's `payment_type` response
is surfaced so clients can evaluate serviceability by payment mode.

## Verification

```bash
npm run check:delhivery-b2c
```

# Delhivery B2C Integration

## API coverage

| Delhivery module | Provider request | FastShip request |
| --- | --- | --- |
| Pincode serviceability | `GET /c/api/pin-codes/json/?filter_codes={pincode}` | `GET /api/delhivery/b2c/serviceability/{pincode}` |

FastShip validates a single six-digit pincode, forwards it as `filter_codes`,
and authenticates with Delhivery's `Authorization: Token ...` header. An empty
`delivery_codes` list is treated as non-serviceable. A `remarks` or `remark`
value of `Embargo` is temporary NSZ; a blank remark is serviceable.

## Verification

```bash
npm run check:delhivery-b2c
```

import { Grid, Paper, Stack, Typography, alpha } from '@mui/material'
import { type Control, Controller, useWatch } from 'react-hook-form'
import CustomInput from '../../UI/inputs/CustomInput'
import type { B2CFormData } from './B2COrderForm'

const ACCENT = '#0D3B8E'

interface PackageDetailsFormProps {
  control: Control<B2CFormData>
}

const PackageDetailsForm = ({ control }: PackageDetailsFormProps) => {
  const invoiceValue = Number(useWatch({ control, name: 'invoiceValue' }) || 0)
  const invoiceDate = String(useWatch({ control, name: 'invoiceDate' }) || '')
  const ebnNumber = String(useWatch({ control, name: 'ebnNumber' }) || '')
  const isEbnRequired = invoiceValue > 50000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minEbnExpiryDate = today.toISOString().split('T')[0]
  const referenceDate = invoiceDate ? new Date(invoiceDate) : today
  const maxEbnExpiryDate = new Date(referenceDate)
  maxEbnExpiryDate.setDate(maxEbnExpiryDate.getDate() + 15)
  const maxEbnExpiryDateValue = maxEbnExpiryDate.toISOString().split('T')[0]

  return (
    <Stack gap={1}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1, sm: 1.25 },
          borderRadius: 2,
          border: `1px solid ${alpha(ACCENT, 0.12)}`,
          background: '#FFFFFF',
        }}
      >
        <Stack gap={0.9}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#333369' }}>
            Invoice 1
          </Typography>

          <Grid container spacing={1.2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="invoiceNumber"
                control={control}
                rules={{ required: 'Invoice Number is required' }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="Invoice Number"
                    required
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || 'Enter customer invoice number'}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="invoiceDate"
                control={control}
                rules={{ required: 'Invoice Date is required' }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="Invoice Date"
                    type="date"
                    required
                    InputLabelProps={{ shrink: true }}
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="invoiceValue"
                control={control}
                rules={{
                  required: 'Invoice Value is required',
                  min: { value: 0.01, message: 'Invoice Value must be greater than ₹0' },
                }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="Invoice Value (₹)"
                    type="number"
                    required
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    inputProps={{ min: 0.01, step: 0.01 }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="products.0.productName"
                control={control}
                rules={{ required: 'Product name is required' }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="Product Name"
                    placeholder="e.g. Cotton T-shirt"
                    required
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="products.0.sku"
                control={control}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="SKU (Optional)"
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="products.0.hsnCode"
                control={control}
                render={({ field }) => <CustomInput label="HSN Code (Optional)" {...field} />}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="ebnNumber"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value && isEbnRequired) {
                      return 'EBN Number is required when invoice value > ₹50,000'
                    }

                    if (value) {
                      const cleaned = String(value).replace(/\s+/g, '').toUpperCase()
                      if (cleaned.length !== 12) return 'EBN Number must be exactly 12 characters'
                      if (!/^[A-Z0-9]{12}$/.test(cleaned)) {
                        return 'EBN Number must contain only letters and numbers'
                      }
                    }

                    return true
                  },
                }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    {...field}
                    onChange={(event) =>
                      field.onChange(String(event.target.value || '').replace(/\s+/g, '').toUpperCase())
                    }
                    label={isEbnRequired ? 'EBN Number * (Required)' : 'EBN Number (Optional)'}
                    required={isEbnRequired}
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message || 'Required only when invoice value > ₹50,000'
                    }
                    inputProps={{ maxLength: 12 }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="ebnExpiry"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value && ebnNumber) return 'EBN Expiry is required when EBN Number is provided'
                    if (!value) return true

                    const expiryDate = new Date(String(value))
                    if (expiryDate < today) return 'EBN Expiry date cannot be in the past'
                    if (expiryDate > maxEbnExpiryDate) {
                      return 'EBN Expiry cannot exceed 15 days from invoice date'
                    }

                    return true
                  },
                }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    {...field}
                    type="date"
                    label={ebnNumber ? 'EBN Expiry * (Required)' : 'EBN Expiry (Optional)'}
                    required={Boolean(ebnNumber)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: minEbnExpiryDate, max: maxEbnExpiryDateValue }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || 'Required when EBN Number is provided'}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={0.5}
            sx={{ pt: 0.9, borderTop: `1px solid ${alpha(ACCENT, 0.12)}` }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ color: '#4A5568' }}>
              Invoice Grand Total
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#333369' }}>
              ₹{invoiceValue.toFixed(2)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}

export default PackageDetailsForm

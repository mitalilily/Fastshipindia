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
                name="products.0.quantity"
                control={control}
                rules={{
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Minimum 1' },
                  validate: (value) => Number.isInteger(Number(value)) || 'Use a whole number',
                }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    label="Qty"
                    type="number"
                    required
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    inputProps={{ min: 1, step: 1 }}
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

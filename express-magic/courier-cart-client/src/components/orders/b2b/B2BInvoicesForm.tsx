import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AiOutlineDelete } from 'react-icons/ai'
import { validateInvoiceContent } from '../../../api/b2b.api'
import { useCarrierTransportIds } from '../../../hooks/useCarrierTransportIds'
import { b2bBoxWeightInputToKg } from '../../../utils/b2bWeight'
import CustomInput from '../../UI/inputs/CustomInput'
import FileUploader, { type UploadedFileInfo } from '../../UI/uploader/FileUploader'
import type { B2BFormData } from './B2BOrderForm'

const padDatePart = (value: number) => String(value).padStart(2, '0')
const getTodayDate = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

const emptyInvoiceProduct = { productName: '', quantity: 1, unitPrice: 0, sku: '', hsnCode: '' }

export default function B2BInvoicesForm() {
  const { control, watch, setValue, getValues, trigger, setError, clearErrors } =
    useFormContext<B2BFormData>()
  const { data: carrierTransportIds = [] } = useCarrierTransportIds()

  // State to track invoice content validation warnings
  const [invoiceWarnings, setInvoiceWarnings] = useState<Record<number, string>>({})

  const {
    fields: invoiceFields,
    append: appendInvoice,
    remove: removeInvoice,
  } = useFieldArray({
    control,
    name: 'invoices',
  })
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control,
    name: 'products',
  })

  const boxes = useWatch({ control, name: 'boxes' }) || []
  const products = useWatch({ control, name: 'products' }) || []
  const invoices = useWatch({ control, name: 'invoices' }) || []
  const productsTotal = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0) * Number(product.unitPrice || 0),
    0,
  )

  useEffect(() => {
    invoiceFields.forEach((_, index) => {
      if (!getValues(`invoices.${index}.invoiceDate`)) {
        setValue(`invoices.${index}.invoiceDate`, getTodayDate(), { shouldValidate: true })
      }
    })
  }, [getValues, invoiceFields, setValue])

  useEffect(() => {
    if (invoiceFields.length !== 1) return

    setValue('invoices.0.invoiceValue', Number(productsTotal.toFixed(2)), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [invoiceFields.length, productsTotal, setValue])

  // Calculate total chargeable weight for EBN validation
  const calculateTotalChargeableWeight = () => {
    if (!Array.isArray(boxes)) return 0
    return boxes.reduce((sum: number, box: unknown) => {
      if (box && typeof box === 'object' && box !== null && 'weightKg' in box) {
        const boxWithWeight = box as { quantity?: number; weightKg?: number }
        const quantity = Math.max(1, Math.floor(Number(boxWithWeight.quantity || 1)))
        return sum + b2bBoxWeightInputToKg(boxWithWeight.weightKg) * quantity
      }
      return sum
    }, 0)
  }

  // Calculate total invoice value
  const totalInvoiceValue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice?.invoiceValue || 0),
    0,
  )
  const totalsMatch = Math.abs(totalInvoiceValue - productsTotal) < 0.01

  // Function to check if last invoice is valid before adding new one
  const canAddNewInvoice = async () => {
    if (invoiceFields.length === 0) return true
    const lastIndex = invoiceFields.length - 1
    const valid = await trigger([
      `invoices.${lastIndex}.invoiceNumber`,
      `invoices.${lastIndex}.invoiceDate`,
      `invoices.${lastIndex}.invoiceValue`,
    ] as const)
    return valid
  }

  const handleAddInvoice = async () => {
    const valid = await canAddNewInvoice()
    if (!valid) return

    appendInvoice({
      invoiceNumber: '',
      invoiceDate: getTodayDate(),
      invoiceValue: 0,
      carrierName: '',
      carrierTransportId: '',
      invoiceFileUrl: '',
    })
  }

  const handleAddProduct = async () => {
    const lastIndex = productFields.length - 1
    const valid =
      lastIndex < 0 ||
      (await trigger([
        `products.${lastIndex}.productName`,
        `products.${lastIndex}.quantity`,
        `products.${lastIndex}.unitPrice`,
      ]))
    if (valid) appendProduct(emptyInvoiceProduct)
  }

  return (
    <Box>
      <Stack spacing={1}>
        <Paper
          sx={{
            p: { xs: 1, md: 1.25 },
            border: '1px solid #E0E6ED',
            borderRadius: 2,
            background: '#FAFBFC',
          }}
          elevation={0}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={0.75}
            mb={0.9}
          >
            <Box>
              <Typography fontWeight={700} color="#102A54">
                Invoice Products
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add every product shown on this invoice.
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} color="#333369">
              Product Total ₹{productsTotal.toFixed(2)}
            </Typography>
          </Stack>

          <Stack spacing={0.9}>
            {productFields.map((product, productIndex) => (
              <Paper
                key={product.id}
                variant="outlined"
                sx={{ p: 1, borderRadius: 2, borderColor: '#E0E6ED', background: '#FFFFFF' }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md:
                        'minmax(180px, 1.5fr) minmax(90px, 0.6fr) minmax(110px, 0.7fr) minmax(120px, 0.75fr) minmax(120px, 0.75fr) 40px',
                    },
                    gap: 0.9,
                    alignItems: 'start',
                  }}
                >
                  <Controller
                    name={`products.${productIndex}.productName`}
                    control={control}
                    rules={{
                      required: 'Product name is required',
                      validate: (value) =>
                        String(value || '').trim().length > 0 || 'Product name is required',
                    }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label="Product Name"
                        placeholder="e.g. Cotton T-shirt"
                        required
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name={`products.${productIndex}.quantity`}
                    control={control}
                    rules={{
                      required: 'Quantity is required',
                      min: { value: 1, message: 'Minimum 1' },
                      validate: (value) => Number.isInteger(Number(value)) || 'Use a whole number',
                    }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label="Qty"
                        type="number"
                        required
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                      />
                    )}
                  />
                  <Controller
                    name={`products.${productIndex}.unitPrice`}
                    control={control}
                    rules={{
                      required: 'Unit price is required',
                      min: { value: 0.01, message: 'Enter a valid price' },
                    }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label="Unit Price (₹)"
                        type="number"
                        required
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                      />
                    )}
                  />
                  <Controller
                    name={`products.${productIndex}.sku`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label="SKU (Optional)"
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name={`products.${productIndex}.hsnCode`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label="HSN Code (Optional)"
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <IconButton
                    color="error"
                    aria-label={`Remove product ${productIndex + 1}`}
                    disabled={productFields.length === 1}
                    onClick={() => removeProduct(productIndex)}
                    sx={{ mt: { xs: 0, md: 3.2 } }}
                  >
                    <AiOutlineDelete />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>

          <Button variant="outlined" size="small" onClick={handleAddProduct} sx={{ mt: 0.9 }}>
            + Add Product
          </Button>
        </Paper>

        <Divider />

        {invoiceFields.map((invoice, index) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invoiceValue = watch(`invoices.${index}.invoiceValue` as any)
          const totalChargeableWeight = calculateTotalChargeableWeight()

          // EBN is required if invoice value > ₹50,000 OR total chargeable weight > 100 kg
          const isEbnRequired =
            (invoiceValue && Number(invoiceValue) > 50000) || totalChargeableWeight > 100

          return (
            <Paper
              key={invoice.id}
              sx={{
                p: { xs: 1, md: 1.25 },
                border: '1px solid #E0E6ED',
                borderRadius: 2,
                background: '#FAFBFC',
                position: 'relative',
              }}
              elevation={0}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.6}>
                <Typography variant="h6" fontWeight={600} color="#333369">
                  Invoice {index + 1}
                </Typography>
                {invoiceFields.length > 1 && (
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => removeInvoice(index)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <AiOutlineDelete />
                  </IconButton>
                )}
              </Stack>

              <Grid container spacing={1.1}>
                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.invoiceNumber`}
                    control={control}
                    rules={{ required: 'Invoice Number is required' }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        fullWidth
                        required
                        label="Invoice Number"
                        topMargin={false}
                        helperText={fieldState.error?.message || 'Enter customer invoice number'}
                        error={!!fieldState.error}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.invoiceDate`}
                    control={control}
                    rules={{ required: 'Invoice Date is required' }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        type="date"
                        fullWidth
                        required
                        label="Invoice Date"
                        topMargin={false}
                        InputLabelProps={{ shrink: true }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.invoiceValue`}
                    control={control}
                    rules={{
                      required: 'Invoice Value is required',
                      min: { value: 0.01, message: 'Invoice Value must be greater than ₹0' },
                      validate: () =>
                        Math.abs(totalInvoiceValue - productsTotal) < 0.01 ||
                        `Combined invoice value must equal product total ₹${productsTotal.toFixed(2)}`,
                    }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        type="number"
                        fullWidth
                        required
                        label="Invoice Value (₹)"
                        topMargin={false}
                        inputProps={{
                          min: 0.01,
                          step: 0.01,
                          readOnly: invoiceFields.length === 1,
                        }}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ||
                          (invoiceFields.length === 1
                            ? 'Automatically calculated from Quantity × Unit Price'
                            : 'Split the product total across all invoices')
                        }
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.carrierName`}
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        select
                        fullWidth
                        label="Transporter"
                        topMargin={false}
                        helperText="Select carrier to fill Transport ID"
                        onChange={(event) => {
                          const carrierName = String(event.target.value || '')
                          const selectedCarrier = carrierTransportIds.find(
                            (carrier) => carrier.carrierName === carrierName,
                          )
                          field.onChange(carrierName)
                          setValue(
                            `invoices.${index}.carrierTransportId`,
                            selectedCarrier?.transportId || '',
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }}
                      >
                        <MenuItem value="">Select Transporter</MenuItem>
                        {carrierTransportIds.map((carrier) => (
                          <MenuItem key={carrier.carrierKey} value={carrier.carrierName}>
                            {carrier.carrierName}
                          </MenuItem>
                        ))}
                      </CustomInput>
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.carrierTransportId`}
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                        {...field}
                        fullWidth
                        label="Transport ID"
                        placeholder="Auto-filled"
                        topMargin={false}
                        helperText="Click field to select the ID"
                        inputProps={{ readOnly: true }}
                        onClick={(event) => {
                          const input = event.currentTarget.querySelector(
                            'input',
                          ) as HTMLInputElement | null
                          input?.select()
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={`invoices.${index}.ebnNumber` as any}
                    control={control}
                    rules={{
                      validate: (value) => {
                        // If EBN is required but not provided
                        if (!value && isEbnRequired) {
                          return 'EBN Number is required when invoice value > ₹50,000 or total chargeable weight > 100 kg'
                        }

                        // If value is provided, validate format
                        if (value && typeof value === 'string') {
                          const cleaned = value.replace(/\s+/g, '').toUpperCase()
                          if (cleaned.length !== 12) {
                            return 'EBN Number must be exactly 12 characters'
                          }
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
                        onChange={(e) => {
                          const value = String(e.target.value || '')
                            .replace(/\s+/g, '')
                            .toUpperCase()
                          field.onChange(value)
                        }}
                        fullWidth
                        required={isEbnRequired}
                        label={isEbnRequired ? 'EBN Number * (Required)' : 'EBN Number (Optional)'}
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ||
                          (isEbnRequired
                            ? 'Required: Invoice value > ₹50,000 or total chargeable weight > 100 kg'
                            : 'Required when invoice value > ₹50,000 or total chargeable weight > 100 kg')
                        }
                        inputProps={{ maxLength: 12 }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={`invoices.${index}.ebnExpiry` as any}
                    control={control}
                    rules={{
                      validate: (value) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const currentEbnNumber = getValues(`invoices.${index}.ebnNumber` as any)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const currentInvoiceDate = getValues(`invoices.${index}.invoiceDate` as any)

                        // If EBN number is provided, expiry is required
                        if (!value && currentEbnNumber) {
                          return 'EBN Expiry is required when EBN Number is provided'
                        }

                        // If no value and no EBN number, validation passes
                        if (!value) {
                          return true
                        }

                        const expiryDate = new Date(String(value))
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        // Check if expiry is in the past
                        if (expiryDate < today) {
                          return 'EBN Expiry date cannot be in the past'
                        }

                        // Check if expiry exceeds 15 days from invoice date or today
                        const referenceDate = currentInvoiceDate
                          ? new Date(currentInvoiceDate)
                          : new Date()
                        referenceDate.setHours(0, 0, 0, 0)
                        const maxExpiryDate = new Date(referenceDate)
                        maxExpiryDate.setDate(maxExpiryDate.getDate() + 15)

                        if (expiryDate > maxExpiryDate) {
                          return 'EBN Expiry cannot exceed 15 days from invoice date'
                        }

                        return true
                      },
                    }}
                    render={({ field, fieldState }) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const currentEbnNumber = watch(`invoices.${index}.ebnNumber` as any)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const currentInvoiceDate = watch(`invoices.${index}.invoiceDate` as any)

                      // Calculate max date (15 days from invoice date or today)
                      const referenceDate = currentInvoiceDate
                        ? new Date(String(currentInvoiceDate))
                        : new Date()
                      const maxDate = new Date(referenceDate)
                      maxDate.setDate(maxDate.getDate() + 15)
                      const maxDateStr = maxDate.toISOString().split('T')[0]

                      // Calculate min date (today)
                      const minDate = new Date()
                      minDate.setHours(0, 0, 0, 0)
                      const minDateStr = minDate.toISOString().split('T')[0]

                      return (
                        <CustomInput
                          {...field}
                          type="date"
                          fullWidth
                          required={!!currentEbnNumber}
                          topMargin={false}
                          label={
                            currentEbnNumber ? 'EBN Expiry * (Required)' : 'EBN Expiry (Optional)'
                          }
                          InputLabelProps={{ shrink: true }}
                          inputProps={{
                            min: minDateStr,
                            max: maxDateStr,
                          }}
                          error={!!fieldState.error}
                          helperText={
                            fieldState.error?.message ||
                            (currentEbnNumber
                              ? `Required when EBN Number is provided. Valid range: ${minDateStr} to ${maxDateStr}`
                              : 'Required when EBN Number is provided')
                          }
                        />
                      )
                    }}
                  />
                </Grid>

                {/* Invoice File Upload */}
                <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                  <Controller
                    name={`invoices.${index}.invoiceFileUrl`}
                    control={control}
                    render={({ field, fieldState }) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const currentInvoiceValue = watch(`invoices.${index}.invoiceValue` as any)
                      const invoiceValue = Number(currentInvoiceValue || 0)

                      const handleFileUploaded = async (files: UploadedFileInfo[]) => {
                        if (files.length > 0) {
                          const file = files[0]

                          // Validate file after upload
                          const fileName = file.originalName.toLowerCase()
                          const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
                          const dangerousExtensions = [
                            '.exe',
                            '.js',
                            '.php',
                            '.html',
                            '.zip',
                            '.rar',
                            '.bat',
                            '.sh',
                          ]

                          // Check for dangerous extensions
                          const hasDangerousExtension = dangerousExtensions.some((ext) =>
                            fileName.endsWith(ext),
                          )
                          if (hasDangerousExtension) {
                            setError(`invoices.${index}.invoiceFileUrl`, {
                              type: 'manual',
                              message:
                                'Dangerous file types (.exe, .js, .php, .html, .zip, .rar, .bat, .sh) are not permitted.',
                            })
                            setValue(`invoices.${index}.invoiceFileUrl`, '')
                            return
                          }

                          // Check for allowed extensions
                          const hasAllowedExtension = allowedExtensions.some((ext) =>
                            fileName.endsWith(ext),
                          )
                          if (!hasAllowedExtension) {
                            setError(`invoices.${index}.invoiceFileUrl`, {
                              type: 'manual',
                              message: 'Only PDF, JPG, JPEG, and PNG files are allowed.',
                            })
                            setValue(`invoices.${index}.invoiceFileUrl`, '')
                            return
                          }

                          // Check file size (5 MB)
                          const maxSizeBytes = 5 * 1024 * 1024 // 5 MB
                          if (file.size > maxSizeBytes) {
                            setError(`invoices.${index}.invoiceFileUrl`, {
                              type: 'manual',
                              message: 'File size exceeds 5 MB limit.',
                            })
                            setValue(`invoices.${index}.invoiceFileUrl`, '')
                            return
                          }

                          // Clear any previous errors
                          clearErrors(`invoices.${index}.invoiceFileUrl`)

                          // Set the file URL
                          setValue(`invoices.${index}.invoiceFileUrl`, file.url)

                          // Soft validation: Check invoice content (non-blocking)
                          // This would typically call an OCR service to extract invoice data
                          // For now, we'll simulate a basic check and show a warning if needed
                          // TODO: Implement actual OCR validation if enabled
                          try {
                            // Simulate invoice content validation
                            // In production, this would call: await validateInvoiceContent(file.url, invoiceValue)
                            const invoiceContentWarning = await validateInvoiceContentSoft(
                              file.url,
                              invoiceValue,
                            )
                            if (invoiceContentWarning) {
                              setInvoiceWarnings((prev) => ({
                                ...prev,
                                [index]: invoiceContentWarning,
                              }))
                            } else {
                              setInvoiceWarnings((prev) => {
                                const newWarnings = { ...prev }
                                delete newWarnings[index]
                                return newWarnings
                              })
                            }
                          } catch (error) {
                            // OCR validation failed, but don't block
                            console.warn('Invoice content validation failed:', error)
                          }
                        } else {
                          setValue(`invoices.${index}.invoiceFileUrl`, '')
                          setInvoiceWarnings((prev) => {
                            const newWarnings = { ...prev }
                            delete newWarnings[index]
                            return newWarnings
                          })
                        }
                      }

                      // Soft validation function for invoice content (non-blocking)
                      const validateInvoiceContentSoft = async (
                        fileUrl: string,
                        invoiceValue: number,
                      ): Promise<string | null> => {
                        try {
                          const response = await validateInvoiceContent({
                            fileUrl,
                            invoiceValue,
                          })

                          if (response?.success && response?.data?.warningMessage) {
                            return response.data.warningMessage
                          }

                          return null
                        } catch (error) {
                          // OCR validation failed, but don't block
                          console.warn('Invoice content validation failed:', error)
                          return null
                        }
                      }

                      return (
                        <Stack spacing={1}>
                          <FileUploader
                            variant="button"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            maxSizeMb={5}
                            folderKey="invoices"
                            label="Invoice File (Optional - PDF, JPG, PNG, Max 5MB)"
                            required={false}
                            onUploaded={handleFileUploaded}
                            fullWidth
                            error={!!fieldState.error}
                          />
                          {invoiceWarnings[index] && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              <Typography variant="caption">{invoiceWarnings[index]}</Typography>
                            </Alert>
                          )}
                          {field.value && (
                            <Box
                              component="a"
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: '#333369',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              📄 View uploaded invoice
                            </Box>
                          )}
                          {fieldState.error && (
                            <Typography variant="caption" color="error">
                              {fieldState.error.message}
                            </Typography>
                          )}
                          {!fieldState.error && !field.value && (
                            <Typography variant="caption" color="#4A5568">
                              Optional: FastShip generates the invoice PDF automatically after booking.
                            </Typography>
                          )}
                        </Stack>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          )
        })}

        {/* Add Invoice Button */}
        <Box>
          <Button variant="outlined" size="small" onClick={handleAddInvoice}>
            + Add Invoice
          </Button>
        </Box>

        {/* Grand total summary */}
        <Paper
          sx={{
            p: { xs: 1.1, md: 1.25 },
            borderRadius: 2,
            background: '#F5F7FA',
            border: `1px solid ${totalsMatch ? '#D9E2EC' : '#F59E0B'}`,
          }}
          elevation={0}
        >
          <Stack spacing={0.75}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={0.5}
            >
              <Typography variant="body2" fontWeight={700} color="#4A5568">
                Invoice Grand Total
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#333369">
                ₹{totalInvoiceValue.toFixed(2)}
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={0.5}
            >
              <Typography variant="caption" fontWeight={600} color="#64748B">
                Product Grand Total
              </Typography>
              <Typography variant="body2" fontWeight={700} color="#102A54">
                ₹{productsTotal.toFixed(2)}
              </Typography>
            </Stack>
            {!totalsMatch && (
              <Alert severity="warning" sx={{ py: 0.25 }}>
                Invoice grand total must match product grand total.
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}

import { Alert, Box, Button, Grid, IconButton, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AiOutlineDelete } from 'react-icons/ai'
import { validateInvoiceContent } from '../../../api/b2b.api'
import { b2bBoxWeightInputToKg } from '../../../utils/b2bWeight'
import CustomInput from '../../UI/inputs/CustomInput'
import FileUploader, { type UploadedFileInfo } from '../../UI/uploader/FileUploader'
import type { B2BFormData } from './B2BOrderForm'

const padDatePart = (value: number) => String(value).padStart(2, '0')
const getTodayDate = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

export default function B2BInvoicesForm() {
  const { control, watch, setValue, getValues, trigger, setError, clearErrors } =
    useFormContext<B2BFormData>()

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
      invoiceFileUrl: '',
    })
  }

  return (
    <Box>
      <Stack spacing={2}>
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
                p: { xs: 1.5, md: 2 },
                border: '1px solid #E0E6ED',
                borderRadius: 2,
                background: '#FAFBFC',
                position: 'relative',
              }}
              elevation={0}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
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

              <Grid container spacing={1.5}>
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

        {/* Total Invoice Value Summary */}
        {invoiceFields.length > 1 && totalInvoiceValue > 0 && (
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              background: '#F5F7FA',
              border: '1px solid #E0E6ED',
            }}
            elevation={0}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600} color="#4A5568">
                Total Invoice Value:
              </Typography>
              <Typography variant="h6" fontWeight={700} color="#333369">
                ₹{totalInvoiceValue.toFixed(2)}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}

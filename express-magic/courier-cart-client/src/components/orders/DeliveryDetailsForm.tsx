import { CircularProgress, Grid } from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, type FieldErrors, useFormContext } from 'react-hook-form'
import { lookupPincodeLocation } from '../../api/locations'
import CustomInput from '../UI/inputs/CustomInput'
import type { B2BFormData } from './b2b/B2BOrderForm'
import type { B2CFormData } from './b2c/B2COrderForm'

type FormType = 'b2b' | 'b2c'

const PINCODE_REGEX = /^[1-9][0-9]{5}$/
const normalizePincode = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(0, 6)

const DeliveryDetailsForm = ({ type = 'b2c' }: { type?: FormType }) => {
  const isCompactB2B = type === 'b2b'
  const {
    control,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<B2CFormData | B2BFormData>()

  const pincode = watch('pincode')
  const [pinFetching, setPinFetching] = useState(false)

  useEffect(() => {
    const normalizedPincode = normalizePincode(pincode)

    if (pincode !== normalizedPincode) {
      setValue('pincode', normalizedPincode, { shouldDirty: true, shouldValidate: true })
      return
    }

    if (!normalizedPincode || normalizedPincode.length < 6) {
      clearErrors('pincode')
      setValue('city', '', { shouldValidate: true })
      setValue('state', '', { shouldValidate: true })
      return
    }

    if (!PINCODE_REGEX.test(normalizedPincode)) {
      setError('pincode', { type: 'manual', message: 'Enter a valid 6-digit pincode' })
      setValue('city', '', { shouldValidate: true })
      setValue('state', '', { shouldValidate: true })
      return
    }

    let isCurrentLookup = true

    const fetchPin = async () => {
      setPinFetching(true)
      try {
        const location = await lookupPincodeLocation(normalizedPincode)
        if (!isCurrentLookup) return

        if (!location) {
          setError('pincode', { type: 'manual', message: 'Invalid pincode' })
          setValue('city', '', { shouldValidate: true })
          setValue('state', '', { shouldValidate: true })
          return
        }

        clearErrors('pincode')
        setValue('city', location.city ?? '', { shouldDirty: true, shouldValidate: true })
        setValue('state', location.state ?? '', { shouldDirty: true, shouldValidate: true })
      } catch {
        if (!isCurrentLookup) return
        setError('pincode', { type: 'manual', message: 'PIN lookup failed' })
        setValue('city', '', { shouldValidate: true })
        setValue('state', '', { shouldValidate: true })
      } finally {
        if (isCurrentLookup) {
          setPinFetching(false)
        }
      }
    }

    fetchPin()

    return () => {
      isCurrentLookup = false
    }
  }, [pincode, setError, clearErrors, setValue])

  const fields =
    type === 'b2b'
      ? ([
          { name: 'companyName', label: 'Company Name' },
          { name: 'buyerPhone', label: 'Phone' },
          { name: 'buyerName', label: 'Name (Optional)' },
          { name: 'buyerEmail', label: 'Email' },
          { name: 'pincode', label: 'Pincode' },
          { name: 'city', label: 'City' },
          { name: 'state', label: 'State' },
          { name: 'gstin', label: 'GSTIN (Optional)' },
          { name: 'address', label: 'Address' },
        ] as const)
      : ([
          { name: 'buyerName', label: 'Name' },
          { name: 'buyerPhone', label: 'Phone' },
          { name: 'buyerEmail', label: 'Email' },
          { name: 'pincode', label: 'Pincode' },
          { name: 'city', label: 'City' },
          { name: 'state', label: 'State' },
          { name: 'address', label: 'Address' },
        ] as const)

  const getFieldError = (fieldName: string) => {
    return (errors as FieldErrors<B2CFormData & B2BFormData>)[
      fieldName as keyof (B2CFormData & B2BFormData)
    ]?.message
  }

  return (
    <Grid
      container
      columnSpacing={isCompactB2B ? 1.5 : 2}
      rowSpacing={isCompactB2B ? 1 : 2}
    >
      {fields.map((fieldItem) => {
        const isNonEditable = fieldItem.name === 'city' || fieldItem.name === 'state'
        const showLoader = fieldItem.name === 'pincode' ? pinFetching : false
        const isOptional =
          fieldItem.name === 'gstin' ||
          fieldItem.name === 'buyerEmail' ||
          (type === 'b2b' && fieldItem.name === 'buyerName')

        return (
          <Grid
            key={fieldItem.name}
            size={{
              xs: 12,
              md:
                fieldItem.name === 'address'
                  ? 12
                  : isCompactB2B && ['companyName', 'gstin'].includes(fieldItem.name)
                    ? 6
                    : 4,
            }}
          >
            <Controller
              name={fieldItem.name as keyof (B2CFormData & B2BFormData)}
              control={control}
              rules={{
                ...(!isOptional ? { required: `${fieldItem.label} is required` } : {}),
                ...(fieldItem.name === 'buyerPhone' && {
                  pattern: { value: /^[0-9]{10}$/, message: 'Enter valid 10-digit phone' },
                }),
                ...(fieldItem.name === 'pincode' && {
                  pattern: { value: PINCODE_REGEX, message: 'Enter valid 6-digit pincode' },
                }),
              }}
              render={({ field }) => (
                <CustomInput
                  label={fieldItem.label}
                  required={!isOptional}
                  {...field}
                  topMargin={!isCompactB2B}
                  multiline={fieldItem.name === 'address'}
                  rows={fieldItem.name === 'address' ? (isCompactB2B ? 1 : 2) : undefined}
                  maxLength={fieldItem.name === 'address' ? 200 : undefined}
                  disabled={isNonEditable}
                  error={!!getFieldError(fieldItem.name)}
                  helperText={getFieldError(fieldItem.name)}
                  postfix={showLoader ? <CircularProgress size={16} /> : null}
                />
              )}
            />
          </Grid>
        )
      })}
    </Grid>
  )
}

export default DeliveryDetailsForm

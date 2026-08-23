import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Controller, type FieldErrors, useFormContext } from 'react-hook-form'
import { lookupPincodeLocation } from '../../api/locations'
import CustomInput from '../UI/inputs/CustomInput'
import type { B2BFormData } from './b2b/B2BOrderForm'
import type { B2CFormData } from './b2c/B2COrderForm'

type FormType = 'b2b' | 'b2c'

const PINCODE_REGEX = /^[1-9][0-9]{5}$/
const normalizePincode = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(0, 6)
const SAVED_DELIVERY_ADDRESSES_KEY = 'fastship.savedDeliveryAddresses.v1'

type DeliveryFieldName = keyof (B2CFormData & B2BFormData)

type SavedDeliveryAddress = {
  id: string
  type: FormType
  label: string
  companyName?: string
  buyerName?: string
  buyerPhone?: string
  buyerEmail?: string
  gstin?: string
  address?: string
  pincode?: string
  city?: string
  state?: string
}

const readSavedDeliveryAddresses = (): SavedDeliveryAddress[] => {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_DELIVERY_ADDRESSES_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeSavedDeliveryAddresses = (addresses: SavedDeliveryAddress[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVED_DELIVERY_ADDRESSES_KEY, JSON.stringify(addresses.slice(0, 30)))
}

const compactAddressLine = (address: SavedDeliveryAddress) =>
  [address.address, address.city, address.state, address.pincode].filter(Boolean).join(', ')

const buildAddressLabel = (address: SavedDeliveryAddress) =>
  String(address.companyName || address.buyerName || address.buyerPhone || compactAddressLine(address) || 'Saved address')

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
  const companyName = watch('companyName' as DeliveryFieldName) as string | undefined
  const buyerName = watch('buyerName') as string | undefined
  const buyerPhone = watch('buyerPhone') as string | undefined
  const buyerEmail = watch('buyerEmail') as string | undefined
  const gstin = watch('gstin' as DeliveryFieldName) as string | undefined
  const address = watch('address') as string | undefined
  const city = watch('city') as string | undefined
  const state = watch('state') as string | undefined
  const [pinFetching, setPinFetching] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedDeliveryAddress[]>([])
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<SavedDeliveryAddress | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setSavedAddresses(readSavedDeliveryAddresses())
  }, [])

  useEffect(() => {
    const normalizedPincode = normalizePincode(pincode)

    if (pincode !== normalizedPincode) {
      setValue('pincode', normalizedPincode, {
        shouldDirty: Boolean(normalizedPincode),
        shouldValidate: Boolean(normalizedPincode),
      })
      return
    }

    if (!normalizedPincode || normalizedPincode.length < 6) {
      clearErrors(['pincode', 'city', 'state'])
      setValue('city', '', { shouldDirty: false, shouldValidate: false })
      setValue('state', '', { shouldDirty: false, shouldValidate: false })
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
          { name: 'gstin', label: 'GSTIN (Optional)' },
          { name: 'address', label: 'Address' },
          { name: 'pincode', label: 'Pincode' },
          { name: 'city', label: 'City' },
          { name: 'state', label: 'State' },
        ] as const)
      : ([
          { name: 'buyerName', label: 'Name' },
          { name: 'buyerPhone', label: 'Phone' },
          { name: 'buyerEmail', label: 'Email' },
          { name: 'address', label: 'Address' },
          { name: 'pincode', label: 'Pincode' },
          { name: 'city', label: 'City' },
          { name: 'state', label: 'State' },
        ] as const)

  const getFieldError = (fieldName: string) => {
    return (errors as FieldErrors<B2CFormData & B2BFormData>)[
      fieldName as keyof (B2CFormData & B2BFormData)
    ]?.message
  }

  const savedAddressOptions = useMemo(
    () => savedAddresses.filter((savedAddress) => savedAddress.type === type),
    [savedAddresses, type],
  )

  const currentAddress = useMemo<SavedDeliveryAddress>(
    () => ({
      id: '',
      type,
      label: '',
      companyName: String(companyName || '').trim(),
      buyerName: String(buyerName || '').trim(),
      buyerPhone: String(buyerPhone || '').trim(),
      buyerEmail: String(buyerEmail || '').trim(),
      gstin: String(gstin || '').trim(),
      address: String(address || '').trim(),
      pincode: normalizePincode(pincode),
      city: String(city || '').trim(),
      state: String(state || '').trim(),
    }),
    [address, buyerEmail, buyerName, buyerPhone, city, companyName, gstin, pincode, state, type],
  )

  const canSaveAddress = Boolean(
    currentAddress.address &&
      currentAddress.pincode &&
      currentAddress.pincode.length === 6 &&
      currentAddress.city &&
      currentAddress.state &&
      currentAddress.buyerPhone &&
      (type === 'b2b' ? currentAddress.companyName || currentAddress.buyerName : currentAddress.buyerName),
  )

  const applySavedAddress = (savedAddress: SavedDeliveryAddress | null) => {
    setSelectedSavedAddress(savedAddress)
    if (!savedAddress) return

    const fieldsToApply: Array<keyof SavedDeliveryAddress> = [
      'buyerName',
      'buyerPhone',
      'buyerEmail',
      'address',
      'pincode',
      'city',
      'state',
    ]

    fieldsToApply.forEach((fieldName) => {
      setValue(fieldName as DeliveryFieldName, String(savedAddress[fieldName] || ''), {
        shouldDirty: true,
        shouldValidate: true,
      })
    })

    if (type === 'b2b') {
      setValue('companyName' as DeliveryFieldName, savedAddress.companyName || '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      setValue('gstin' as DeliveryFieldName, savedAddress.gstin || '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    setSaveMessage('Saved delivery address applied.')
  }

  const handleSaveAddress = () => {
    if (!canSaveAddress) {
      setSaveMessage('Fill name/company, phone, address, pincode, city and state to save.')
      return
    }

    const allSavedAddresses = readSavedDeliveryAddresses()
    const duplicateKey = [
      type,
      currentAddress.buyerPhone,
      currentAddress.pincode,
      currentAddress.address?.toLowerCase(),
    ].join('|')
    const nextAddress: SavedDeliveryAddress = {
      ...currentAddress,
      id: duplicateKey || `${type}-${Date.now()}`,
      label: buildAddressLabel(currentAddress),
    }
    const nextSavedAddresses = [
      nextAddress,
      ...allSavedAddresses.filter((savedAddress) => {
        const savedKey = [
          savedAddress.type,
          savedAddress.buyerPhone,
          savedAddress.pincode,
          savedAddress.address?.toLowerCase(),
        ].join('|')
        return savedKey !== duplicateKey
      }),
    ]

    writeSavedDeliveryAddresses(nextSavedAddresses)
    setSavedAddresses(nextSavedAddresses)
    setSelectedSavedAddress(nextAddress)
    setSaveMessage('Delivery address saved. You can reuse it next time.')
  }

  return (
    <Grid
      container
      columnSpacing={isCompactB2B ? 1.5 : 2}
      rowSpacing={isCompactB2B ? 1 : 2}
    >
      <Grid size={12}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.2}
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
        >
          <Autocomplete
            size="small"
            fullWidth
            options={savedAddressOptions}
            value={selectedSavedAddress}
            onChange={(_, value) => applySavedAddress(value)}
            getOptionLabel={(option) => option.label || buildAddressLabel(option)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No saved delivery address"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Saved Delivery Address"
                placeholder="Select saved address"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                    {option.label || buildAddressLabel(option)}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {compactAddressLine(option) || option.buyerPhone || '-'}
                  </Typography>
                </Box>
              </Box>
            )}
          />
          <Button
            variant="outlined"
            onClick={handleSaveAddress}
            sx={{
              minHeight: 40,
              px: 2,
              borderRadius: '10px',
              whiteSpace: 'nowrap',
              fontWeight: 800,
            }}
          >
            Save Address
          </Button>
        </Stack>
        {saveMessage ? (
          <Typography sx={{ mt: 0.7, color: canSaveAddress ? 'success.main' : 'text.secondary', fontSize: 12 }}>
            {saveMessage}
          </Typography>
        ) : null}
      </Grid>
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

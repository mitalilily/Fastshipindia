import {
  alpha,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { BiCheckCircle } from 'react-icons/bi'
import { FiPlus } from 'react-icons/fi'
import { usePickupAddresses } from '../../hooks/Pickup/usePickupAddresses'
import { useInvoicePreferences } from '../../hooks/User/useInvoicePreferences'
import type { HydratedPickup } from '../../types/generic.types'
import type { B2BFormData } from './b2b/B2BOrderForm'
import type { B2CFormData } from './b2c/B2COrderForm'
import CustomDrawer from '../UI/drawer/CustomDrawer'
import AddPickupAddressForm from '../pickups/AddPickupAddressForm'

const ACCENT = '#0D3B8E'
const TEXT_PRIMARY = '#102A54'
const padDatePart = (value: number) => String(value).padStart(2, '0')
const getLocalDateInputValue = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

const normalizeTaxInput = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

const getPickupLabel = (loc: HydratedPickup | null) =>
  String(loc?.pickup?.addressNickname || loc?.pickup?.contactName || loc?.pickupId || '').trim()

const getPickupDescription = (loc: HydratedPickup) =>
  [
    loc.pickup?.addressLine1,
    loc.pickup?.addressLine2,
    loc.pickup?.city,
    loc.pickup?.state,
    loc.pickup?.pincode,
  ]
    .filter(Boolean)
    .join(', ')

const PickupLocationForm = ({ shipmentType = 'b2c' }: { shipmentType?: 'b2b' | 'b2c' }) => {
  const { control, setValue, watch } = useFormContext<B2BFormData | B2CFormData>()
  const {
    data: locations,
    isLoading,
    isError,
  } = usePickupAddresses({ isPickupEnabled: 'active' as unknown as boolean })
  const { preferences } = useInvoicePreferences()

  const [openRto, setOpenRto] = useState<Record<string, boolean>>({})
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)

  const pickupDate = watch('pickupDate') as string | undefined
  const pickupTime = watch('pickupTime') as string | undefined
  const billingPanNumber = watch('billingPanNumber' as any) as string | undefined
  const billingGstin = watch('billingGstin' as any) as string | undefined

  const toggleRto = (id: string) => {
    setOpenRto((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const applyPickupLocation = (loc: HydratedPickup, onChange?: (value: string) => void) => {
    onChange?.(loc.pickupId)
    setValue('pickupLocationId', loc.pickupId)
    setValue('pickupLocationPincode', loc.pickup?.pincode)
    setValue('pickupLocationName', loc.pickup?.addressNickname)
    setValue('pickupLocationPOCName', loc.pickup?.contactName)
    setValue('pickupLocationPOCPhone', loc.pickup?.contactPhone)
    setValue('pickupAddress', loc.pickup?.addressLine1)
    setValue('pickupCity', loc.pickup?.city)
    setValue('pickupState', loc.pickup?.state)

    const pickupGst = normalizeTaxInput(
      (loc.pickup as any)?.gstNumber || (loc.pickup as any)?.gst_number,
    )
    if (shipmentType === 'b2b' && !normalizeTaxInput(billingGstin) && pickupGst) {
      setValue('billingGstin' as any, pickupGst, { shouldValidate: true })
    }

    if (loc.isRTOSame) {
      setValue('isRtoSame', true)
      setValue('rtoLocationPincode', loc.pickup?.pincode)
      setValue('rtoLocationName', loc.pickup?.addressNickname)
      setValue('rtoLocationPOCName', loc.pickup?.contactName)
      setValue('rtoLocationPOCPhone', loc.pickup?.contactPhone)
      setValue('rtoAddress', loc.pickup?.addressLine1)
      setValue('rtoCity', loc.pickup?.city)
      setValue('rtoState', loc.pickup?.state)
    } else if (loc.rto) {
      setValue('isRtoSame', false)
      setValue('rtoLocationPincode', loc.rto?.pincode)
      setValue('rtoLocationName', loc.rto?.addressNickname)
      setValue('rtoLocationPOCName', loc.rto?.contactName)
      setValue('rtoLocationPOCPhone', loc.rto?.contactPhone)
      setValue('rtoAddress', loc.rto?.addressLine1)
      setValue('rtoCity', loc.rto?.city)
      setValue('rtoState', loc.rto?.state)
    } else {
      setValue('isRtoSame', false)
      setValue('rtoLocationPincode', '')
      setValue('rtoLocationName', '')
      setValue('rtoLocationPOCName', '')
      setValue('rtoLocationPOCPhone', '')
      setValue('rtoAddress', '')
      setValue('rtoCity', '')
      setValue('rtoState', '')
    }
  }

  const primaryLocation = locations?.pickupAddresses?.find((l) => l.isPrimary)

  useEffect(() => {
    if (!pickupDate) {
      setValue('pickupDate', getLocalDateInputValue())
    }
    if (!pickupTime) {
      setValue('pickupTime', '10:00')
    }
  }, [pickupDate, pickupTime, setValue])

  useEffect(() => {
    if (primaryLocation) {
      setValue('pickupLocationId', primaryLocation?.pickupId)
      setValue('pickupLocationPincode', primaryLocation.pickup?.pincode)
      setValue('pickupLocationName', primaryLocation.pickup?.addressNickname)
      setValue('pickupLocationPOCName', primaryLocation.pickup?.contactName)
      setValue('pickupLocationPOCPhone', primaryLocation.pickup?.contactPhone)
      setValue('pickupAddress', primaryLocation.pickup?.addressLine1)
      setValue('pickupCity', primaryLocation.pickup?.city)
      setValue('pickupState', primaryLocation.pickup?.state)
      const primaryPickupGst = normalizeTaxInput(
        (primaryLocation.pickup as any)?.gstNumber || (primaryLocation.pickup as any)?.gst_number,
      )
      if (shipmentType === 'b2b' && !normalizeTaxInput(billingGstin) && primaryPickupGst) {
        setValue('billingGstin' as any, primaryPickupGst, { shouldValidate: true })
      }

      if (primaryLocation?.isRTOSame) {
        setValue('isRtoSame', true)
        setValue('rtoLocationPincode', primaryLocation.pickup?.pincode)
        setValue('rtoLocationName', primaryLocation.pickup?.addressNickname)
        setValue('rtoLocationPOCName', primaryLocation.pickup?.contactName)
        setValue('rtoLocationPOCPhone', primaryLocation.pickup?.contactPhone)
        setValue('rtoAddress', primaryLocation.pickup?.addressLine1)
        setValue('rtoCity', primaryLocation.pickup?.city)
        setValue('rtoState', primaryLocation.pickup?.state)
      } else if (primaryLocation?.rto) {
        setValue('isRtoSame', false)
        setValue('rtoLocationPincode', primaryLocation?.rto?.pincode)
        setValue('rtoLocationName', primaryLocation.rto?.addressNickname)
        setValue('rtoLocationPOCName', primaryLocation?.rto?.contactName)
        setValue('rtoLocationPOCPhone', primaryLocation?.rto?.contactPhone)
        setValue('rtoAddress', primaryLocation?.rto?.addressLine1)
        setValue('rtoCity', primaryLocation?.rto?.city)
        setValue('rtoState', primaryLocation?.rto?.state)
      } else {
        setValue('isRtoSame', false)
        setValue('rtoLocationPincode', '')
        setValue('rtoLocationName', '')
        setValue('rtoLocationPOCName', '')
        setValue('rtoLocationPOCPhone', '')
        setValue('rtoAddress', '')
        setValue('rtoCity', '')
        setValue('rtoState', '')
      }
    }
  }, [billingGstin, primaryLocation, setValue, shipmentType])

  useEffect(() => {
    if (shipmentType !== 'b2b') return

    const savedPan = normalizeTaxInput(preferences?.panNumber)
    const savedGstin = normalizeTaxInput(preferences?.gstNumber)
    if (!normalizeTaxInput(billingPanNumber) && savedPan) {
      setValue('billingPanNumber' as any, savedPan, { shouldValidate: true })
    }
    if (!normalizeTaxInput(billingGstin) && savedGstin) {
      setValue('billingGstin' as any, savedGstin, { shouldValidate: true })
    }
  }, [
    billingGstin,
    billingPanNumber,
    preferences?.gstNumber,
    preferences?.panNumber,
    setValue,
    shipmentType,
  ])

  const addAddressDrawer = (
    <CustomDrawer
      open={addDrawerOpen}
      onClose={() => setAddDrawerOpen(false)}
      width="clamp(360px, 92vw, 1100px)"
      title="Add New Pickup Address"
      showBackButton
      backLabel="Back to order"
    >
      <AddPickupAddressForm setDrawer={setAddDrawerOpen} />
    </CustomDrawer>
  )

  if (isLoading) return <Typography>Loading pickup locations...</Typography>
  if (isError) return <Typography color="error">Failed to load pickup locations</Typography>
  if (!locations?.pickupAddresses || locations.pickupAddresses.length === 0)
    return (
      <>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: 2,
            borderColor: alpha(ACCENT, 0.18),
            bgcolor: alpha(ACCENT, 0.025),
          }}
        >
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ color: TEXT_PRIMARY, fontWeight: 800 }}>
              No pickup address added yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a pickup warehouse here. Your order details will stay on this step.
            </Typography>
            <Button
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => setAddDrawerOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Add Pickup Address
            </Button>
          </Stack>
        </Paper>
        {addAddressDrawer}
      </>
    )

  return (
    <Controller
      name="pickupLocationId"
      control={control}
      rules={{ required: 'Please select a pickup location' }}
      render={({ field, fieldState }) => (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid size={12}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
              >
                <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                  <Typography sx={{ color: TEXT_PRIMARY, fontWeight: 800 }}>
                    Select Pickup Address
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Need a different pickup warehouse? Add it here without leaving this order.
                  </Typography>
                  <Autocomplete
                    options={locations.pickupAddresses}
                    value={
                      locations.pickupAddresses.find((loc) => loc.pickupId === field.value) ?? null
                    }
                    onChange={(_, value) => {
                      if (value) {
                        applyPickupLocation(value, field.onChange)
                      }
                    }}
                    getOptionLabel={getPickupLabel}
                    isOptionEqualToValue={(option, value) => option.pickupId === value.pickupId}
                    noOptionsText="No pickup address found"
                    sx={{ mt: 1.4, maxWidth: 760 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Pickup Address"
                        placeholder="Select address"
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            minHeight: 48,
                            borderRadius: '10px',
                            bgcolor: '#FFFFFF',
                            '&.Mui-focused fieldset': {
                              borderColor: ACCENT,
                              boxShadow: `0 0 0 3px ${alpha(ACCENT, 0.09)}`,
                            },
                          },
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.pickupId}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                            {getPickupLabel(option)}
                          </Typography>
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }} noWrap>
                            {getPickupDescription(option)}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                </Box>
                <Button
                  variant="contained"
                  startIcon={<FiPlus />}
                  onClick={() => setAddDrawerOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    bgcolor: ACCENT,
                    '&:hover': { bgcolor: '#082f72' },
                  }}
                >
                  Add Pickup Address
                </Button>
              </Stack>
            </Grid>

            {locations.pickupAddresses.map((loc) => {
            const isSelected = field.value === loc.pickupId
            const isOpen = openRto[loc.id] || false
            const pickupGst = normalizeTaxInput(
              (loc.pickup as any)?.gstNumber || (loc.pickup as any)?.gst_number,
            )

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={loc.id} display="flex">
                <Paper
                  onClick={() => {
                    field.onChange(loc?.pickupId)

                    // 🔹 Update pickup fields
                    setValue('pickupLocationPincode', loc?.pickup?.pincode)
                    setValue('pickupLocationName', loc?.pickup?.addressNickname)
                    setValue('pickupLocationPOCName', loc?.pickup?.contactName)
                    setValue('pickupLocationPOCPhone', loc?.pickup?.contactPhone)
                    setValue('pickupAddress', loc?.pickup?.addressLine1)
                    setValue('pickupCity', loc?.pickup?.city)
                    setValue('pickupState', loc?.pickup?.state)
                    if (shipmentType === 'b2b' && !normalizeTaxInput(billingGstin) && pickupGst) {
                      setValue('billingGstin' as any, pickupGst, { shouldValidate: true })
                    }

                    // 🔹 Update RTO fields
                    if (loc?.isRTOSame) {
                      setValue('isRtoSame', true)
                      setValue('rtoLocationPincode', loc?.pickup?.pincode)
                      setValue('rtoLocationName', loc?.pickup?.addressNickname)
                      setValue('rtoLocationPOCName', loc?.pickup?.contactName)
                      setValue('rtoLocationPOCPhone', loc?.pickup?.contactPhone)
                      setValue('rtoAddress', loc?.pickup?.addressLine1)
                      setValue('rtoCity', loc?.pickup?.city)
                      setValue('rtoState', loc?.pickup?.state)
                    } else if (loc?.rto) {
                      setValue('isRtoSame', false)
                      setValue('rtoLocationPincode', loc?.rto?.pincode)
                      setValue('rtoLocationName', loc.rto?.addressNickname)
                      setValue('rtoLocationPOCName', loc?.rto?.contactName)
                      setValue('rtoLocationPOCPhone', loc?.rto?.contactPhone)
                      setValue('rtoAddress', loc?.rto?.addressLine1)
                      setValue('rtoCity', loc?.rto?.city)
                      setValue('rtoState', loc?.rto?.state)
                    } else {
                      setValue('isRtoSame', false)
                      setValue('rtoLocationPincode', '')
                      setValue('rtoLocationName', '')
                      setValue('rtoLocationPOCName', '')
                      setValue('rtoLocationPOCPhone', '')
                      setValue('rtoAddress', '')
                      setValue('rtoCity', '')
                      setValue('rtoState', '')
                    }
                  }}
                  sx={{
                    p: 2.5,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'pointer',
                    border: isSelected
                      ? `2px solid ${alpha(ACCENT, 0.55)}`
                      : `1px solid ${alpha(ACCENT, 0.2)}`,
                    borderRadius: 3,
                    bgcolor: isSelected ? alpha(ACCENT, 0.06) : '#ffffff',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Pickup info */}
                  <Stack spacing={0.5} mb={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: TEXT_PRIMARY }}>
                        {loc.pickup?.addressNickname}
                      </Typography>
                      {loc.isPrimary && (
                        <Chip
                          label="Primary"
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: alpha(ACCENT, 0.35),
                            color: ACCENT,
                            bgcolor: alpha(ACCENT, 0.03),
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2">{loc.pickup?.addressLine1}</Typography>
                    {loc.pickup?.addressLine2 && (
                      <Typography variant="body2">{loc.pickup?.addressLine2}</Typography>
                    )}
                    <Typography variant="body2">
                      {loc.pickup?.city}, {loc.pickup?.state} - {loc.pickup?.pincode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {loc.pickup?.contactName} • {loc.pickup?.contactPhone}
                    </Typography>
                  </Stack>

                  {/* Divider */}
                  <Divider sx={{ my: 1 }} />

                  {/* RTO section */}
                  {loc.isRTOSame ? (
                    <Chip
                      label="RTO same as pickup"
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: alpha(ACCENT, 0.32), color: ACCENT }}
                    />
                  ) : loc.rto ? (
                    <>
                      <Button
                        size="small"
                        variant="text"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRto(loc.id)
                        }}
                        sx={{
                          alignSelf: 'flex-start',
                          textTransform: 'none',
                          fontSize: 13,
                          color: ACCENT,
                        }}
                      >
                        {isOpen ? 'Hide RTO details' : 'Show RTO details'}
                      </Button>
                      <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <Stack spacing={0.5} mt={1}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {loc.rto?.addressNickname}
                          </Typography>
                          <Typography variant="body2">{loc.rto?.addressLine1}</Typography>
                          {loc.rto?.addressLine2 && (
                            <Typography variant="body2">{loc.rto?.addressLine2}</Typography>
                          )}
                          <Typography variant="body2">
                            {loc.rto?.city}, {loc.rto?.state} - {loc.rto?.pincode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {loc.rto?.contactName} • {loc.rto?.contactPhone}
                          </Typography>
                        </Stack>
                      </Collapse>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No RTO address set
                    </Typography>
                  )}

                  {isSelected && (
                    <BiCheckCircle
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 22,
                        color: ACCENT,
                      }}
                    />
                  )}
                </Paper>
              </Grid>
            )
          })}
            {fieldState.error && (
              <Grid size={12}>
                <Typography color="error" fontSize={12}>
                  {fieldState.error.message}
                </Typography>
              </Grid>
            )}
          </Grid>
          {addAddressDrawer}
        </>
      )}
    />
  )
}

export default PickupLocationForm

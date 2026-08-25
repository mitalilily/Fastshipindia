import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FaBox, FaFileInvoice, FaTruck, FaUser } from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CreateB2BShipmentParams } from '../../../api/order.service'
import { useCreateB2BShipment } from '../../../hooks/Orders/useOrders'
import { usePaymentOptions } from '../../../hooks/usePaymentOptions'
import { b2bBoxWeightInputToKg } from '../../../utils/b2bWeight'
import FormSectionAccordion from '../../UI/accordion/FormSectionAccordion'
import BookingReviewSummary from '../BookingReviewSummary'
import DeliveryDetailsForm from '../DeliveryDetailsForm'
import OrderDetailsForm from '../OrderDetailsForm'
import PickupLocationForm from '../PickupLocationForm'
import { SelectCourierForm } from '../SelectCourierForm'
import { toast } from '../../UI/Toast'
import B2BInvoicesForm from './B2BInvoicesForm'
import B2BProductsForm from './B2BProductsForm'

const padDatePart = (value: number) => String(value).padStart(2, '0')
const getTodayDate = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

// Box structure - top level array
export type Box = {
  quantity: number
  lengthCm: number
  breadthCm: number
  heightCm: number
  weightKg: number
}

export type Product = {
  productName: string
  quantity: number
  unitPrice: number
}

// Invoice structure - array of invoices
export type Invoice = {
  invoiceNumber: string
  invoiceDate: string
  invoiceValue: number
  invoiceFileUrl?: string
}

// Main Form Data
export type B2BFormData = {
  // Buyer details
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  address: string
  pincode: string
  companyName: string
  gstin?: string
  city: string
  state: string
  country: string

  // Boxes array (top level)
  boxes: Box[]

  // Products included in the shipment
  products: Product[]

  // Invoices array
  invoices: Invoice[]

  // Shipment package info (optional if using boxes)
  weight?: number
  length?: number
  breadth?: number
  height?: number

  // Order details
  orderId: string
  orderDate: string
  orderType: 'prepaid' | 'cod'
  orderAmount: number

  // Courier details
  courierPartner: string
  courierPartnerId: string
  courierOptionKey?: string
  selectedMaxSlabWeight?: number | null
  shippingCharges?: number
  transactionFee?: number
  giftWrap?: number
  discount?: number
  prepaidAmount?: number
  courierCod?: number
  courierCost?: number | null // Estimated courier cost from serviceability (what platform pays courier)
  forwardCharges?: number
  otherCharges?: number
  chargeableWeight?: number | null
  volumetricWeight?: number | null
  slabs?: number | null
  integrationType?: 'delhivery' | 'bigship' | 'shipmozo'
  shippingMode?: string

  // Pickup location (optional)
  pickupLocationId?: string
  pickupLocationPincode?: string
  pickupLocationName?: string
  pickupAddress?: string
  pickupLocationPOCName?: string
  pickupLocationPOCPhone?: string
  pickupCity?: string
  pickupState?: string
  pickupDate?: string
  pickupTime?: string
  billingPanNumber?: string
  billingGstin?: string

  // RTO location (for B2B, typically same as pickup)
  isRtoSame?: boolean
  rtoLocationPincode?: string
  rtoLocationName?: string
  rtoAddress?: string
  rtoLocationPOCName?: string
  rtoLocationPOCPhone?: string
  rtoCity?: string
  rtoState?: string

  // Insurance
  isInsurance?: boolean
  zone?: string
  zoneId?: string
}

export default function B2BOrderForm({ onClose }: { onClose?: () => void }) {
  const createShipmentMutation = useCreateB2BShipment(onClose)
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(0)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [stepError, setStepError] = useState('')
  const steps = ['Order & Delivery', 'Pickup & Review', 'Courier Selection']
  const { data: paymentOptions } = usePaymentOptions()

  // Determine default order type based on enabled payment options
  const getDefaultOrderType = (): 'prepaid' | 'cod' => {
    if (!paymentOptions) return 'prepaid' // Default fallback
    if (paymentOptions.prepaidEnabled) return 'prepaid'
    if (paymentOptions.codEnabled) return 'cod'
    return 'prepaid' // Final fallback
  }

  const methods = useForm<B2BFormData>({
    defaultValues: {
      boxes: [
        {
          quantity: 1,
          lengthCm: 0,
          breadthCm: 0,
          heightCm: 0,
          weightKg: 0,
        },
      ],
      products: [
        {
          productName: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      invoices: [
        {
          invoiceNumber: '',
          invoiceDate: getTodayDate(),
          invoiceValue: 0,
          invoiceFileUrl: '',
        },
      ],
      weight: 0,
      length: 0,
      breadth: 0,
      height: 0,
      orderType: getDefaultOrderType(),
    },
  })

  const {
    watch,
    setValue,
    handleSubmit,
    trigger,
    getFieldState,
    setFocus,
    getValues,
  } = methods

  const transactionFee = Number(watch('transactionFee') || 0)
  const discount = Number(watch('discount') || 0)
  const prepaidAmount = Number(watch('prepaidAmount') || 0)
  const orderType = watch('orderType')
  const selectedCourierPartnerId = watch('courierPartnerId')
  const rateInputSignature = JSON.stringify({
    buyerPincode: watch('pincode'),
    pickupPincode: watch('pickupLocationPincode'),
    orderType,
    transactionFee,
    discount,
    prepaidAmount,
    weight: watch('weight'),
    boxes: watch('boxes'),
    invoices: watch('invoices'),
    products: watch('products'),
  })
  const previousRateInputSignature = useRef('')

  // Ensure orderType is valid based on payment options
  useEffect(() => {
    if (paymentOptions && orderType) {
      const isCurrentTypeEnabled =
        (orderType === 'cod' && paymentOptions.codEnabled) ||
        (orderType === 'prepaid' && paymentOptions.prepaidEnabled)

      if (!isCurrentTypeEnabled) {
        const newOrderType = paymentOptions.prepaidEnabled
          ? 'prepaid'
          : paymentOptions.codEnabled
          ? 'cod'
          : 'prepaid'
        setValue('orderType', newOrderType)
      }
    }
  }, [paymentOptions, orderType, setValue])

  // Calculate subtotal from invoices
  const subtotal = (watch('invoices') || []).reduce(
    (sum, invoice) => sum + Number(invoice.invoiceValue || 0),
    0,
  )

  const totalOrderValue = subtotal + transactionFee - discount
  const totalCollectable = totalOrderValue - prepaidAmount
  const getPackageSummary = (boxes: Box[] = [], totalWeight?: number) => {
    const validBoxes = boxes.filter(Boolean)
    const calculatedWeight = validBoxes.reduce(
      (sum, box) =>
        sum + b2bBoxWeightInputToKg(box.weightKg) * Math.max(1, Number(box.quantity || 1)),
      0,
    )
    const enteredWeight = Number(totalWeight || 0)

    return {
      packageWeight: enteredWeight > 0 ? enteredWeight : calculatedWeight,
      packageLength: Math.max(0, ...validBoxes.map((box) => Number(box.lengthCm || 0))),
      packageBreadth: Math.max(0, ...validBoxes.map((box) => Number(box.breadthCm || 0))),
      packageHeight: Math.max(0, ...validBoxes.map((box) => Number(box.heightCm || 0))),
    }
  }

  const onSubmit = async (data: B2BFormData) => {
    try {
      const normalizedOrderId = data.orderId.trim()

      if (!normalizedOrderId) {
        methods.setError('orderId', {
          type: 'manual',
          message: 'Order ID is required',
        })
        return
      }

      const packageSummary = getPackageSummary(data.boxes, data.weight)
      const billingPanNumber = String(data.billingPanNumber || '').trim().toUpperCase()
      const billingGstin = String(data.billingGstin || '').trim().toUpperCase()

      // Prepare B2B shipment payload
      const payload: CreateB2BShipmentParams = {
        order_number: normalizedOrderId,
        order_date: data.orderDate,
        payment_type: data.orderType,
        order_amount: totalCollectable,
        package_weight: packageSummary.packageWeight,
        package_length: packageSummary.packageLength,
        package_breadth: packageSummary.packageBreadth,
        package_height: packageSummary.packageHeight,
        shipping_charges: 0,
        freight_charges: data.forwardCharges ?? 0, // What platform charges seller (based on rate card)
        courier_cost: data.courierCost ? Number(data.courierCost) : undefined, // Estimated courier cost from serviceability (what platform pays courier)
        transaction_fee: data.transactionFee ?? 0,
        discount: data.discount ?? 0,
        gift_wrap: 0,
        prepaid_amount: data.prepaidAmount ?? 0,
        consignee: {
          name: data.buyerName?.trim() || data.companyName,
          phone: data.buyerPhone,
          email: data.buyerEmail,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          company_name: data.companyName,
          gstin: data.gstin,
        },

        pickup: {
          warehouse_name: data.pickupLocationName ?? '',
          address: data.pickupAddress ?? '',
          name: data.pickupLocationPOCName ?? '',
          city: data.pickupCity ?? '',
          state: data.pickupState ?? '',
          pincode: data.pickupLocationPincode ?? data.pincode,
          phone: data.pickupLocationPOCPhone ?? data.buyerPhone,
        },
        pickup_location_id: data.pickupLocationId,
        billing_address: {
          name: data.pickupLocationPOCName || data.pickupLocationName || 'Seller',
          company: data.pickupLocationName || data.companyName || 'Seller',
          consignor: data.pickupLocationName || data.companyName || 'Seller',
          address: data.pickupAddress || '',
          city: data.pickupCity || '',
          state: data.pickupState || '',
          pin: data.pickupLocationPincode || '',
          phone: data.pickupLocationPOCPhone || data.buyerPhone,
          ...(billingPanNumber ? { pan_number: billingPanNumber, pan: billingPanNumber } : {}),
          ...(billingGstin ? { gst_number: billingGstin, gstin: billingGstin } : {}),
        },
        // Boxes array
        boxes:
          data?.boxes?.map((box) => ({
            quantity: Math.max(1, Math.floor(Number(box.quantity || 1))),
            box_count: Math.max(1, Math.floor(Number(box.quantity || 1))),
            lengthCm: Number(box.lengthCm || 0),
            breadthCm: Number(box.breadthCm || 0),
            heightCm: Number(box.heightCm || 0),
            weightKg: b2bBoxWeightInputToKg(box.weightKg),
          })) ?? [],

        order_items:
          data?.products?.map((product, index) => ({
            name: product.productName.trim(),
            sku: `PRODUCT-${index + 1}`,
            qty: Number(product.quantity || 0),
            quantity: Number(product.quantity || 0),
            price: Number(product.unitPrice || 0),
            hsn: '',
            discount: 0,
            tax_rate: 0,
          })) ?? [],

        // Invoices array
        invoices:
          data?.invoices?.map((invoice) => ({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            invoiceValue: Number(invoice.invoiceValue || 0),
            invoiceFileUrl: invoice.invoiceFileUrl || undefined,
          })) ?? [],
        courier_id: Number(data.courierPartnerId),
        courier_partner: data.courierPartner,
        integration_type: data.integrationType || 'delhivery',
        is_insurance: !!data.isInsurance,
        is_rto_different: data.isRtoSame === false ? 'yes' : 'no',
        request_auto_pickup: 'no',
        tags: '',
        delivery_location: data.zone,
        zone_id: data.zoneId,
      }

      // Add RTO details if RTO is different from pickup
      if (data.isRtoSame === false && data.rtoLocationPincode) {
        payload.rto = {
          warehouse_name: data.rtoLocationName ?? '',
          name: data.rtoLocationPOCName ?? '',
          address: data.rtoAddress ?? '',
          city: data.rtoCity ?? '',
          state: data.rtoState ?? '',
          pincode: data.rtoLocationPincode ?? '',
          phone: data.rtoLocationPOCPhone ?? data.buyerPhone,
        }
      }

      // Add pickup date/time if provided
      if (data.pickupDate) {
        payload.pickup_date = data.pickupDate
      }
      if (data.pickupTime) {
        payload.pickup_time = data.pickupTime
      }

      console.log('B2B Shipment Payload:', payload)

      // Call the mutation
      createShipmentMutation.mutate(payload, {
        onSuccess: () => {
          if (location.pathname === '/orders/create') {
            navigate('/orders/list')
          }
        },
      })
    } catch (error) {
      console.error('Error preparing B2B shipment payload:', error)
    }
  }

  const getStepFields = () => {
    if (currentStep === 0) {
      const values = getValues()
      const productFields =
        values.products?.flatMap((_, index) => [
          `products.${index}.productName`,
          `products.${index}.quantity`,
          `products.${index}.unitPrice`,
        ]) ?? []
      const invoiceFields =
        values.invoices?.flatMap((_, index) => [
          `invoices.${index}.invoiceNumber`,
          `invoices.${index}.invoiceDate`,
          `invoices.${index}.invoiceValue`,
          `invoices.${index}.ebnNumber`,
          `invoices.${index}.ebnExpiry`,
        ]) ?? []
      const boxFields =
        values.boxes?.flatMap((_, index) => [
          `boxes.${index}.quantity`,
          `boxes.${index}.lengthCm`,
          `boxes.${index}.breadthCm`,
          `boxes.${index}.heightCm`,
          `boxes.${index}.weightKg`,
        ]) ?? []

      return [
        'orderId',
        'orderDate',
        'orderType',
        'companyName',
        'buyerPhone',
        'pincode',
        'city',
        'state',
        'address',
        'weight',
        ...productFields,
        ...invoiceFields,
        ...boxFields,
      ]
    }

    if (currentStep === 1) {
      return [
        'pickupLocationId',
        'pickupLocationPincode',
        'pickupLocationName',
        'pickupLocationPOCName',
        'pickupLocationPOCPhone',
        'pickupAddress',
        'pickupCity',
        'pickupState',
      ]
    }

    return ['courierPartnerId']
  }

  const getFieldLabel = (field: string) => {
    if (field.includes('.productName')) return 'Product name'
    if (field.includes('.quantity') && field.includes('boxes.')) return 'No. of boxes'
    if (field.includes('.quantity')) return 'Product quantity'
    if (field.includes('.unitPrice')) return 'Product price'
    if (field.includes('.invoiceNumber')) return 'Invoice number'
    if (field.includes('.invoiceDate')) return 'Invoice date'
    if (field.includes('.invoiceValue')) return 'Invoice value'
    if (field.includes('.ebnNumber')) return 'EBN number'
    if (field.includes('.ebnExpiry')) return 'EBN expiry'
    if (field.includes('.lengthCm')) return 'Box length'
    if (field.includes('.breadthCm')) return 'Box breadth'
    if (field.includes('.heightCm')) return 'Box height'
    if (field.includes('.weightKg')) return 'Box weight'

    const labels: Record<string, string> = {
      orderId: 'Order ID',
      orderDate: 'Order date',
      orderType: 'Order type',
      buyerName: 'Recipient name',
      buyerPhone: 'Recipient phone',
      pincode: 'Delivery pincode',
      city: 'Delivery city',
      state: 'Delivery state',
      address: 'Delivery address',
      companyName: 'Company name',
      pickupLocationId: 'Pickup location',
      pickupLocationPincode: 'Pickup pincode',
      pickupLocationName: 'Pickup name',
      pickupLocationPOCName: 'Pickup contact',
      pickupLocationPOCPhone: 'Pickup phone',
      pickupAddress: 'Pickup address',
      pickupCity: 'Pickup city',
      pickupState: 'Pickup state',
      pickupDate: 'Pickup date',
      pickupTime: 'Pickup time',
      billingPanNumber: 'Seller PAN',
      billingGstin: 'Seller GSTIN',
      courierPartnerId: 'Courier partner',
    }
    return labels[field] ?? field
  }

  const validateStep = async () => {
    const stepFields = getStepFields()
    const valid = await trigger(stepFields as any, { shouldFocus: true })
    if (valid) {
      setStepError('')
      return true
    }

    const invalidFields = stepFields.filter((field) => getFieldState(field as any).invalid)
    const labels = invalidFields.slice(0, 4).map(getFieldLabel)
    const remainingCount = Math.max(invalidFields.length - labels.length, 0)
    const message = `Please check: ${labels.join(', ')}${
      remainingCount ? ` and ${remainingCount} more field${remainingCount === 1 ? '' : 's'}` : ''
    }.`

    setStepError(message)
    toast.open({ message, severity: 'warning' })

    const firstInvalid = invalidFields[0]
    if (firstInvalid) {
      setFocus(firstInvalid as any)
      window.requestAnimationFrame(() => {
        const input = document.querySelector<HTMLElement>(
          `[name="${String(firstInvalid).replace(/"/g, '\\"')}"]`,
        )
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }

    return false
  }

  const nextStep = async () => {
    const valid = await validateStep()
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, 2))
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

  const prevStep = () => {
    setStepError('')
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const requestBookingConfirmation = handleSubmit((data) => {
    const selectedProvider = `${data.integrationType ?? ''} ${data.courierPartner ?? ''}`
      .trim()
      .toLowerCase()

    const supportedB2BProvider =
      selectedProvider.includes('delhivery') ||
      selectedProvider.includes('bigship') ||
      selectedProvider.includes('shipmozo')

    if (!data.courierPartnerId || !supportedB2BProvider) {
      methods.setError('courierPartnerId', {
        type: 'manual',
        message: 'Select an available B2B courier rate before booking.',
      })
      return
    }

    setConfirmationOpen(true)
  })

  const confirmB2BBooking = handleSubmit((data) => {
    setConfirmationOpen(false)
    return onSubmit(data)
  })

  useEffect(() => {
    setValue('orderAmount', totalCollectable, { shouldValidate: true })
  }, [setValue, totalCollectable])

  useEffect(() => {
    if (!previousRateInputSignature.current) {
      previousRateInputSignature.current = rateInputSignature
      return
    }

    if (previousRateInputSignature.current === rateInputSignature) return

    previousRateInputSignature.current = rateInputSignature

    if (!selectedCourierPartnerId) return

    setValue('courierPartner', '')
    setValue('courierPartnerId', '')
    setValue('courierOptionKey', '')
    setValue('selectedMaxSlabWeight', null)
    setValue('courierCod', 0)
    setValue('forwardCharges', 0)
    setValue('otherCharges', 0)
    setValue('courierCost', null)
    setValue('chargeableWeight', null)
    setValue('volumetricWeight', null)
  }, [rateInputSignature, selectedCourierPartnerId, setValue])

  return (
    <FormProvider {...methods}>
      <Stack gap={0} sx={{ height: '100%', position: 'relative' }}>
        <Box
          component="form"
          onSubmit={requestBookingConfirmation}
          sx={{ flex: 1, overflowY: 'auto', p: 2 }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
              borderRadius: '16px',
              mb: 2,
              boxShadow: '0 8px 24px rgba(26, 35, 126, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Stepper
              activeStep={currentStep}
              alternativeLabel
              sx={{
                '& .MuiStepConnector-root': {
                  top: '22px',
                  left: 'calc(-50% + 20px)',
                  right: 'calc(50% + 20px)',
                },
                '& .MuiStepConnector-line': {
                  borderTopWidth: '3px',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '& .Mui-active .MuiStepConnector-line': {
                  borderColor: '#4caf50',
                },
                '& .Mui-completed .MuiStepConnector-line': {
                  borderColor: '#4caf50',
                },
              }}
            >
              {steps.map((label, index) => (
                <Step key={label} completed={index < currentStep} active={index === currentStep}>
                  <StepLabel
                    StepIconComponent={({ active, completed, icon }) => (
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: active
                            ? '#4caf50'
                            : completed
                            ? '#4caf50'
                            : 'rgba(255, 255, 255, 0.2)',
                          border: active
                            ? '3px solid #ffffff'
                            : completed
                            ? '3px solid #ffffff'
                            : '3px solid rgba(255, 255, 255, 0.4)',
                          boxShadow: active
                            ? '0 0 0 4px rgba(76, 175, 80, 0.3), 0 4px 12px rgba(76, 175, 80, 0.4)'
                            : completed
                            ? '0 4px 8px rgba(76, 175, 80, 0.3)'
                            : '0 2px 4px rgba(0, 0, 0, 0.2)',
                          transition: 'all 0.3s ease',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                      >
                        {completed ? '✓' : icon}
                      </Box>
                    )}
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                        mt: 1,
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                      },
                      '& .MuiStepLabel-label.Mui-active': {
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.05rem' },
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      },
                      '& .MuiStepLabel-label.Mui-completed': {
                        color: '#c8e6c9',
                        fontWeight: 600,
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {stepError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {stepError}
            </Alert>
          )}

          {currentStep === 0 && (
            <Stack gap={0} mb={1}>
              <FormSectionAccordion title="Order Details" icon={<FaBox />} defaultExpanded compact>
                <OrderDetailsForm compact />
              </FormSectionAccordion>

              <FormSectionAccordion title="Recipient Details" icon={<FaUser />} defaultExpanded compact>
                <DeliveryDetailsForm type="b2b" />
              </FormSectionAccordion>

              {/* Invoices */}
              <FormSectionAccordion title="Invoices" icon={<FaFileInvoice />} defaultExpanded compact>
                <B2BInvoicesForm />
              </FormSectionAccordion>

              {/* Products and package dimensions */}
              <FormSectionAccordion title="Products & Boxes" icon={<FaBox />} defaultExpanded compact>
                <B2BProductsForm />
              </FormSectionAccordion>

            </Stack>
          )}

          {currentStep === 1 && (
            <Stack gap={1.5} mb={1}>
              <PickupLocationForm shipmentType="b2b" />
              <FormSectionAccordion title="Booking Review" icon={<FaFileInvoice />} defaultExpanded compact>
                <BookingReviewSummary
                  shipmentType="b2b"
                  subtotal={subtotal}
                  totalCollectable={totalCollectable}
                  totalOrderValue={totalOrderValue}
                />
              </FormSectionAccordion>
            </Stack>
          )}

          {currentStep === 2 && (
            <FormSectionAccordion title="Courier Selection" icon={<FaTruck />} defaultExpanded compact>
              <SelectCourierForm shipment_type="b2b" showSummary={false} />
            </FormSectionAccordion>
          )}

          <Box
            sx={{
              py: 2,
              px: 2,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '15px',
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Stack direction="row" justifyContent="space-between">
              {currentStep > 0 && (
                <Button
                  type="button"
                  loading={createShipmentMutation?.isPending}
                  variant="outlined"
                  onClick={prevStep}
                >
                  Back
                </Button>
              )}
              {currentStep < 2 ? (
                <Button type="button" variant="contained" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="contained"
                  onClick={requestBookingConfirmation}
                  color="primary"
                  loading={createShipmentMutation?.isPending}
                >
                  Book Shipment
                </Button>
              )}
            </Stack>
          </Box>
        </Box>
        <Dialog
          open={confirmationOpen}
          onClose={() => !createShipmentMutation.isPending && setConfirmationOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Confirm B2B Booking</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Alert severity="warning">
                This is a live booking. Confirming will send the shipment to the selected courier
                and create its LR/AWB; it is not a preview.
              </Alert>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  Order ID
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{watch('orderId') || '-'}</Typography>
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  Courier
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {watch('courierPartner') || 'Selected B2B courier'}
                </Typography>
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  Invoice value
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  ₹{Number(subtotal || 0).toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setConfirmationOpen(false)}
              disabled={createShipmentMutation.isPending}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              onClick={confirmB2BBooking}
              loading={createShipmentMutation.isPending}
            >
              Confirm & Book
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </FormProvider>
  )
}

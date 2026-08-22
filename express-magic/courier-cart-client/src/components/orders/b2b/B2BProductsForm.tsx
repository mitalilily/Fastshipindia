import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AiOutlineDelete } from 'react-icons/ai'
import axiosInstance from '../../../api/axiosInstance'
import { useDebouncedEffect } from '../../../hooks/useDebounceEffect'
import { b2bBoxWeightInputToKg } from '../../../utils/b2bWeight'
import CustomInput from '../../UI/inputs/CustomInput'
import type { B2BFormData } from './B2BOrderForm'

const emptyProduct = { productName: '', quantity: 1, unitPrice: 0 }
const emptyBox = { quantity: 1, lengthCm: 0, breadthCm: 0, heightCm: 0, weightKg: 0 }
const DEFAULT_B2B_VOLUMETRIC_DIVISOR = 4500

const roundWeight = (value: number) => Number(value.toFixed(2))
const getBoxQuantity = (box?: Partial<B2BFormData['boxes'][number]>) =>
  Math.max(1, Math.floor(Number(box?.quantity || 1)))

const calculateTotalVolumetricWeight = (
  boxes: B2BFormData['boxes'] = [],
  cftFactor = DEFAULT_B2B_VOLUMETRIC_DIVISOR,
) =>
  boxes.reduce((sum, box) => {
    const quantity = getBoxQuantity(box)
    const length = Number(box.lengthCm || 0)
    const breadth = Number(box.breadthCm || 0)
    const height = Number(box.heightCm || 0)

    if (length <= 0 || breadth <= 0 || height <= 0) return sum

    const volumeCm3 = length * breadth * height
    const volumetricWeight =
      cftFactor <= 100 ? (volumeCm3 / 28316.846592) * cftFactor : volumeCm3 / cftFactor

    return sum + volumetricWeight * quantity
  }, 0)

const ProductBoxesForm = () => {
  const { control, trigger, watch, setValue } = useFormContext<B2BFormData>()
  const [isTotalWeightEdited, setIsTotalWeightEdited] = useState(false)
  const [weightCalculations, setWeightCalculations] = useState({
    totalActualWeight: 0,
    totalVolumetricWeight: 0,
    totalChargeableWeight: 0,
    cftFactor: DEFAULT_B2B_VOLUMETRIC_DIVISOR,
    loading: false,
  })

  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({ control, name: 'products' })
  const {
    fields: boxFields,
    append: appendBox,
    remove: removeBox,
  } = useFieldArray({ control, name: 'boxes' })

  const boxes = useWatch({ control, name: 'boxes' }) || []
  const products = useWatch({ control, name: 'products' }) || []
  const totalWeight = useWatch({ control, name: 'weight' })
  const pickupPincode = watch('pickupLocationPincode')
  const deliveryPincode = watch('pincode')
  const totalBoxes = boxes.reduce((sum, box) => sum + getBoxQuantity(box), 0)
  const automaticActualWeight = roundWeight(
    boxes.reduce((sum, box) => sum + b2bBoxWeightInputToKg(box.weightKg) * getBoxQuantity(box), 0),
  )
  const enteredActualWeight = Number(totalWeight || 0)
  const effectiveActualWeight = enteredActualWeight > 0 ? enteredActualWeight : automaticActualWeight

  useEffect(() => {
    if (isTotalWeightEdited) return

    setValue('weight', automaticActualWeight, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [automaticActualWeight, isTotalWeightEdited, setValue])

  useDebouncedEffect(
    () => {
      const calculateWeights = async () => {
        if (!boxes.length) return

        const validDimensionBoxes = boxes.filter(
          (box) =>
            Number(box.lengthCm || 0) > 0 &&
            Number(box.breadthCm || 0) > 0 &&
            Number(box.heightCm || 0) > 0,
        )

        if (!validDimensionBoxes.length) {
          setWeightCalculations({
            totalActualWeight: effectiveActualWeight,
            totalVolumetricWeight: 0,
            totalChargeableWeight: effectiveActualWeight,
            cftFactor: DEFAULT_B2B_VOLUMETRIC_DIVISOR,
            loading: false,
          })
          return
        }

        setWeightCalculations((previous) => ({ ...previous, loading: true }))

        const length = Math.max(...validDimensionBoxes.map((box) => Number(box.lengthCm || 0)))
        const width = Math.max(...validDimensionBoxes.map((box) => Number(box.breadthCm || 0)))
        const height = Math.max(...validDimensionBoxes.map((box) => Number(box.heightCm || 0)))

        try {
          const response = await axiosInstance.post('/couriers/b2b/calculate-rate', {
            originPincode: pickupPincode || '110001',
            destinationPincode: deliveryPincode || '110001',
            weightKg: effectiveActualWeight,
            length,
            width,
            height,
          })
          const calculation = response.data?.data?.calculation || {}
          const config = response.data?.data?.config || {}
          const cftFactor = Number(
            config.cftFactor || calculation.cftFactor || DEFAULT_B2B_VOLUMETRIC_DIVISOR,
          )
          const fallbackVolumetricWeight = calculateTotalVolumetricWeight(
            validDimensionBoxes,
            cftFactor,
          )
          const totalVolumetricWeight = Math.max(
            fallbackVolumetricWeight,
            Number(calculation.volumetricWeight || calculation.volumetric_weight || 0),
          )
          const apiBillableWeight = Number(
            calculation.billableWeight || calculation.billable_weight || 0,
          )

          setWeightCalculations({
            totalActualWeight: effectiveActualWeight,
            totalVolumetricWeight,
            totalChargeableWeight: Math.max(
              apiBillableWeight,
              effectiveActualWeight,
              totalVolumetricWeight,
            ),
            cftFactor,
            loading: false,
          })
        } catch (error: unknown) {
          console.error('Error calculating B2B package weight:', error)
          const totalVolumetricWeight = calculateTotalVolumetricWeight(
            validDimensionBoxes,
            DEFAULT_B2B_VOLUMETRIC_DIVISOR,
          )
          setWeightCalculations({
            totalActualWeight: effectiveActualWeight,
            totalVolumetricWeight,
            totalChargeableWeight: Math.max(effectiveActualWeight, totalVolumetricWeight),
            cftFactor: DEFAULT_B2B_VOLUMETRIC_DIVISOR,
            loading: false,
          })
        }
      }

      void calculateWeights()
    },
    [boxes, pickupPincode, deliveryPincode, effectiveActualWeight],
    500,
  )

  const handleAddProduct = async () => {
    const lastIndex = productFields.length - 1
    const valid =
      lastIndex < 0 ||
      (await trigger([
        `products.${lastIndex}.productName`,
        `products.${lastIndex}.quantity`,
        `products.${lastIndex}.unitPrice`,
      ]))
    if (valid) appendProduct(emptyProduct)
  }

  const handleAddBox = async () => {
    const lastIndex = boxFields.length - 1
    const valid =
      lastIndex < 0 ||
      (await trigger([
        `boxes.${lastIndex}.lengthCm`,
        `boxes.${lastIndex}.breadthCm`,
        `boxes.${lastIndex}.heightCm`,
        `boxes.${lastIndex}.weightKg`,
        `boxes.${lastIndex}.quantity`,
      ]))
    if (valid) appendBox(emptyBox)
  }

  const productsTotal = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0) * Number(product.unitPrice || 0),
    0,
  )
  const volumetricFormula =
    weightCalculations.cftFactor <= 100
      ? `max(Actual, Volumetric) - Volumetric uses CFT factor ${weightCalculations.cftFactor}`
      : `max(Actual, Volumetric) - Volumetric = (LxBxH) / ${weightCalculations.cftFactor}`
  const boxInputFields = (
    boxFields.length > 1
      ? [
          ['quantity', 'No. of Boxes'],
          ['weightKg', 'Per Box Weight (kg)'],
          ['lengthCm', 'Length (cm)'],
          ['breadthCm', 'Breadth (cm)'],
          ['heightCm', 'Height (cm)'],
        ]
      : [
          ['weightKg', 'Per Box Weight (kg)'],
          ['lengthCm', 'Length (cm)'],
          ['breadthCm', 'Breadth (cm)'],
          ['heightCm', 'Height (cm)'],
        ]
  ) as Array<['quantity' | 'weightKg' | 'lengthCm' | 'breadthCm' | 'heightCm', string]>

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Box>
            <Typography fontWeight={700} color="#102A54">
              Shipment Products
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add every product included in this B2B shipment.
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight={700} color="#333369">
            Total ₹{productsTotal.toFixed(2)}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          {productFields.map((product, productIndex) => (
            <Paper
              key={product.id}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2, borderColor: '#E0E6ED' }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'minmax(0, 2fr) minmax(110px, 0.75fr) minmax(130px, 0.9fr) 40px',
                  },
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                <Controller
                  name={`products.${productIndex}.productName`}
                  control={control}
                  rules={{ required: 'Product name is required' }}
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
                      label="Quantity"
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
                <IconButton
                  color="error"
                  aria-label={`Remove product ${productIndex + 1}`}
                  disabled={productFields.length === 1}
                  onClick={() => removeProduct(productIndex)}
                  sx={{ mt: { xs: 0, sm: 3.2 } }}
                >
                  <AiOutlineDelete />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Stack>

        <Button variant="outlined" onClick={handleAddProduct} sx={{ mt: 1 }}>
          + Add Product
        </Button>
      </Box>

      <Divider />

      <Box>
        <Box mb={1}>
          <Typography fontWeight={700} color="#102A54">
            Package Boxes
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enter the dimensions and actual weight of each physical box.
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: 2,
            borderColor: '#D9E2EC',
            background: '#F8FAFC',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 1.25,
              alignItems: 'stretch',
            }}
          >
            {boxFields.length === 1 ? (
              <Controller
                name="boxes.0.quantity"
                control={control}
                rules={{
                  required: 'No. of boxes is required',
                  min: { value: 1, message: 'Minimum 1 box' },
                  validate: (value) => Number.isInteger(Number(value)) || 'Use a whole number',
                }}
                render={({ field, fieldState }) => (
                  <CustomInput
                    {...field}
                    label="No. of Boxes"
                    type="number"
                    required
                    topMargin={false}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || 'Same dimensions? enter total boxes'}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  />
                )}
              />
            ) : (
              <Box
                sx={{
                  p: 1.25,
                  border: '1px solid #D9E2EC',
                  borderRadius: 1.5,
                  background: '#FFFFFF',
                }}
              >
                <Typography variant="caption" fontWeight={700} color="#64748B">
                  Total Boxes
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#102A54">
                  {totalBoxes}
                </Typography>
              </Box>
            )}

            <Controller
              name="weight"
              control={control}
              rules={{
                required: 'Total actual weight is required',
                min: { value: 0.01, message: 'Must be greater than 0' },
              }}
              render={({ field, fieldState }) => (
                <CustomInput
                  {...field}
                  label="Total Actual Weight (kg)"
                  type="number"
                  required
                  topMargin={false}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  onChange={(event) => {
                    const value = Number(event.target.value || 0)
                    setIsTotalWeightEdited(value > 0 && value !== automaticActualWeight)
                    field.onChange(event)
                  }}
                />
              )}
            />

            <Box
              sx={{
                p: 1.25,
                border: '1px solid #D9E2EC',
                borderRadius: 1.5,
                background: '#FFFFFF',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="#64748B">
                Volumetric Weight
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#102A54">
                {weightCalculations.loading ? (
                  <CircularProgress size={18} />
                ) : (
                  `${weightCalculations.totalVolumetricWeight.toFixed(2)} kg`
                )}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                border: '1px solid #D9E2EC',
                borderRadius: 1.5,
                background: '#FFFFFF',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="#64748B">
                Chargeable Weight
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#102A54">
                {weightCalculations.loading ? (
                  <CircularProgress size={18} />
                ) : (
                  `${weightCalculations.totalChargeableWeight.toFixed(2)} kg`
                )}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Stack spacing={1}>
          {boxFields.map((box, boxIndex) => (
            <Paper
              key={box.id}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2, borderColor: '#E0E6ED' }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    md:
                      boxFields.length > 1
                        ? 'repeat(5, minmax(110px, 1fr)) 40px'
                        : 'repeat(4, minmax(110px, 1fr)) 40px',
                  },
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                {boxInputFields.map(([name, label]) => (
                  <Controller
                    key={name}
                    name={`boxes.${boxIndex}.${name}`}
                    control={control}
                    rules={{
                      required: `${label} is required`,
                      min:
                        name === 'quantity'
                          ? { value: 1, message: 'Minimum 1 box' }
                          : { value: 0.01, message: 'Must be greater than 0' },
                      validate:
                        name === 'quantity'
                          ? (value) =>
                              Number.isInteger(Number(value)) || 'Use a whole number'
                          : undefined,
                    }}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        {...field}
                        label={label}
                        type="number"
                        required
                        topMargin={false}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        slotProps={{
                          htmlInput:
                            name === 'quantity'
                              ? { min: 1, step: 1 }
                              : { min: 0.01, step: 0.01 },
                        }}
                      />
                    )}
                  />
                ))}
                <IconButton
                  color="error"
                  aria-label={`Remove box ${boxIndex + 1}`}
                  disabled={boxFields.length === 1}
                  onClick={() => removeBox(boxIndex)}
                  sx={{ mt: { xs: 0, md: 3.2 } }}
                >
                  <AiOutlineDelete />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Stack>

        <Button variant="outlined" onClick={handleAddBox} sx={{ mt: 1 }}>
          + Add Box
        </Button>
      </Box>

      {!!boxes.length && (
        <Paper
          variant="outlined"
          sx={{ p: 1.5, borderRadius: 2, borderColor: '#E0E6ED', background: '#F5F7FA' }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2" fontWeight={700} color="#333369">
                Actual vs Volumetric
              </Typography>
              <Typography variant="caption" color="#4A5568">
                {volumetricFormula}
              </Typography>
            </Box>
            {weightCalculations.loading ? (
              <CircularProgress size={20} />
            ) : (
              <Typography variant="h6" fontWeight={700} color="#333369">
                {weightCalculations.totalChargeableWeight.toFixed(2)} kg
              </Typography>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}

export default ProductBoxesForm

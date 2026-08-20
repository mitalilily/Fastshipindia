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
import { useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AiOutlineDelete } from 'react-icons/ai'
import axiosInstance from '../../../api/axiosInstance'
import { useDebouncedEffect } from '../../../hooks/useDebounceEffect'
import { b2bBoxWeightInputToKg } from '../../../utils/b2bWeight'
import CustomInput from '../../UI/inputs/CustomInput'
import type { B2BFormData } from './B2BOrderForm'

const emptyProduct = { productName: '', quantity: 1, unitPrice: 0 }
const emptyBox = { lengthCm: 0, breadthCm: 0, heightCm: 0, weightKg: 0 }

const ProductBoxesForm = () => {
  const { control, trigger, watch } = useFormContext<B2BFormData>()
  const [weightCalculations, setWeightCalculations] = useState({
    totalChargeableWeight: 0,
    cftFactor: 5000,
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
  const pickupPincode = watch('pickupLocationPincode')
  const deliveryPincode = watch('pincode')

  useDebouncedEffect(
    () => {
      const calculateWeights = async () => {
        if (!boxes.length) return

        const totalActualWeight = boxes.reduce(
          (sum, box) => sum + b2bBoxWeightInputToKg(box.weightKg),
          0,
        )
        const validDimensionBoxes = boxes.filter(
          (box) =>
            Number(box.lengthCm || 0) > 0 &&
            Number(box.breadthCm || 0) > 0 &&
            Number(box.heightCm || 0) > 0,
        )

        if (!validDimensionBoxes.length) {
          setWeightCalculations({
            totalChargeableWeight: totalActualWeight,
            cftFactor: 5000,
            loading: false,
          })
          return
        }

        setWeightCalculations((previous) => ({ ...previous, loading: true }))

        const length = Math.max(...validDimensionBoxes.map((box) => Number(box.lengthCm || 0)))
        const width = Math.max(...validDimensionBoxes.map((box) => Number(box.breadthCm || 0)))
        const height = Math.max(...validDimensionBoxes.map((box) => Number(box.heightCm || 0)))

        try {
          const response = await axiosInstance.post('/admin/b2b/calculate-rate', {
            originPincode: pickupPincode || '110001',
            destinationPincode: deliveryPincode || '110001',
            weightKg: totalActualWeight,
            length,
            width,
            height,
          })
          const calculation = response.data?.data?.calculation || {}
          const config = response.data?.data?.config || {}

          setWeightCalculations({
            totalChargeableWeight: Number(calculation.billableWeight || totalActualWeight),
            cftFactor: Number(config.cftFactor || calculation.cftFactor || 5000),
            loading: false,
          })
        } catch (error: unknown) {
          console.error('Error calculating B2B package weight:', error)
          const totalVolumetricWeight = validDimensionBoxes.reduce(
            (sum, box) =>
              sum +
              (Number(box.lengthCm) * Number(box.breadthCm) * Number(box.heightCm)) / 5000,
            0,
          )
          setWeightCalculations({
            totalChargeableWeight: Math.max(totalActualWeight, totalVolumetricWeight),
            cftFactor: 5000,
            loading: false,
          })
        }
      }

      void calculateWeights()
    },
    [boxes, pickupPincode, deliveryPincode],
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
      ]))
    if (valid) appendBox(emptyBox)
  }

  const productsTotal = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0) * Number(product.unitPrice || 0),
    0,
  )

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
                    md: 'repeat(4, minmax(110px, 1fr)) 40px',
                  },
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                {(
                  [
                    ['lengthCm', 'Length (cm)'],
                    ['breadthCm', 'Breadth (cm)'],
                    ['heightCm', 'Height (cm)'],
                    ['weightKg', 'Weight (kg)'],
                  ] as const
                ).map(([name, label]) => (
                  <Controller
                    key={name}
                    name={`boxes.${boxIndex}.${name}`}
                    control={control}
                    rules={{
                      required: `${label} is required`,
                      min: { value: 0.01, message: 'Must be greater than 0' },
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
                        slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
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
                Chargeable Weight
              </Typography>
              <Typography variant="caption" color="#4A5568">
                max(Actual, Volumetric) · Volumetric = (L×B×H) ÷ {weightCalculations.cftFactor}
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

import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { memo } from 'react'

/**
 * Surcharges Section Component
 */
const SurchargesSection = memo(({ formData, onFieldChange }) => {
  return (
    <Box>
      <Text fontSize="md" fontWeight="bold" color="yellow.600" mb={4}>
        3. Surcharges
      </Text>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">
            Public Holiday Pickup Charge (₹)
          </FormLabel>
          <NumberInput
            value={formData.publicHolidayPickupCharge}
            onChange={(_, value) => onFieldChange('publicHolidayPickupCharge', value)}
            size="sm"
          >
            <NumberInputField />
          </NumberInput>
          <FormHelperText fontSize="xs">Rs Additional</FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">
            Fuel Surcharge Percentage (%)
          </FormLabel>
          <NumberInput
            value={formData.fuelSurchargePercentage}
            onChange={(_, value) => onFieldChange('fuelSurchargePercentage', value)}
            size="sm"
            precision={2}
          >
            <NumberInputField />
          </NumberInput>
          <FormHelperText fontSize="xs">% on basic freight</FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">
            Green Tax (₹)
          </FormLabel>
          <NumberInput
            value={formData.greenTax}
            onChange={(_, value) => onFieldChange('greenTax', value)}
            size="sm"
          >
            <NumberInputField />
          </NumberInput>
          <FormHelperText fontSize="xs">Rs Additional</FormHelperText>
        </FormControl>
      </SimpleGrid>
      <Box
        mt={4}
        mb={4}
        p={4}
        bg={useColorModeValue('blue.50', 'blue.900')}
        borderRadius="md"
        borderWidth="1px"
        borderColor={useColorModeValue('blue.200', 'blue.700')}
      >
        <Text fontSize="sm" fontWeight="semibold" color="blue.700" mb={3}>
          FM Charge
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="medium">FM Charge Per AWB (₹)</FormLabel>
            <NumberInput value={formData.fmChargePerAwb} onChange={(_, value) => onFieldChange('fmChargePerAwb', value)} size="sm">
              <NumberInputField />
            </NumberInput>
            <FormHelperText fontSize="xs">Rs per AWB</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="medium">FM Charge Per Kg (₹)</FormLabel>
            <NumberInput value={formData.fmChargePerKg} onChange={(_, value) => onFieldChange('fmChargePerKg', value)} size="sm">
              <NumberInputField />
            </NumberInput>
            <FormHelperText fontSize="xs">Rs per Kg</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="medium">FM Calculation Method</FormLabel>
            <Select value={formData.fmChargeMethod || 'whichever_is_higher'} onChange={(event) => onFieldChange('fmChargeMethod', event.target.value)} size="sm">
              <option value="whichever_is_higher">Whichever is Higher</option>
              <option value="whichever_is_lower">Whichever is Lower</option>
            </Select>
            <FormHelperText fontSize="xs">Applied to all pincodes.</FormHelperText>
          </FormControl>
        </SimpleGrid>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">To-Pay Charge (₹ fixed)</FormLabel>
          <NumberInput value={formData.toPayFixedAmount} onChange={(_, value) => onFieldChange('toPayFixedAmount', value)} size="sm"><NumberInputField /></NumberInput>
          <FormHelperText fontSize="xs">Applied only to marked To-Pay pincodes and TO_PAY shipments.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">To-Pay Charge (%)</FormLabel>
          <NumberInput value={formData.toPayPercentage} onChange={(_, value) => onFieldChange('toPayPercentage', value)} size="sm"><NumberInputField /></NumberInput>
          <FormHelperText fontSize="xs">% of invoice value; higher of fixed or percentage is charged.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">Green Tax (₹ fixed)</FormLabel>
          <NumberInput value={formData.greenTax} onChange={(_, value) => onFieldChange('greenTax', value)} size="sm"><NumberInputField /></NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="medium">Green Tax (₹/kg)</FormLabel>
          <NumberInput value={formData.greenTaxPerKg} onChange={(_, value) => onFieldChange('greenTaxPerKg', value)} size="sm"><NumberInputField /></NumberInput>
          <FormHelperText fontSize="xs">Applied only to pincodes marked Green Tax; higher amount is charged.</FormHelperText>
        </FormControl>
      </SimpleGrid>
    </Box>
  )
})

SurchargesSection.displayName = 'SurchargesSection'

export default SurchargesSection

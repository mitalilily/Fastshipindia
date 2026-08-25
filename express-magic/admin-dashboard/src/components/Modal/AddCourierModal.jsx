import {
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  useToast,
} from '@chakra-ui/react'
import { useCreateCourier } from 'hooks/useCouriers'
import { useState } from 'react'
import CustomModal from './CustomModal'

const AddCourierModal = ({ isOpen, onClose }) => {
  const toast = useToast()
  const { mutate, isPending } = useCreateCourier()
  const [form, setForm] = useState({
    courierId: '',
    courierName: '',
    serviceProvider: 'delhivery',
    businessType: ['b2c'],
  })

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = () => {
    const courierId = Number(form.courierId)
    if (!Number.isInteger(courierId) || courierId <= 0) {
      return toast({ title: 'Valid courier ID is required', status: 'warning' })
    }
    if (!form.courierName.trim()) {
      return toast({ title: 'Courier name is required', status: 'warning' })
    }
    if (!form.serviceProvider) {
      return toast({ title: 'Service provider is required', status: 'warning' })
    }
    if (!form.businessType.length) {
      return toast({ title: 'Select at least one business type', status: 'warning' })
    }

    mutate(
      {
        courierId: String(courierId),
        courierName: form.courierName.trim(),
        serviceProvider: form.serviceProvider,
        businessType: form.businessType,
      },
      {
        onSuccess: () => {
          toast({ title: 'Courier added successfully', status: 'success' })
          setForm({
            courierId: '',
            courierName: '',
            serviceProvider: 'delhivery',
            businessType: ['b2c'],
          })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Failed to add courier',
            description: error?.response?.data?.message || error?.message,
            status: 'error',
          })
        },
      },
    )
  }

  if (!isOpen) return null

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Courier"
      footer={
        <Flex justify="flex-end" gap={2}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={isPending}>
            Add Courier
          </Button>
        </Flex>
      }
    >
      <Flex direction="column" p={6} gap={4} bg="white" borderRadius="md" minW="300px">
        <FormControl>
          <FormLabel>Courier ID</FormLabel>
          <Input
            type="number"
            min={1}
            value={form.courierId}
            onChange={(e) => setField('courierId', e.target.value)}
            placeholder="Provider courier ID"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Courier Name</FormLabel>
          <Input
            value={form.courierName}
            onChange={(e) => setField('courierName', e.target.value)}
            placeholder="Courier display name"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Service Provider</FormLabel>
          <Select
            value={form.serviceProvider}
            onChange={(e) => setField('serviceProvider', e.target.value)}
          >
            <option value="delhivery">Delhivery</option>
            <option value="ekart">Ekart</option>
            <option value="xpressbees">Xpressbees</option>
            <option value="shadowfax">Shadowfax</option>
            <option value="amazon">Amazon Shipping</option>
            <option value="bigship">Bigship</option>
            <option value="shipmozo">Shipmozo</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Business Type</FormLabel>
          <CheckboxGroup value={form.businessType} onChange={(value) => setField('businessType', value)}>
            <Stack direction="row" spacing={4}>
              <Checkbox value="b2c">B2C</Checkbox>
              <Checkbox value="b2b">B2B</Checkbox>
            </Stack>
          </CheckboxGroup>
        </FormControl>
      </Flex>{' '}
    </CustomModal>
  )
}

export default AddCourierModal

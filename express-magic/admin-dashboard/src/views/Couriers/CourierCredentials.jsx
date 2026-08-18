import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import {
  useCourierCredentials,
  useTestDelhiveryB2BCredentials,
  useUpdateDelhiveryB2BCredentials,
  useUpdateDelhiveryCredentials,
} from 'hooks/useCouriers'

const cardStyles = {
  borderWidth: '1px',
  borderColor: '#E2E8F0',
  borderRadius: '16px',
  bg: 'white',
  p: { base: 4, md: 6 },
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const CourierCredentials = () => {
  const toast = useToast()
  const { data, isLoading, error } = useCourierCredentials()
  const updateDelhivery = useUpdateDelhiveryCredentials()
  const updateDelhiveryB2B = useUpdateDelhiveryB2BCredentials()
  const testDelhiveryB2B = useTestDelhiveryB2BCredentials()

  const [b2cForm, setB2CForm] = useState({
    apiBase: 'https://track.delhivery.com',
    clientName: '',
    apiKey: '',
  })
  const [b2bForm, setB2BForm] = useState({
    apiBase: 'https://ltl-clients-api.delhivery.com',
    username: '',
    password: '',
    clientId: '',
    warehouseId: '',
    freightMode: 'fop',
    fmPickup: true,
  })

  useEffect(() => {
    if (data?.delhivery) {
      setB2CForm({
        apiBase: data.delhivery.apiBase || 'https://track.delhivery.com',
        clientName: data.delhivery.clientName || '',
        apiKey: '',
      })
    }
    if (data?.delhiveryB2B) {
      setB2BForm({
        apiBase:
          data.delhiveryB2B.apiBase || 'https://ltl-clients-api.delhivery.com',
        username: data.delhiveryB2B.username || '',
        password: '',
        clientId: data.delhiveryB2B.clientId || '',
        warehouseId: data.delhiveryB2B.warehouseId || '',
        freightMode: data.delhiveryB2B.freightMode === 'fod' ? 'fod' : 'fop',
        fmPickup: data.delhiveryB2B.fmPickup !== false,
      })
    }
  }, [data])

  const handleSaveB2C = () => {
    if (!b2cForm.apiBase.trim() || (!data?.delhivery?.hasApiKey && !b2cForm.apiKey.trim())) {
      toast({
        title: 'Complete the required B2C fields',
        description: 'API Base URL and API Token are required.',
        status: 'warning',
      })
      return
    }

    updateDelhivery.mutate(
      {
        apiBase: b2cForm.apiBase.trim(),
        clientName: b2cForm.clientName.trim(),
        ...(b2cForm.apiKey.trim() ? { apiKey: b2cForm.apiKey.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: 'Delhivery B2C credentials saved', status: 'success' })
          setB2CForm((previous) => ({ ...previous, apiKey: '' }))
        },
        onError: (saveError) =>
          toast({
            title: 'Failed to save Delhivery B2C credentials',
            description: getErrorMessage(saveError, 'Please try again.'),
            status: 'error',
          }),
      },
    )
  }

  const handleSaveB2B = () => {
    const missing = [
      !b2bForm.apiBase.trim() && 'API Base URL',
      !b2bForm.username.trim() && 'Username',
      !data?.delhiveryB2B?.hasPassword && !b2bForm.password.trim() && 'Password',
    ].filter(Boolean)

    if (missing.length) {
      toast({
        title: 'Complete the required B2B fields',
        description: `Missing: ${missing.join(', ')}`,
        status: 'warning',
      })
      return
    }

    updateDelhiveryB2B.mutate(
      {
        apiBase: b2bForm.apiBase.trim(),
        username: b2bForm.username.trim(),
        clientId: b2bForm.clientId.trim(),
        warehouseId: b2bForm.warehouseId.trim(),
        freightMode: b2bForm.freightMode,
        fmPickup: b2bForm.fmPickup,
        ...(b2bForm.password.trim() ? { password: b2bForm.password.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: 'Delhivery B2B credentials saved', status: 'success' })
          setB2BForm((previous) => ({ ...previous, password: '' }))
        },
        onError: (saveError) =>
          toast({
            title: 'Failed to save Delhivery B2B credentials',
            description: getErrorMessage(saveError, 'Please try again.'),
            status: 'error',
          }),
      },
    )
  }

  const handleTestB2B = () => {
    testDelhiveryB2B.mutate(undefined, {
      onSuccess: (result) =>
        toast({
          title: 'Delhivery B2B authentication successful',
          description: result?.expiresAt ? `Token expires: ${result.expiresAt}` : undefined,
          status: 'success',
        }),
      onError: (testError) =>
        toast({
          title: 'Delhivery B2B authentication failed',
          description: getErrorMessage(testError, 'Check the saved username and password.'),
          status: 'error',
        }),
    })
  }

  if (isLoading) return <Spinner size="md" />
  if (error) return <Text color="red.500">Failed to load courier credentials</Text>

  return (
    <Flex direction="column" pt={{ base: '120px', md: '75px' }} gap={6}>
      <Box>
        <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="800" color="#172B4D">
          Courier Credentials
        </Text>
        <Text mt={1} color="gray.600">
          Configure Delhivery B2C token access and B2B JWT authentication separately.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} alignItems="start">
        <Box {...cardStyles}>
          <VStack spacing={4} align="stretch">
            <Flex justify="space-between" align="center" gap={3}>
              <Box>
                <Text fontSize="lg" fontWeight="700">Delhivery B2C</Text>
                <Text fontSize="sm" color="gray.500">Token authentication</Text>
              </Box>
              <Badge colorScheme={data?.delhivery?.hasApiKey ? 'green' : 'orange'}>
                {data?.delhivery?.hasApiKey ? 'Configured' : 'Setup required'}
              </Badge>
            </Flex>
            <Divider />

            <FormControl isRequired>
              <FormLabel>API Base URL</FormLabel>
              <Input
                value={b2cForm.apiBase}
                onChange={(event) =>
                  setB2CForm((previous) => ({ ...previous, apiBase: event.target.value }))
                }
                placeholder="https://track.delhivery.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Client Name</FormLabel>
              <Input
                value={b2cForm.clientName}
                onChange={(event) =>
                  setB2CForm((previous) => ({ ...previous, clientName: event.target.value }))
                }
                placeholder="Delhivery account/client name"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>API Token</FormLabel>
              <Input
                type="password"
                value={b2cForm.apiKey}
                onChange={(event) =>
                  setB2CForm((previous) => ({ ...previous, apiKey: event.target.value }))
                }
                placeholder={data?.delhivery?.apiKeyMasked || 'Enter Delhivery API token'}
              />
              <FormHelperText>Leave blank to keep the existing token.</FormHelperText>
            </FormControl>

            <Button
              colorScheme="blue"
              onClick={handleSaveB2C}
              isLoading={updateDelhivery.isPending}
              alignSelf={{ base: 'stretch', sm: 'flex-start' }}
            >
              Save B2C Credentials
            </Button>
          </VStack>
        </Box>

        <Box {...cardStyles}>
          <VStack spacing={4} align="stretch">
            <Flex justify="space-between" align="center" gap={3}>
              <Box>
                <Text fontSize="lg" fontWeight="700">Delhivery B2B</Text>
                <Text fontSize="sm" color="gray.500">JWT username/password authentication</Text>
              </Box>
              <Badge colorScheme={data?.delhiveryB2B?.hasPassword ? 'green' : 'orange'}>
                {data?.delhiveryB2B?.hasPassword ? 'Configured' : 'Setup required'}
              </Badge>
            </Flex>
            <Divider />

            <FormControl isRequired>
              <FormLabel>API Base URL</FormLabel>
              <Input
                value={b2bForm.apiBase}
                onChange={(event) =>
                  setB2BForm((previous) => ({ ...previous, apiBase: event.target.value }))
                }
                placeholder="https://ltl-clients-api.delhivery.com"
              />
            </FormControl>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  autoComplete="username"
                  value={b2bForm.username}
                  onChange={(event) =>
                    setB2BForm((previous) => ({ ...previous, username: event.target.value }))
                  }
                  placeholder="Delhivery B2B username"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={b2bForm.password}
                  onChange={(event) =>
                    setB2BForm((previous) => ({ ...previous, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep saved password"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Client ID</FormLabel>
                <Input
                  value={b2bForm.clientId}
                  onChange={(event) =>
                    setB2BForm((previous) => ({ ...previous, clientId: event.target.value }))
                  }
                  placeholder="Optional Delhivery client ID"
                />
                <FormHelperText>
                  Optional for authentication. Fill only if Delhivery assigns one for operations.
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Warehouse ID</FormLabel>
                <Input
                  value={b2bForm.warehouseId}
                  onChange={(event) =>
                    setB2BForm((previous) => ({ ...previous, warehouseId: event.target.value }))
                  }
                  placeholder="Optional default warehouse ID"
                />
                <FormHelperText>
                  Optional for login. Warehouse create/manifest flows can use the live warehouse details.
                </FormHelperText>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Freight Mode</FormLabel>
                <Select
                  value={b2bForm.freightMode}
                  onChange={(event) =>
                    setB2BForm((previous) => ({ ...previous, freightMode: event.target.value }))
                  }
                >
                  <option value="fop">FOP - Freight on pickup</option>
                  <option value="fod">FOD - Freight on delivery</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>First-mile Pickup</FormLabel>
                <Flex minH="40px" align="center" gap={3}>
                  <Switch
                    colorScheme="blue"
                    isChecked={b2bForm.fmPickup}
                    onChange={(event) =>
                      setB2BForm((previous) => ({
                        ...previous,
                        fmPickup: event.target.checked,
                      }))
                    }
                  />
                  <Text fontSize="sm" color="gray.600">
                    {b2bForm.fmPickup ? 'Enabled' : 'Disabled'}
                  </Text>
                </Flex>
              </FormControl>
            </SimpleGrid>

            <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
              <Button
                colorScheme="blue"
                onClick={handleSaveB2B}
                isLoading={updateDelhiveryB2B.isPending}
              >
                Save B2B Credentials
              </Button>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={handleTestB2B}
                isLoading={testDelhiveryB2B.isPending}
                isDisabled={!data?.delhiveryB2B?.hasPassword}
              >
                Test Saved Credentials
              </Button>
            </Flex>
            <Text fontSize="xs" color="gray.500">
              Save changes before testing. Password is never returned by the API.
            </Text>
          </VStack>
        </Box>
      </SimpleGrid>
    </Flex>
  )
}

export default CourierCredentials

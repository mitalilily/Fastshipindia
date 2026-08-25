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
  SimpleGrid,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import {
  useCourierCredentials,
  useTestBigshipCredentials,
  useTestDelhiveryB2BCredentials,
  useTestShipmozoCredentials,
  useUpdateBigshipCredentials,
  useUpdateDelhiveryB2BCredentials,
  useUpdateDelhiveryCredentials,
  useUpdateShipmozoCredentials,
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

const cleanOptionalSecret = (value = '') => {
  const trimmed = value.trim()
  return trimmed && !trimmed.includes('*') ? trimmed : ''
}

const CourierCredentials = () => {
  const toast = useToast()
  const { data, isLoading, error } = useCourierCredentials()
  const updateDelhivery = useUpdateDelhiveryCredentials()
  const updateDelhiveryB2B = useUpdateDelhiveryB2BCredentials()
  const updateBigship = useUpdateBigshipCredentials()
  const updateShipmozo = useUpdateShipmozoCredentials()
  const testDelhiveryB2B = useTestDelhiveryB2BCredentials()
  const testBigship = useTestBigshipCredentials()
  const testShipmozo = useTestShipmozoCredentials()

  const [b2cForm, setB2CForm] = useState({
    apiBase: 'https://track.delhivery.com',
    clientName: '',
    apiKey: '',
  })
  const [b2bForm, setB2BForm] = useState({
    apiBase: 'https://ltl-clients-api.delhivery.com',
    username: '',
    password: '',
  })
  const [bigshipForm, setBigshipForm] = useState({
    apiBase: 'https://api.bigship.direct',
    username: '',
    password: '',
    accessKey: '',
  })
  const [shipmozoForm, setShipmozoForm] = useState({
    apiBase: 'https://shipping-api.com/app/api/v1',
    username: '',
    password: '',
    publicKey: '',
    privateKey: '',
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
      })
    }
    if (data?.bigship) {
      setBigshipForm({
        apiBase: data.bigship.apiBase || 'https://api.bigship.direct',
        username: data.bigship.username || '',
        password: '',
        accessKey: '',
      })
    }
    if (data?.shipmozo) {
      setShipmozoForm({
        apiBase: data.shipmozo.apiBase || 'https://shipping-api.com/app/api/v1',
        username: data.shipmozo.username || '',
        password: '',
        publicKey: '',
        privateKey: '',
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

  const handleSaveBigship = () => {
    const missing = [
      !bigshipForm.apiBase.trim() && 'API Base URL',
      !bigshipForm.username.trim() && 'Username',
      !data?.bigship?.hasPassword && !bigshipForm.password.trim() && 'Password',
      !data?.bigship?.hasAccessKey && !bigshipForm.accessKey.trim() && 'Access Key',
    ].filter(Boolean)

    if (missing.length) {
      toast({
        title: 'Complete the required Bigship fields',
        description: `Missing: ${missing.join(', ')}`,
        status: 'warning',
      })
      return
    }

    const cleanAccessKey = cleanOptionalSecret(bigshipForm.accessKey)

    updateBigship.mutate(
      {
        apiBase: bigshipForm.apiBase.trim(),
        username: bigshipForm.username.trim(),
        ...(bigshipForm.password.trim() ? { password: bigshipForm.password.trim() } : {}),
        ...(cleanAccessKey ? { accessKey: cleanAccessKey } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: 'Bigship credentials saved', status: 'success' })
          setBigshipForm((previous) => ({ ...previous, password: '', accessKey: '' }))
        },
        onError: (saveError) =>
          toast({
            title: 'Failed to save Bigship credentials',
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

  const handleTestBigship = () => {
    const cleanAccessKey = cleanOptionalSecret(bigshipForm.accessKey)

    testBigship.mutate({
      apiBase: bigshipForm.apiBase.trim(),
      username: bigshipForm.username.trim(),
      ...(bigshipForm.password.trim() ? { password: bigshipForm.password.trim() } : {}),
      ...(cleanAccessKey ? { accessKey: cleanAccessKey } : {}),
    }, {
      onSuccess: (result) =>
        toast({
          title: 'Bigship authentication successful',
          description: result?.expiresAt ? `Token expires: ${result.expiresAt}` : undefined,
          status: 'success',
        }),
      onError: (testError) =>
        toast({
          title: 'Bigship authentication failed',
          description: getErrorMessage(testError, 'Check the saved username, password and access key.'),
          status: 'error',
        }),
    })
  }

  const handleSaveShipmozo = () => {
    const cleanPublicKey = cleanOptionalSecret(shipmozoForm.publicKey)
    const cleanPrivateKey = cleanOptionalSecret(shipmozoForm.privateKey)
    const missing = [
      !shipmozoForm.apiBase.trim() && 'API Base URL',
      !shipmozoForm.username.trim() && 'Username',
      !data?.shipmozo?.hasPassword && !shipmozoForm.password.trim() && 'Password',
      !data?.shipmozo?.hasPublicKey && !shipmozoForm.password.trim() && !cleanPublicKey && 'Public Key',
    ].filter(Boolean)

    if (missing.length) {
      toast({
        title: 'Complete the required Shipmozo fields',
        description: `Missing: ${missing.join(', ')}`,
        status: 'warning',
      })
      return
    }

    updateShipmozo.mutate(
      {
        apiBase: shipmozoForm.apiBase.trim().replace(/\/+$/, ''),
        username: shipmozoForm.username.trim(),
        ...(shipmozoForm.password.trim() ? { password: shipmozoForm.password.trim() } : {}),
        ...(cleanPublicKey ? { publicKey: cleanPublicKey } : {}),
        ...(cleanPrivateKey ? { privateKey: cleanPrivateKey } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: 'Shipmozo credentials saved', status: 'success' })
          setShipmozoForm((previous) => ({
            ...previous,
            password: '',
            publicKey: '',
            privateKey: '',
          }))
        },
        onError: (saveError) =>
          toast({
            title: 'Failed to save Shipmozo credentials',
            description: getErrorMessage(saveError, 'Please try again.'),
            status: 'error',
          }),
      },
    )
  }

  const handleTestShipmozo = () => {
    const cleanPublicKey = cleanOptionalSecret(shipmozoForm.publicKey)
    const cleanPrivateKey = cleanOptionalSecret(shipmozoForm.privateKey)

    testShipmozo.mutate({
      apiBase: shipmozoForm.apiBase.trim().replace(/\/+$/, ''),
      username: shipmozoForm.username.trim(),
      ...(shipmozoForm.password.trim() ? { password: shipmozoForm.password.trim() } : {}),
      ...(cleanPublicKey ? { publicKey: cleanPublicKey } : {}),
      ...(cleanPrivateKey ? { privateKey: cleanPrivateKey } : {}),
    }, {
      onSuccess: (result) =>
        toast({
          title: 'Shipmozo authentication successful',
          description:
            result?.publicKeyMatches === false
              ? 'Login verified. Saved public key differs from the key returned by Shipmozo.'
              : undefined,
          status: 'success',
        }),
      onError: (testError) =>
        toast({
          title: 'Shipmozo authentication failed',
          description: getErrorMessage(testError, 'Check username, password and API keys.'),
          status: 'error',
        }),
    })
  }

  const renderBigshipCredentialCard = ({ title, subtitle }) => {
    const hasPasswordForTest = data?.bigship?.hasPassword || Boolean(bigshipForm.password.trim())
    const hasAccessKeyForTest =
      data?.bigship?.hasAccessKey || Boolean(cleanOptionalSecret(bigshipForm.accessKey))

    return (
    <Box {...cardStyles}>
      <VStack spacing={4} align="stretch">
        <Flex justify="space-between" align="center" gap={3}>
          <Box>
            <Text fontSize="lg" fontWeight="700">{title}</Text>
            <Text fontSize="sm" color="gray.500">{subtitle}</Text>
          </Box>
          <Badge colorScheme={data?.bigship?.hasPassword && data?.bigship?.hasAccessKey ? 'green' : 'orange'}>
            {data?.bigship?.hasPassword && data?.bigship?.hasAccessKey ? 'Configured' : 'Setup required'}
          </Badge>
        </Flex>
        <Divider />

        <FormControl isRequired>
          <FormLabel>API Base URL</FormLabel>
          <Input
            value={bigshipForm.apiBase}
            onChange={(event) =>
              setBigshipForm((previous) => ({ ...previous, apiBase: event.target.value }))
            }
            placeholder="https://api.bigship.direct"
          />
        </FormControl>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel>Username</FormLabel>
            <Input
              autoComplete="username"
              value={bigshipForm.username}
              onChange={(event) =>
                setBigshipForm((previous) => ({ ...previous, username: event.target.value }))
              }
              placeholder="Bigship username"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              autoComplete="new-password"
              value={bigshipForm.password}
              onChange={(event) =>
                setBigshipForm((previous) => ({ ...previous, password: event.target.value }))
              }
              placeholder="Leave blank to keep saved password"
            />
          </FormControl>
        </SimpleGrid>
        <FormControl isRequired>
          <FormLabel>Access Key</FormLabel>
          <Input
            type="password"
            value={bigshipForm.accessKey}
            onChange={(event) =>
              setBigshipForm((previous) => ({ ...previous, accessKey: event.target.value }))
            }
            placeholder={
              data?.bigship?.hasAccessKey
                ? 'Saved access key hidden - paste full key to replace'
                : 'Enter full Bigship access key'
            }
          />
          <FormHelperText>
            Paste the full access key to replace or test a new value.
          </FormHelperText>
        </FormControl>

        <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
          <Button
            colorScheme="blue"
            onClick={handleSaveBigship}
            isLoading={updateBigship.isPending}
          >
            Save Bigship Credentials
          </Button>
          <Button
            variant="outline"
            colorScheme="blue"
            onClick={handleTestBigship}
            isLoading={testBigship.isPending}
            isDisabled={!hasPasswordForTest || !hasAccessKeyForTest}
          >
            Test Bigship Credentials
          </Button>
        </Flex>
        <Text fontSize="xs" color="gray.500">
          Fill password/access key to test new values, or leave blank to test saved values.
        </Text>
      </VStack>
    </Box>
    )
  }

  const renderShipmozoCredentialCard = ({ title, subtitle }) => {
    const hasPasswordForTest =
      data?.shipmozo?.hasPassword || Boolean(shipmozoForm.password.trim())
    const hasPublicKeyForTest =
      data?.shipmozo?.hasPublicKey || Boolean(cleanOptionalSecret(shipmozoForm.publicKey))
    const hasPrivateKeyForTest =
      data?.shipmozo?.hasPrivateKey || Boolean(cleanOptionalSecret(shipmozoForm.privateKey))

    return (
      <Box {...cardStyles}>
        <VStack spacing={4} align="stretch">
          <Flex justify="space-between" align="center" gap={3}>
            <Box>
              <Text fontSize="lg" fontWeight="700">{title}</Text>
              <Text fontSize="sm" color="gray.500">{subtitle}</Text>
            </Box>
            <Badge colorScheme={data?.shipmozo?.hasPublicKey && data?.shipmozo?.hasPrivateKey ? 'green' : 'orange'}>
              {data?.shipmozo?.hasPublicKey && data?.shipmozo?.hasPrivateKey ? 'Configured' : 'Setup required'}
            </Badge>
          </Flex>
          <Divider />

          <FormControl isRequired>
            <FormLabel>API Base URL</FormLabel>
            <Input
              value={shipmozoForm.apiBase}
              onChange={(event) =>
                setShipmozoForm((previous) => ({ ...previous, apiBase: event.target.value }))
              }
              placeholder="https://shipping-api.com/app/api/v1"
            />
          </FormControl>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel>Username</FormLabel>
              <Input
                autoComplete="username"
                value={shipmozoForm.username}
                onChange={(event) =>
                  setShipmozoForm((previous) => ({ ...previous, username: event.target.value }))
                }
                placeholder="Shipmozo username"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={shipmozoForm.password}
                onChange={(event) =>
                  setShipmozoForm((previous) => ({ ...previous, password: event.target.value }))
                }
                placeholder="Leave blank to keep saved password"
              />
            </FormControl>
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel>Public Key</FormLabel>
              <Input
                type="password"
                value={shipmozoForm.publicKey}
                onChange={(event) =>
                  setShipmozoForm((previous) => ({ ...previous, publicKey: event.target.value }))
                }
                placeholder={data?.shipmozo?.hasPublicKey ? 'Saved public key hidden' : 'Shipmozo public key'}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Private Key</FormLabel>
              <Input
                type="password"
                value={shipmozoForm.privateKey}
                onChange={(event) =>
                  setShipmozoForm((previous) => ({ ...previous, privateKey: event.target.value }))
                }
                placeholder={data?.shipmozo?.hasPrivateKey ? 'Saved private key hidden' : 'Auto-filled from login when saved'}
              />
            </FormControl>
          </SimpleGrid>

          <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
            <Button
              colorScheme="blue"
              onClick={handleSaveShipmozo}
              isLoading={updateShipmozo.isPending}
            >
              Save Shipmozo Credentials
            </Button>
            <Button
              variant="outline"
              colorScheme="blue"
              onClick={handleTestShipmozo}
              isLoading={testShipmozo.isPending}
              isDisabled={!hasPasswordForTest && !(hasPublicKeyForTest && hasPrivateKeyForTest)}
            >
              Test Shipmozo Credentials
            </Button>
          </Flex>
          <Text fontSize="xs" color="gray.500">
            Save username/password to refresh the private key from Shipmozo login.
          </Text>
        </VStack>
      </Box>
    )
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
          Configure courier API credentials for live bookings.
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

        {renderBigshipCredentialCard({
          title: 'Bigship B2C',
          subtitle: 'B2C username/password/access key authentication',
        })}
        {renderBigshipCredentialCard({
          title: 'Bigship B2B',
          subtitle: 'B2B username/password/access key authentication',
        })}
        {renderShipmozoCredentialCard({
          title: 'Shipmozo B2C',
          subtitle: 'B2C public/private key authentication',
        })}
        {renderShipmozoCredentialCard({
          title: 'Shipmozo B2B',
          subtitle: 'B2B public/private key authentication',
        })}
      </SimpleGrid>
    </Flex>
  )
}

export default CourierCredentials

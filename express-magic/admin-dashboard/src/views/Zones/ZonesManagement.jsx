// src/pages/ZonesManagement.jsx
import { AddIcon, DeleteIcon, EditIcon, LinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Tooltip,
  Wrap,
  WrapItem,
  useDisclosure,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import CustomModal from 'components/Modal/CustomModal'
import TableFilters from 'components/Tables/TableFilters'
import { useZones } from 'hooks/useZones'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min'
import { b2bAdminService } from 'services/b2bAdmin.service'
import { GenericTable } from 'views/Dashboard/Tables/components/GenericTable'

const ZonesManagement = ({ defaultBusinessType = null }) => {
  const history = useHistory()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // If defaultBusinessType is provided, use it directly (no tabs)
  // Otherwise, show tabs to switch between B2C and B2B
  const [tabIndex, setTabIndex] = useState(0)
  const businessType = defaultBusinessType || (tabIndex === 0 ? 'B2C' : 'B2B')
  const showTabs = defaultBusinessType === null

  const [zoneForm, setZoneForm] = useState({
    id: null,
    code: '',
    name: '',
    description: '',
    business_type: businessType,
    states: [],
    pincodes: [],
  })
  const [isEdit, setIsEdit] = useState(false)

  // Zones are always global - no courier filtering needed

  const { zones, isLoading, createZone, updateZone, deleteZone } = useZones(businessType, {})

  const isB2B = businessType === 'B2B'

  const { data: stateOptions = [], isLoading: isLoadingStates } = useQuery({
    queryKey: ['b2b-states'],
    queryFn: () => b2bAdminService.getStates(),
    enabled: isB2B,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const [stateSearch, setStateSearch] = useState('')
  const [pincodeSearch, setPincodeSearch] = useState('')
  const [hasHydratedPincodes, setHasHydratedPincodes] = useState(false)
  const filteredStateOptions = isB2B
    ? stateOptions.filter((state) =>
        state?.toLowerCase().includes(stateSearch.trim().toLowerCase()),
      )
    : []

  const { data: pincodeOptions = [], isLoading: isLoadingPincodes } = useQuery({
    queryKey: ['b2b-zone-pincode-options', zoneForm.states, isEdit ? zoneForm.id : null],
    queryFn: () => b2bAdminService.getZonePincodeOptions(zoneForm.states, isEdit ? zoneForm.id : null),
    enabled: isB2B && isOpen && zoneForm.states.length > 0,
  })
  const filteredPincodeOptions = pincodeOptions.filter((option) => {
    const search = pincodeSearch.trim().toLowerCase()
    return !search || `${option.pincode} ${option.city} ${option.state}`.toLowerCase().includes(search)
  })

  // Zones are always global - no courier filtering needed
  const zoneFilters = []

  // Validation state
  const [errors, setErrors] = useState({ code: '', name: '', states: '', pincodes: '' })

  useEffect(() => {
    if (!isEdit || hasHydratedPincodes || pincodeOptions.length === 0) return
    setZoneForm((current) => ({
      ...current,
      pincodes: pincodeOptions.filter((option) => option.selected).map((option) => option.pincode),
    }))
    setHasHydratedPincodes(true)
  }, [hasHydratedPincodes, isEdit, pincodeOptions])

  useEffect(() => {
    // Reset form and errors when tab changes
    setZoneForm({
      id: null,
      code: '',
      name: '',
      description: '',
      business_type: businessType,
      is_global: true,
      states: [],
      pincodes: [],
    })
    setErrors({ code: '', name: '', states: '', pincodes: '' })
    setStateSearch('')
    setPincodeSearch('')
  }, [businessType])

  const openCreateModal = () => {
    setIsEdit(false)
    setZoneForm({
      id: null,
      code: '',
      name: '',
      description: '',
      business_type: businessType,
      is_global: true,
      states: [],
      pincodes: [],
    })
    setErrors({ code: '', name: '', states: '', pincodes: '' })
    setStateSearch('')
    setPincodeSearch('')
    setHasHydratedPincodes(true)
    onOpen()
  }

  const openEditModal = (zone) => {
    setIsEdit(true)
    setZoneForm({
      ...zone,
      states: Array.isArray(zone.states) ? zone.states : zone.states ? [zone.states] : [],
      pincodes: [],
    })
    // Zones are always global - no courier selection needed
    setErrors({ code: '', name: '', states: '', pincodes: '' })
    setStateSearch('')
    setPincodeSearch('')
    setHasHydratedPincodes(false)
    onOpen()
  }

  const validateForm = () => {
    const newErrors = { code: '', name: '', states: '', pincodes: '' }
    let valid = true

    if (!zoneForm.code.trim()) {
      newErrors.code = 'Zone code is required'
      valid = false
    }
    if (!zoneForm.name.trim()) {
      newErrors.name = 'Zone name is required'
      valid = false
    }
    // Zones are always global - no courier selection needed (industry standard)
    if (businessType === 'B2B' && (!zoneForm.states || zoneForm.states.length === 0)) {
      newErrors.states = 'Select at least one state for this zone'
      valid = false
    }
    if (businessType === 'B2B' && (!zoneForm.pincodes || zoneForm.pincodes.length === 0)) {
      newErrors.pincodes = 'Select at least one pincode for this zone'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSaveZone = () => {
    if (!validateForm()) return

    // Zones are always global (industry standard)
    // Courier selection is only for rates, not zones
    const payload = {
      ...zoneForm,
      business_type: businessType,
    }

    const onSuccessHandler = () => {
      setZoneForm({
        id: null,
        code: '',
        name: '',
        description: '',
        business_type: businessType,
        states: [],
        pincodes: [],
      })
      setErrors({ code: '', name: '', states: '', pincodes: '' })
      setStateSearch('')
      setPincodeSearch('')
      onClose()
    }

    if (isEdit) {
      updateZone.mutate(payload, { onSuccess: onSuccessHandler })
    } else {
      createZone.mutate(payload, { onSuccess: onSuccessHandler })
    }
  }

  const handleDeleteZone = (id) => {
    deleteZone.mutate(id)
  }

  return (
    <Flex direction="column" pt={showTabs ? { base: '120px', md: '75px' } : 0}>
      {showTabs ? (
      <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="brand" variant="unstyled">
        <Box bg="gray.50" borderRadius="xl" p={2} mb={6} borderWidth="1px" borderColor="gray.100">
          <TabList gap={2}>
            <Tab
              flex={1}
              px={6}
              py={4}
              borderRadius="lg"
              alignItems="flex-start"
              _selected={{ bg: 'white', shadow: 'md', color: 'brand.600', cursor: 'pointer' }}
              _focus={{ boxShadow: 'none' }}
            >
              <Stack spacing={1} align="flex-start" width="100%">
                <HStack spacing={2}>
                  <Tag colorScheme="purple" size="sm">
                    B2C
                  </Tag>
                  <Text fontWeight="semibold">Consumer Zones</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  Use for standard D2C pricing where pincodes are map-managed manually.
                </Text>
              </Stack>
            </Tab>
            <Tab
              flex={1}
              px={6}
              py={4}
              borderRadius="lg"
              alignItems="flex-start"
              _selected={{ bg: 'white', shadow: 'md', color: 'brand.600', cursor: 'pointer' }}
              _focus={{ boxShadow: 'none' }}
            >
              <Stack spacing={1} align="flex-start" width="100%">
                <HStack spacing={2}>
                  <Tag colorScheme="blue" size="sm">
                    B2B
                  </Tag>
                  <Text fontWeight="semibold">Enterprise Zones</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  State-driven zones that auto-map pincodes and tie into the rate matrix.
                </Text>
              </Stack>
            </Tab>
          </TabList>
        </Box>

        <TabPanels>
          {['B2C', 'B2B'].map((type) => (
            <TabPanel key={type}>
              <Flex
                justify={businessType === 'B2C' ? 'flex-end' : 'space-between'}
                align="center"
                mb={4}
              >
                {/* Zones are always global - no filters needed */}
              </Flex>

              <GenericTable
                title={`${type} Zones`}
                data={zones}
                titleActions={
                  <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={openCreateModal}>
                    Add {businessType} Zone
                  </Button>
                }
                captions={
                  businessType === 'B2B'
                    ? [
                        'id',
                        'Code',
                        'Name',
                        'Description',
                        'States',
                        'Created At',
                      ]
                    : ['id', 'Code', 'Name', 'Description', 'Created At']
                }
                columnKeys={
                  businessType === 'B2B'
                    ? [
                        'id',
                        'code',
                        'name',
                        'description',
                        'states',
                        'created_at',
                      ]
                    : ['id', 'code', 'name', 'description', 'created_at']
                }
                loading={isLoading}
                renderActions={(row) => (
                  <Flex gap={2}>
                    <IconButton
                      aria-label="Edit"
                      icon={<EditIcon />}
                      size="sm"
                      colorScheme="yellow"
                      onClick={() => openEditModal(row)}
                    />
                    <IconButton
                      aria-label="Delete"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDeleteZone(row.id)}
                    />
                    {businessType === 'B2B' ? (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<LinkIcon boxSize={4} />}
                        borderRadius="md"
                        _hover={{ bg: 'blue.600', transform: 'scale(1.05)' }}
                        onClick={() => history.push(`/admin/zones-mappings/${row.id}`)}
                      >
                        Mappings
                      </Button>
                    ) : null}
                  </Flex>
                )}
                paginated={false}
                renderers={{
                  created_at: (row) =>
                    new Date(row).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  name: (row) => <Text fontStyle="italic">{row}</Text>,
                  states: (value) => {
                    if (!Array.isArray(value) || value.length === 0) return '-'
                    const visible = value.slice(0, 3)
                    const extraCount = value.length - visible.length
                    return (
                      <HStack spacing={1} flexWrap="wrap">
                        {visible.map((state) => (
                          <Tag key={state} size="sm" colorScheme="blue">
                            {state}
                          </Tag>
                        ))}
                        {extraCount > 0 && (
                          <Tooltip label={value.join(', ')}>
                            <Tag size="sm" colorScheme="gray">
                              +{extraCount}
                            </Tag>
                          </Tooltip>
                        )}
                      </HStack>
                    )
                  },
                }}
                w="100%"
              />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      ) : (
        <Box>
          <Flex
            justify={businessType === 'B2C' ? 'flex-end' : 'space-between'}
            align="center"
            mb={4}
          >
            {/* Zones are always global - no filters needed */}
          </Flex>

          <GenericTable
            title={`${businessType} Zones`}
            data={zones}
            titleActions={
              <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={openCreateModal}>
                Add {businessType} Zone
              </Button>
            }
            captions={
              businessType === 'B2B'
                ? [
                    'id',
                    'Code',
                    'Name',
                    'Description',
                    'States',
                    'Created At',
                  ]
                : ['id', 'Code', 'Name', 'Description', 'Created At']
            }
            columnKeys={
              businessType === 'B2B'
                ? [
                    'id',
                    'code',
                    'name',
                    'description',
                    'states',
                    'created_at',
                  ]
                : ['id', 'code', 'name', 'description', 'created_at']
            }
            loading={isLoading}
            renderActions={(row) => (
              <Flex gap={2}>
                <IconButton
                  aria-label="Edit"
                  icon={<EditIcon />}
                  size="sm"
                  colorScheme="yellow"
                  onClick={() => openEditModal(row)}
                />
                <IconButton
                  aria-label="Delete"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleDeleteZone(row.id)}
                />
                {businessType === 'B2B' ? (
                  <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<LinkIcon boxSize={4} />}
                    borderRadius="md"
                    _hover={{ bg: 'blue.600', transform: 'scale(1.05)' }}
                    onClick={() => history.push(`/admin/zones-mappings/${row.id}`)}
                  >
                    Mappings
                  </Button>
                ) : null}
              </Flex>
            )}
            paginated={false}
            renderers={{
              created_at: (row) =>
                new Date(row).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              name: (row) => <Text fontStyle="italic">{row}</Text>,
              states: (value) => {
                if (!Array.isArray(value) || value.length === 0) return '-'
                const visible = value.slice(0, 3)
                const extraCount = value.length - visible.length
                return (
                  <HStack spacing={1} flexWrap="wrap">
                    {visible.map((state) => (
                      <Tag key={state} size="sm" colorScheme="blue">
                        {state}
                      </Tag>
                    ))}
                    {extraCount > 0 && (
                      <Tooltip label={value.join(', ')}>
                        <Tag size="sm" colorScheme="gray">
                          +{extraCount}
                        </Tag>
                      </Tooltip>
                    )}
                  </HStack>
                )
              },
            }}
            w="100%"
          />
        </Box>
      )}

      {/* Add/Edit Zone Modal */}
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? 'Edit Zone' : 'Add New Zone'}
        footer={
          <>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveZone}
              isLoading={isEdit ? updateZone.isPending : createZone.isPending}
            >
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <Stack spacing={6}>
          <FormControl isRequired isInvalid={Boolean(errors.code)}>
            <FormLabel>Zone Code</FormLabel>
            <Input
              placeholder="e.g. A"
              value={zoneForm.code}
              onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
            />
            <FormErrorMessage>{errors.code}</FormErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={Boolean(errors.name)}>
            <FormLabel>Zone Name</FormLabel>
            <Input
              placeholder="e.g. Central Metro"
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            />
            <FormErrorMessage>{errors.name}</FormErrorMessage>
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <Input
              placeholder="Optional note that the ops team will see"
              value={zoneForm.description}
              onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
            />
            <FormHelperText>Helps teammates understand what this zone represents.</FormHelperText>
          </FormControl>

          {businessType === 'B2B' && (
            <Stack spacing={5} borderWidth="1px" borderRadius="lg" p={5} bg="blue.50">
              <Text fontWeight="semibold" fontSize="lg" color="blue.700">
                B2B Zone Coverage
              </Text>
              <Text fontSize="sm" color="gray.600">
                Zones are shared across all couriers. Each courier will have different rates for the same zone pairs.
                You'll select the courier when creating rates.
              </Text>

              <FormControl isRequired isInvalid={Boolean(errors.states)}>
                <Flex align="center" justify="space-between" mb={2}>
                  <FormLabel m={0}>States in this zone</FormLabel>
                  {isLoadingStates && <Spinner size="sm" />}
                </Flex>

                <Input
                  placeholder="Quick search…"
                  size="sm"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  mb={3}
                />

                {zoneForm.states?.length > 0 && (
                  <Box mb={3}>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Selected ({zoneForm.states.length}):
                    </Text>
                    <Wrap spacing={2}>
                      {zoneForm.states.map((state) => (
                        <WrapItem key={state}>
                          <Tag size="sm" colorScheme="blue">
                            {state}
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                <Box
                  borderWidth="1px"
                  borderRadius="md"
                  maxH="250px"
                  overflowY="auto"
                  px={3}
                  py={3}
                  bg="white"
                >
                  <CheckboxGroup
                    value={zoneForm.states || []}
                    onChange={(values) => {
                      const nextStates = Array.isArray(values) ? values.map((val) => String(val)) : []
                      const retainedPincodes = pincodeOptions
                        .filter(
                          (option) =>
                            nextStates.includes(option.state) &&
                            (zoneForm.pincodes || []).includes(option.pincode),
                        )
                        .map((option) => option.pincode)
                      setZoneForm({ ...zoneForm, states: nextStates, pincodes: retainedPincodes })
                      setHasHydratedPincodes(true)
                    }}
                  >
                    {filteredStateOptions.length > 0 ? (
                      <SimpleGrid columns={{ base: 1, sm: 2 }} spacingY={2} spacingX={3}>
                        {filteredStateOptions.map((state) => (
                          <Checkbox key={state} value={state} isDisabled={isLoadingStates}>
                            {state}
                          </Checkbox>
                        ))}
                      </SimpleGrid>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        {stateSearch ? 'No states match your search.' : 'States list unavailable.'}
                      </Text>
                    )}
                  </CheckboxGroup>
                </Box>
                <FormHelperText>
                  Select a state, then choose only the pincodes that should belong to this zone.
                </FormHelperText>
                <FormErrorMessage>{errors.states}</FormErrorMessage>
              </FormControl>

              {zoneForm.states.length > 0 && (
                <FormControl isRequired isInvalid={Boolean(errors.pincodes)}>
                  <Flex align="center" justify="space-between" mb={2}>
                    <FormLabel m={0}>Pincodes in this zone</FormLabel>
                    {isLoadingPincodes && <Spinner size="sm" />}
                  </Flex>

                  <Input
                    placeholder="Search pincode, city or state..."
                    size="sm"
                    value={pincodeSearch}
                    onChange={(event) => setPincodeSearch(event.target.value)}
                    mb={3}
                  />

                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontSize="sm" color="gray.600">
                      Selected ({zoneForm.pincodes.length})
                    </Text>
                    <HStack spacing={2}>
                      <Button
                        size="xs"
                        variant="link"
                        onClick={() =>
                          setZoneForm({
                            ...zoneForm,
                            pincodes: Array.from(
                              new Set([
                                ...zoneForm.pincodes,
                                ...filteredPincodeOptions.map((option) => option.pincode),
                              ]),
                            ),
                          })
                        }
                        isDisabled={filteredPincodeOptions.length === 0}
                      >
                        Select visible
                      </Button>
                      <Button
                        size="xs"
                        variant="link"
                        colorScheme="red"
                        onClick={() => setZoneForm({ ...zoneForm, pincodes: [] })}
                        isDisabled={zoneForm.pincodes.length === 0}
                      >
                        Clear
                      </Button>
                    </HStack>
                  </Flex>

                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    maxH="250px"
                    overflowY="auto"
                    px={3}
                    py={3}
                    bg="white"
                  >
                    <CheckboxGroup
                      value={zoneForm.pincodes}
                      onChange={(values) =>
                        setZoneForm({
                          ...zoneForm,
                          pincodes: Array.isArray(values) ? values.map(String) : [],
                        })
                      }
                    >
                      {filteredPincodeOptions.length > 0 ? (
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacingY={2} spacingX={3}>
                          {filteredPincodeOptions.map((option) => (
                            <Checkbox key={option.pincode} value={option.pincode}>
                              <Text as="span" fontWeight="semibold">{option.pincode}</Text>{' '}
                              <Text as="span" fontSize="xs" color="gray.500">
                                {option.city}
                              </Text>
                            </Checkbox>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          {isLoadingPincodes
                            ? 'Loading pincodes...'
                            : pincodeSearch
                            ? 'No pincodes match your search.'
                            : 'No unassigned pincodes are available for the selected states.'}
                        </Text>
                      )}
                    </CheckboxGroup>
                  </Box>
                  <FormHelperText>
                    Pincodes already used in another zone are hidden.
                  </FormHelperText>
                  <FormErrorMessage>{errors.pincodes}</FormErrorMessage>
                </FormControl>
              )}
            </Stack>
          )}
        </Stack>
      </CustomModal>
    </Flex>
  )
}

export default ZonesManagement

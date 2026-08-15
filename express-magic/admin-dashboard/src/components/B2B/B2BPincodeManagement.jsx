import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconDownload, IconFileImport, IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useCouriers } from '../../hooks/useCouriers'
import {
  AdminSelect,
  DataTable,
  PrimaryButton,
  SearchInput,
  SoftBadge,
  adminUi,
} from '../AdminUI/AdminPage'
import CustomModal from '../Modal/CustomModal'
import { b2bAdminService } from '../../services/b2bAdmin.service'

const PAGE_SIZE = 20

const emptyForm = {
  id: '',
  pincode: '',
  city: '',
  state: '',
  zoneId: '',
  courierId: '',
  serviceProvider: '',
  isOda: false,
  isRemote: false,
  isMall: false,
  isSez: false,
  isAirport: false,
  isHighSecurity: false,
}

const flagFields = [
  ['isOda', 'ODA'],
  ['isRemote', 'Remote'],
  ['isMall', 'Mall'],
  ['isSez', 'SEZ / Port'],
  ['isAirport', 'Airport'],
  ['isHighSecurity', 'High Security'],
]

const normaliseRow = (row) => ({
  ...row,
  zoneId: row.zoneId ?? row.zone_id ?? '',
  courierId: row.courierId ?? row.courier_id ?? '',
  serviceProvider: row.serviceProvider ?? row.service_provider ?? '',
  isOda: row.isOda ?? row.is_oda ?? false,
  isRemote: row.isRemote ?? row.is_remote ?? false,
  isMall: row.isMall ?? row.is_mall ?? false,
  isSez: row.isSez ?? row.is_sez ?? false,
  isAirport: row.isAirport ?? row.is_airport ?? false,
  isHighSecurity: row.isHighSecurity ?? row.is_high_security ?? false,
})

const downloadTemplate = () => {
  const csv = [
    'pincode,city,state,zone_code,is_oda,is_remote,is_mall,is_sez,is_airport,is_high_security',
    '110001,New Delhi,Delhi,A_B2B,false,false,false,false,false,false',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'b2b-pincode-import-template.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const B2BPincodeManagement = () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const formModal = useDisclosure()
  const importModal = useDisclosure()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [courierFilter, setCourierFilter] = useState('')
  const [flagFilter, setFlagFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [importFile, setImportFile] = useState(null)
  const [importZoneId, setImportZoneId] = useState('')
  const { data: couriers = [] } = useCouriers({ businessType: 'b2b' })

  const selectedCourierFilter = useMemo(() => {
    if (!courierFilter) return { courierId: '', serviceProvider: '' }
    const [courierId, serviceProvider] = courierFilter.split('|')
    return { courierId, serviceProvider: serviceProvider || '' }
  }, [courierFilter])

  const flagQuery = useMemo(() => (flagFilter ? { [flagFilter]: true } : {}), [flagFilter])

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['b2b-zones', 'pincode-management'],
    queryFn: () => b2bAdminService.getZones({}),
  })

  const { data: pincodeResult, isLoading } = useQuery({
    queryKey: ['b2b-pincodes', page, search, zoneFilter, courierFilter, flagFilter],
    queryFn: () =>
      b2bAdminService.getPincodes({
        page,
        limit: PAGE_SIZE,
        pincode: search || undefined,
        zone_id: zoneFilter || undefined,
        courier_id: selectedCourierFilter.courierId || undefined,
        service_provider: selectedCourierFilter.serviceProvider || undefined,
        ...flagQuery,
        sortBy: 'pincode',
        sortOrder: 'asc',
      }),
    keepPreviousData: true,
  })

  const rows = (pincodeResult?.data || []).map(normaliseRow)
  const total = Number(pincodeResult?.pagination?.total || 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const zoneById = useMemo(
    () => new Map(zones.map((zone) => [String(zone.id), zone])),
    [zones],
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['b2b-pincodes'] })
    queryClient.invalidateQueries({ queryKey: ['b2b-zones'] })
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? b2bAdminService.updatePincode(payload.id, payload)
        : b2bAdminService.createPincode(payload),
    onSuccess: (_, payload) => {
      refresh()
      formModal.onClose()
      toast({
        title: payload.id ? 'Pincode updated' : 'Pincode added',
        status: 'success',
        duration: 2500,
      })
    },
    onError: (error) =>
      toast({
        title: 'Unable to save pincode',
        description: error?.response?.data?.error || error?.message,
        status: 'error',
        duration: 4500,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => b2bAdminService.deletePincode(id),
    onSuccess: () => {
      refresh()
      toast({ title: 'Pincode deleted', status: 'success', duration: 2500 })
    },
    onError: (error) =>
      toast({
        title: 'Unable to delete pincode',
        description: error?.response?.data?.error || error?.message,
        status: 'error',
      }),
  })

  const importMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData()
      formData.append('file', importFile)
      if (importZoneId) formData.append('defaultZoneId', importZoneId)
      if (selectedCourierFilter.courierId) {
        formData.append('courierId', selectedCourierFilter.courierId)
      }
      if (selectedCourierFilter.serviceProvider) {
        formData.append('serviceProvider', selectedCourierFilter.serviceProvider)
      }
      return b2bAdminService.importPincodes(formData)
    },
    onSuccess: (result) => {
      refresh()
      importModal.onClose()
      setImportFile(null)
      toast({
        title: 'Pincode CSV processed',
        description: `${result.inserted || 0} added, ${result.updated || 0} updated, ${(result.skipped || []).length} skipped.`,
        status: (result.skipped || []).length ? 'warning' : 'success',
        duration: 5000,
      })
    },
    onError: (error) =>
      toast({
        title: 'Pincode import failed',
        description: error?.response?.data?.error || error?.message,
        status: 'error',
        duration: 4500,
      }),
  })

  const openAdd = () => {
    setForm({
      ...emptyForm,
      zoneId: zoneFilter || zones[0]?.id || '',
      courierId: selectedCourierFilter.courierId,
      serviceProvider: selectedCourierFilter.serviceProvider,
    })
    setErrors({})
    formModal.onOpen()
  }

  const openEdit = (row) => {
    setForm({ ...emptyForm, ...normaliseRow(row) })
    setErrors({})
    formModal.onOpen()
  }

  const validateAndSave = () => {
    const nextErrors = {}
    if (!/^\d{6}$/.test(String(form.pincode || '').trim())) {
      nextErrors.pincode = 'Enter a valid 6-digit pincode'
    }
    if (!String(form.city || '').trim()) nextErrors.city = 'City is required'
    if (!String(form.state || '').trim()) nextErrors.state = 'State is required'
    if (!form.zoneId) nextErrors.zoneId = 'Select a B2B zone'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    saveMutation.mutate({
      id: form.id || undefined,
      pincode: String(form.pincode).trim(),
      city: String(form.city).trim(),
      state: String(form.state).trim(),
      zoneId: form.zoneId,
      courierId: form.courierId || undefined,
      serviceProvider: form.serviceProvider || undefined,
      flags: Object.fromEntries(flagFields.map(([key]) => [key, Boolean(form[key])])),
    })
  }

  const columns = [
    { key: 'pincode', label: 'Pincode', w: '125px' },
    { key: 'city', label: 'City', w: '170px' },
    { key: 'state', label: 'State', w: '180px' },
    {
      key: 'zoneId',
      label: 'Zone',
      w: '170px',
      render: (zoneId) => {
        const zone = zoneById.get(String(zoneId))
        return zone ? `${zone.code} — ${zone.name}` : 'Unassigned'
      },
    },
    {
      key: 'courierId',
      label: 'Courier',
      w: '220px',
      render: (courierId, row) => {
        if (!courierId && !row.serviceProvider) return <Text color={adminUi.muted}>Global</Text>
        const courier = couriers.find((item) => String(item.id) === String(courierId))
        return courier?.name || row.serviceProvider || `Courier #${courierId}`
      },
    },
    {
      key: 'attributes',
      label: 'Attributes',
      render: (_, row) => {
        const activeFlags = flagFields.filter(([key]) => row[key])
        return activeFlags.length ? (
          <HStack spacing={1} wrap="wrap">
            {activeFlags.map(([key, label]) => (
              <SoftBadge key={key} colorScheme="purple">
                {label}
              </SoftBadge>
            ))}
          </HStack>
        ) : (
          <Text color={adminUi.muted}>Standard</Text>
        )
      },
    },
  ]

  return (
    <Stack spacing={4}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap">
        <HStack spacing={3} wrap="wrap" flex={1}>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value.replace(/\D/g, '').slice(0, 6))
              setPage(1)
            }}
            placeholder="Search pincode"
            maxW="260px"
          />
          <AdminSelect
            value={zoneFilter}
            onChange={(value) => {
              setZoneFilter(value)
              setPage(1)
            }}
            maxW="260px"
            isDisabled={zonesLoading}
          >
            <option value="">All zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.code} — {zone.name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={courierFilter}
            onChange={(value) => {
              setCourierFilter(value)
              setPage(1)
            }}
            maxW="290px"
          >
            <option value="">All couriers</option>
            {couriers.map((courier) => {
              const provider = courier.serviceProvider || courier.service_provider || ''
              return (
                <option key={courier.id} value={`${courier.id}|${provider}`}>
                  {courier.name}
                </option>
              )
            })}
          </AdminSelect>
          <AdminSelect
            value={flagFilter}
            onChange={(value) => {
              setFlagFilter(value)
              setPage(1)
            }}
            maxW="220px"
          >
            <option value="">All flags</option>
            <option value="is_oda">ODA</option>
            <option value="is_remote">Remote</option>
            <option value="is_mall">Mall</option>
            <option value="is_sez">SEZ / Port</option>
            <option value="is_airport">Airport</option>
            <option value="is_high_security">High Security</option>
          </AdminSelect>
          <Text color={adminUi.muted} fontSize="sm">
            {total.toLocaleString('en-IN')} pincodes
          </Text>
        </HStack>

        <HStack spacing={2} wrap="wrap">
          <Button leftIcon={<IconDownload size={17} />} onClick={downloadTemplate} variant="outline">
            Template
          </Button>
          <Button leftIcon={<IconFileImport size={17} />} onClick={importModal.onOpen} variant="outline">
            Import CSV
          </Button>
          <PrimaryButton leftIcon={<IconPlus size={18} />} onClick={openAdd} isDisabled={!zones.length}>
            Add Pincode
          </PrimaryButton>
        </HStack>
      </Flex>

      {!zonesLoading && !zones.length ? (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          Add a B2B zone first; every pincode must belong to a zone.
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        rowKey="id"
        minW="1280px"
        emptyText="No pincodes found. Use Add Pincode or Import CSV to configure coverage."
        actions={(row) => (
          <HStack spacing={2} justify="flex-end">
            <IconButton
              aria-label="Edit pincode"
              icon={<EditIcon />}
              size="sm"
              variant="outline"
              onClick={() => openEdit(row)}
            />
            <IconButton
              aria-label="Delete pincode"
              icon={<DeleteIcon />}
              size="sm"
              colorScheme="red"
              variant="outline"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete pincode ${row.pincode}?`)) deleteMutation.mutate(row.id)
              }}
            />
          </HStack>
        )}
        footer={
          <HStack>
            <Button size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} isDisabled={page <= 1}>
              Previous
            </Button>
            <Text fontSize="sm" color={adminUi.muted}>
              Page {page} of {totalPages}
            </Text>
            <Button size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} isDisabled={page >= totalPages}>
              Next
            </Button>
          </HStack>
        }
      />

      <CustomModal
        isOpen={formModal.isOpen}
        onClose={formModal.onClose}
        title={form.id ? 'Edit B2B Pincode' : 'Add B2B Pincode'}
        footer={
          <>
            <Button variant="ghost" onClick={formModal.onClose}>Cancel</Button>
            <PrimaryButton onClick={validateAndSave} isLoading={saveMutation.isPending}>
              {form.id ? 'Save Changes' : 'Add Pincode'}
            </PrimaryButton>
          </>
        }
      >
        <Stack spacing={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isInvalid={Boolean(errors.pincode)}>
              <FormLabel>Pincode</FormLabel>
              <Input
                value={form.pincode}
                maxLength={6}
                onChange={(event) => setForm((value) => ({ ...value, pincode: event.target.value.replace(/\D/g, '') }))}
                placeholder="6-digit pincode"
              />
              <FormErrorMessage>{errors.pincode}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={Boolean(errors.zoneId)}>
              <FormLabel>Zone</FormLabel>
              <AdminSelect value={form.zoneId} onChange={(zoneId) => setForm((value) => ({ ...value, zoneId }))} maxW="100%">
                <option value="">Select zone</option>
                {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} — {zone.name}</option>)}
              </AdminSelect>
              <FormErrorMessage>{errors.zoneId}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={Boolean(errors.city)}>
              <FormLabel>City</FormLabel>
              <Input value={form.city} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))} />
              <FormErrorMessage>{errors.city}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={Boolean(errors.state)}>
              <FormLabel>State</FormLabel>
              <Input value={form.state} onChange={(event) => setForm((value) => ({ ...value, state: event.target.value }))} />
              <FormErrorMessage>{errors.state}</FormErrorMessage>
            </FormControl>
            <FormControl>
              <FormLabel>Courier scope</FormLabel>
              <AdminSelect
                value={form.courierId ? `${form.courierId}|${form.serviceProvider || ''}` : ''}
                onChange={(value) => {
                  const [courierId = '', serviceProvider = ''] = value.split('|')
                  setForm((current) => ({ ...current, courierId, serviceProvider }))
                }}
                maxW="100%"
              >
                <option value="">Global (all couriers)</option>
                {couriers.map((courier) => {
                  const provider = courier.serviceProvider || courier.service_provider || ''
                  return (
                    <option key={courier.id} value={`${courier.id}|${provider}`}>
                      {courier.name}
                    </option>
                  )
                })}
              </AdminSelect>
            </FormControl>
          </SimpleGrid>
          <Box>
            <Text fontWeight="700" mb={3}>Delivery attributes</Text>
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
              {flagFields.map(([key, label]) => (
                <Checkbox key={key} isChecked={form[key]} onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.checked }))}>
                  {label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </Box>
        </Stack>
      </CustomModal>

      <CustomModal
        isOpen={importModal.isOpen}
        onClose={importModal.onClose}
        title="Import B2B Pincodes"
        footer={
          <>
            <Button variant="ghost" onClick={importModal.onClose}>Cancel</Button>
            <PrimaryButton onClick={() => importMutation.mutate()} isLoading={importMutation.isPending} isDisabled={!importFile}>
              Import CSV
            </PrimaryButton>
          </>
        }
      >
        <Stack spacing={4}>
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            CSV can add new pincodes and update existing ones. Include zone_code, or select a default zone below.
          </Alert>
          <FormControl>
            <FormLabel>Default zone (optional)</FormLabel>
            <AdminSelect value={importZoneId} onChange={setImportZoneId} maxW="100%">
              <option value="">Use zone_code from CSV</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} — {zone.name}</option>)}
            </AdminSelect>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>CSV file</FormLabel>
            <Input type="file" accept=".csv,text/csv" p={1} onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
          </FormControl>
          <Button alignSelf="flex-start" leftIcon={<IconDownload size={17} />} variant="link" onClick={downloadTemplate}>
            Download CSV template
          </Button>
        </Stack>
      </CustomModal>
    </Stack>
  )
}

export default B2BPincodeManagement

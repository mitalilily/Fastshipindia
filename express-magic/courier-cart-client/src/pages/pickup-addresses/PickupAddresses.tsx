/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { BiDownload, BiUpload } from 'react-icons/bi'
import { FiMoreVertical, FiPlus } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'

import { useQueryClient } from '@tanstack/react-query'
import { FilterBar, type FilterField } from '../../components/FilterBar'
import AddPickupAddressForm from '../../components/pickups/AddPickupAddressForm'
import ExportConfirmDialog from '../../components/pickups/ExportConfirmDialog'
import PickupAddressesList from '../../components/pickups/PickupAddressesList'
import UploadPickupCSVModal from '../../components/pickups/UploadPickupCSV'
import CustomDrawer from '../../components/UI/drawer/CustomDrawer'
import { toast } from '../../components/UI/Toast'
import {
  useExportPickupAddresses,
  useImportPickupAddresses,
  usePickupAddresses,
} from '../../hooks/Pickup/usePickupAddresses'
import type { PickupAddressFilters } from '../../api/pickups'
import type { HydratedPickup } from '../../types/generic.types'
import { useFastLoading } from '../../hooks/useFastLoading'

// Filter fields with sort order support
const filterFields: FilterField[] = [
  {
    name: 'sortBy',
    label: 'Sort By',
    type: 'select',
    options: [
      { label: 'Latest Added', value: 'latest' },
      { label: 'Oldest First', value: 'oldest' },
      { label: 'Name (A-Z)', value: 'az' },
      { label: 'Name (Z-A)', value: 'za' },
    ],
    placeholder: 'Select sort order',
  },
  {
    name: 'name',
    label: 'Warehouse Name',
    type: 'text',
    placeholder: 'Search for name...',
  },
  {
    name: 'isPrimary',
    label: 'Primary',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
  },
  {
    name: 'pincode',
    label: 'Pincode',
    isAdvanced: true,
    type: 'text',
    placeholder: 'Search for Pincode...',
  },
  {
    name: 'city',
    label: 'City',
    isAdvanced: true,
    type: 'text',
    placeholder: 'Search for City...',
  },
  {
    name: 'state',
    label: 'State',
    isAdvanced: true,
    type: 'text',
    placeholder: 'Search for State...',
  },
  {
    name: 'isPickupEnabled',
    label: 'Status',
    type: 'select',
    isAdvanced: true,
    options: [
      { label: 'All', value: '' },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
]

const initialFilterValues = {
  name: '',
  city: '',
  state: '',
  pincode: '',
  sortBy: '',
  isPickupEnabled: '',
  isPrimary: '',
}

const PickupAddresses = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState<'filter' | 'add' | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  const { mutate: exportAddresses, isPending: isExporting } = useExportPickupAddresses()

  const { mutateAsync: importAddresses, isPending } = useImportPickupAddresses()

  const [filters, setFilters] = useState<PickupAddressFilters>({})
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const { data, isLoading, isError } = usePickupAddresses({
    ...filters,
    page: page + 1,
    limit: rowsPerPage,
  })
  const showLoading = useFastLoading(isLoading)

  useEffect(() => {
    if (searchParams.get('add') !== '1') return

    setDrawerType('add')
    setDrawerOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  // Action menu for mobile
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget)
  const closeMenu = () => setMenuAnchor(null)

  const handleImport = () => {
    setImportDialogOpen(true)
    closeMenu()
  }

  const handleExport = () => {
    setShowExportConfirm(true)
    closeMenu()
  }

  const confirmImport = (data: HydratedPickup[]) => {
    importAddresses(data, {
      onSuccess: () => {
        toast.open({
          message: 'Pickup addresses imported successfully.',
          severity: 'success',
        })
        queryClient.invalidateQueries({
          queryKey: ['pickupAddresses', filters],
        })
        setImportDialogOpen(false)
      },
      onError: () =>
        toast.open({
          message: 'Failed to import pickup addresses.',
          severity: 'error',
        }),
    })
  }

  const confirmExport = () => {
    setShowExportConfirm(false)
    exportAddresses(
      { ...filters, page: undefined, limit: undefined }, // Don't send pagination
      {
        onSuccess: () =>
          toast.open({
            message: 'Pickup addresses exported successfully.',
            severity: 'success',
          }),
        onError: () =>
          toast.open({
            message: 'Failed to export pickup addresses.',
            severity: 'error',
          }),
      },
    )
  }

  const handleFilterApply = (filters: Partial<HydratedPickup>) => {
    setFilters({ ...(filters as PickupAddressFilters) })
    setPage(0)
    setSelectedWarehouseId(null)
  }
  const handleOpenAddDrawer = () => {
    setDrawerType('add')
    setDrawerOpen(true)
    setMenuAnchor(null)
  }

  const handleCloseDrawer = () => {
    setDrawerType(null)
    setDrawerOpen(false)
  }

  const appliedFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      .length
  }, [filters])

  const warehouseOptions = data?.pickupAddresses ?? []
  const selectedWarehouse =
    warehouseOptions.find((address) => address.pickupId === selectedWarehouseId) ?? null

  const getWarehouseLabel = (address: HydratedPickup) =>
    address.pickup?.addressNickname ||
    address.pickup?.contactName ||
    `${address.pickup?.city || 'Pickup'} ${address.pickup?.pincode || ''}`.trim()

  const getWarehouseDescription = (address: HydratedPickup) =>
    [
      address.pickup?.addressLine1,
      address.pickup?.addressLine2,
      address.pickup?.city,
      address.pickup?.state,
      address.pickup?.pincode,
    ]
      .filter(Boolean)
      .join(', ')

  const handleWarehouseSearch = (value: string, reason: string) => {
    setWarehouseSearch(value)

    if (reason === 'clear') {
      setSelectedWarehouseId(null)
      setFilters((current) => {
        const { name: _name, ...rest } = current
        return rest
      })
      setPage(0)
      return
    }

    if (reason !== 'input') return

    setSelectedWarehouseId(null)
    setFilters((current) => ({ ...current, name: value || undefined }))
    setPage(0)
  }

  return (
    <Stack
      spacing={3}
      sx={{
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
        overflow: 'visible',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'auto',
        pb: 2,
      }}
    >
      {isError && (
        <Alert severity="warning">
          Live pickup addresses are temporarily unavailable. The address list remains open and will update on refresh.
        </Alert>
      )}
      <Box
        sx={{
          overflow: 'hidden',
          borderRadius: '8px',
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          bgcolor: theme.palette.background.paper,
          boxShadow: `0 14px 32px ${alpha(theme.palette.text.primary, 0.06)}`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            bgcolor: '#0f8bab',
            color: '#fff',
            px: { xs: 1.8, sm: 2.4 },
            py: 1.35,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
            Warehouse/Pickup Address
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>⌃</Typography>
        </Stack>

        <Stack spacing={2} sx={{ p: { xs: 1.6, sm: 2.2 } }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
            Search and select your warehouse <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.2}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
          >
            <Autocomplete
              fullWidth
              options={warehouseOptions}
              value={selectedWarehouse}
              inputValue={warehouseSearch}
              loading={showLoading}
              getOptionLabel={getWarehouseLabel}
              isOptionEqualToValue={(option, value) => option.pickupId === value.pickupId}
              onInputChange={(_, value, reason) => handleWarehouseSearch(value, reason)}
              onChange={(_, value) => {
                setSelectedWarehouseId(value?.pickupId ?? null)
                setWarehouseSearch(value ? getWarehouseLabel(value) : '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select address"
                  size="small"
                  sx={{
                    maxWidth: { md: 560 },
                    '& .MuiOutlinedInput-root': {
                      minHeight: 48,
                      borderRadius: '8px',
                      bgcolor: '#fff',
                    },
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.pickupId}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                      {getWarehouseLabel(option)}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {getWarehouseDescription(option)}
                    </Typography>
                  </Box>
                </Box>
              )}
              noOptionsText={showLoading ? 'Loading addresses...' : 'No address found'}
            />
            <Button
              variant="contained"
              startIcon={<FiPlus size={18} />}
              onClick={() => handleOpenAddDrawer()}
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                bgcolor: '#0f8bab',
                '&:hover': { bgcolor: '#0b7894' },
              }}
            >
              Add Address
            </Button>
          </Stack>

          <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>OR - Select From</Typography>
        </Stack>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="flex-end"
        gap={2}
        sx={{ width: '100%', minWidth: 0 }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 'auto' }}>
          <FilterBar<Partial<HydratedPickup>>
            fields={filterFields}
            defaultValues={initialFilterValues as unknown as Partial<HydratedPickup>}
            onApply={handleFilterApply}
            appliedCount={
              Object.entries(filters)?.filter(([_, v]) => v !== '' && v !== undefined && v !== null)
                .length
            }
            loading={showLoading}
          />
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'center' } }}
        >
          {/* Mobile menu icon */}
          {isMobile ? (
            <>
              <IconButton onClick={openMenu}>
                <FiMoreVertical />
              </IconButton>
              <Menu
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      width: 200,
                      bgcolor: 'primary.dark',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                      position: 'relative',
                    },
                  },
                }}
                anchorEl={menuAnchor}
                open={!!menuAnchor}
                onClose={closeMenu}
              >
                <MenuItem
                  sx={{ display: 'flex', alignItems: 'center', gap: '13px' }}
                  onClick={() => handleOpenAddDrawer()}
                >
                  <FiPlus size={18} />
                  Add
                </MenuItem>
                <MenuItem
                  sx={{ display: 'flex', alignItems: 'center', gap: '13px' }}
                  onClick={handleImport}
                >
                  {' '}
                  <BiUpload />
                  Import
                </MenuItem>
                <MenuItem
                  sx={{ display: 'flex', alignItems: 'center', gap: '13px' }}
                  onClick={handleExport}
                >
                  {isExporting ? (
                    <>
                      {' '}
                      <CircularProgress /> Exporting...{' '}
                    </>
                  ) : (
                    <>
                      <BiDownload size={18} /> Export{' '}
                    </>
                  )}
                </MenuItem>
              </Menu>
            </>
          ) : (
            // Desktop actions
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<FiPlus size={18} />}
                onClick={() => handleOpenAddDrawer()}
              >
                Add
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<BiUpload size={18} />}
                onClick={handleImport}
              >
                Import
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<BiDownload size={18} />}
                onClick={handleExport}
              >
                Export
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

      {/* Pickup list */}
      <Box>
        <PickupAddressesList
          listData={data?.pickupAddresses ?? []}
          totalCount={data?.totalCount ?? 0}
          page={page}
          rowsPerPage={rowsPerPage}
          selectedPickupId={selectedWarehouseId}
          onSelectAddress={setSelectedWarehouseId}
          onPageChange={setPage}
          onRowsPerPageChange={(limit) => {
            setRowsPerPage(limit)
            setPage(0)
          }}
        />
      </Box>

      <ExportConfirmDialog
        open={showExportConfirm}
        onConfirm={confirmExport}
        filterCount={appliedFilterCount}
        onClose={() => setShowExportConfirm(false)}
      />
      <UploadPickupCSVModal
        onClose={() => setImportDialogOpen(false)}
        onConfirm={(data) => confirmImport(data)}
        open={importDialogOpen}
        loading={isPending}
      />
      {/* Filter drawer for mobile */}
      <CustomDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        width={
          isMobile
            ? '100%'
            : drawerType === 'add'
              ? 'clamp(360px, 92vw, 1100px)'
              : 'clamp(320px, 42vw, 400px)'
        }
        anchor={drawerType === 'filter' && isMobile ? 'left' : 'right'}
        title={drawerType === 'add' ? 'Add New Pickup Address' : 'Filter Pickup Addresses'}
        showBackButton={drawerType === 'add'}
        backLabel="Back to addresses"
      >
        {drawerType === 'add' ? (
          <AddPickupAddressForm setDrawer={setDrawerOpen} />
        ) : (
          <FilterBar<Partial<HydratedPickup>>
            fields={filterFields}
            defaultValues={{}}
            onApply={(filters) => {
              handleFilterApply(filters)
              handleCloseDrawer()
            }}
            loading={showLoading}
          />
        )}
      </CustomDrawer>
    </Stack>
  )
}

export default PickupAddresses

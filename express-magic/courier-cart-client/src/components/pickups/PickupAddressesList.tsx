import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import moment from 'moment'
import { useState } from 'react'
import { BiCheckCircle } from 'react-icons/bi'
import { CiEdit } from 'react-icons/ci'
import { MdOutlineWarehouse } from 'react-icons/md'
import { useUpdatePickupAddress } from '../../hooks/Pickup/usePickupAddresses'
import { brand } from '../../theme/brand'
import type { HydratedPickup } from '../../types/generic.types'
import CustomDrawer from '../UI/drawer/CustomDrawer'
import CustomSwitch from '../UI/inputs/CustomSwitch'
import AddPickupAddressForm from './AddPickupAddressForm'

interface IPickupAddressListProps {
  listData: HydratedPickup[]
  totalCount: number
  page: number
  rowsPerPage: number
  selectedPickupId?: string | null
  onSelectAddress?: (pickupId: string) => void
  onPageChange: (page: number) => void
  onRowsPerPageChange: (limit: number) => void
}

const formatWarehouseName = (address: HydratedPickup) =>
  address.pickup?.addressNickname ||
  address.pickup?.contactName ||
  `${address.pickup?.city || 'Pickup'} ${address.pickup?.pincode || ''}`.trim()

const formatFullAddress = (address: HydratedPickup) =>
  [
    address.pickup?.addressLine1,
    address.pickup?.addressLine2,
    address.pickup?.landmark,
    address.pickup?.city,
    address.pickup?.state,
    address.pickup?.country,
    address.pickup?.pincode,
  ]
    .filter(Boolean)
    .join(', ')

const formatShortId = (value?: string) => {
  if (!value) return '-'
  return value.length > 8 ? value.slice(0, 8).toUpperCase() : value.toUpperCase()
}

const PickupAddressesList = ({
  listData,
  totalCount,
  page,
  rowsPerPage,
  selectedPickupId,
  onSelectAddress,
  onPageChange,
  onRowsPerPageChange,
}: IPickupAddressListProps) => {
  const { mutate: updatePickupAddress } = useUpdatePickupAddress()
  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down('sm'))
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'))
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'))
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const showTable = useMediaQuery(theme.breakpoints.up('md'))
  const isDark = theme.palette.mode === 'dark'

  let drawerWidth: string | number = '100%'
  if (isXs) drawerWidth = '100%'
  else if (isSm) drawerWidth = '95%'
  else if (isMd) drawerWidth = '95%'
  else if (isLgUp) drawerWidth = 1200

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<HydratedPickup | undefined>(undefined)

  const handleMakePrimary = (id: string) => {
    updatePickupAddress({ id, payload: { isPrimary: true } })
  }

  const handleEdit = (address: HydratedPickup) => {
    setSelectedAddress(address)
    setDrawerOpen(true)
  }

  const handleStatusToggle = (id: string, enabled: boolean) => {
    updatePickupAddress({ id, payload: { isPickupEnabled: enabled } })
  }

  return (
    <>
      <Box
        sx={{
          borderRadius: '14px',
          border: `1px solid ${alpha(brand.navy, 0.1)}`,
          bgcolor: theme.palette.background.paper,
          boxShadow: `0 18px 42px ${alpha(brand.navy, 0.07)}`,
          overflow: 'hidden',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{
            px: { xs: 1.6, sm: 2.2 },
            py: 1.4,
            borderBottom: `1px solid ${alpha(brand.navy, 0.1)}`,
            bgcolor: isDark ? alpha(theme.palette.common.white, 0.04) : alpha(brand.aqua, 0.46),
          }}
        >
          <Stack spacing={0.2}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Pickup Addresses</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>
              Select the warehouse you want to use for pickup.
            </Typography>
          </Stack>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[8, 12, 24]}
            onPageChange={(_, nextPage) => onPageChange(nextPage)}
            onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            sx={{
              borderRadius: '10px',
              border: `1px solid ${alpha(brand.navy, 0.12)}`,
              bgcolor: theme.palette.background.paper,
              '& .MuiToolbar-root': { minHeight: 36, px: 1 },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: 12,
                color: 'text.secondary',
                fontWeight: 600,
              },
            }}
          />
        </Stack>

        {listData.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" spacing={0.8} sx={{ minHeight: 240 }}>
            <MdOutlineWarehouse size={34} color={theme.palette.text.secondary} />
            <Typography sx={{ fontWeight: 700 }}>No pickup address found</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
              Add a warehouse address to start creating shipments.
            </Typography>
          </Stack>
        ) : showTable ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table
              size="small"
              sx={{
                minWidth: 1180,
                '& th': {
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(brand.navy, 0.06),
                  color: brand.navy,
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                  py: 1.25,
                  whiteSpace: 'nowrap',
                },
                '& td': {
                  borderColor: alpha(brand.navy, 0.08),
                  py: 1.35,
                  verticalAlign: 'top',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell width={58}>S.No.</TableCell>
                  <TableCell width={96}>ID</TableCell>
                  <TableCell width={190}>Title</TableCell>
                  <TableCell width={220}>Contact Details</TableCell>
                  <TableCell width={98}>Pincode</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell width={170}>Created By</TableCell>
                  <TableCell width={128}>Created At</TableCell>
                  <TableCell width={132}>Status</TableCell>
                  <TableCell width={128} align="center">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listData.map((address, index) => {
                  const isSelected = selectedPickupId === address.pickupId
                  const fullAddress = formatFullAddress(address)
                  const createdBy = address.pickup?.contactName || '-'

                  return (
                    <TableRow
                      hover
                      key={address.pickupId}
                      onClick={() => onSelectAddress?.(address.pickupId)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected
                          ? alpha(brand.navy, isDark ? 0.18 : 0.05)
                          : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected
                            ? alpha(brand.navy, isDark ? 0.22 : 0.08)
                            : alpha(brand.navy, isDark ? 0.12 : 0.035),
                        },
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 700 }}>
                          {page * rowsPerPage + index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: brand.navy }}>
                          {formatShortId(address.pickupId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.7} alignItems="flex-start">
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 900,
                              color: brand.navy,
                              textTransform: 'uppercase',
                              lineHeight: 1.35,
                            }}
                          >
                            {formatWarehouseName(address)}
                          </Typography>
                          {address.isPrimary && (
                            <Chip
                              label="Primary"
                              size="small"
                              icon={<BiCheckCircle style={{ fontSize: 14 }} />}
                              sx={{
                                height: 23,
                                borderRadius: '999px',
                                fontSize: 11,
                                fontWeight: 800,
                                color: brand.red,
                                bgcolor: alpha(brand.red, 0.1),
                                '& .MuiChip-icon': { color: brand.red },
                              }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                            {address.pickup?.contactName || '-'}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {address.pickup?.contactEmail || '-'}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {address.pickup?.contactPhone || '-'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                          {address.pickup?.pincode || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={fullAddress} arrow disableInteractive>
                          <Typography
                            sx={{
                              color: 'text.secondary',
                              fontSize: 12.5,
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {fullAddress || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: 'text.primary',
                          }}
                        >
                          {createdBy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 700 }}>
                          {moment(address.createdAt).format('DD MMM YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.7} alignItems="center">
                          <Chip
                            label={address.isPickupEnabled ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              height: 24,
                              borderRadius: '999px',
                              fontSize: 11.5,
                              fontWeight: 900,
                              color: address.isPickupEnabled ? '#047857' : brand.red,
                              bgcolor: address.isPickupEnabled
                                ? alpha('#10b981', 0.12)
                                : alpha(brand.red, 0.1),
                            }}
                          />
                          <Box
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <CustomSwitch
                              onChange={(event) =>
                                handleStatusToggle(address.pickupId, event.target.checked)
                              }
                              checked={Boolean(address.isPickupEnabled)}
                            />
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.6} justifyContent="center">
                          {!address.isPrimary && (
                            <Tooltip title="Make primary">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleMakePrimary(address.pickupId)
                                }}
                                sx={{
                                  minWidth: 0,
                                  px: 0.9,
                                  borderRadius: '8px',
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                Primary
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit address">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleEdit(address)
                              }}
                              sx={{
                                border: `1px solid ${alpha(brand.navy, 0.22)}`,
                                borderRadius: '8px',
                                color: brand.navy,
                              }}
                            >
                              <CiEdit />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: { xs: 1.4, sm: 2 } }}>
            <Grid container spacing={2}>
              {listData.map((address) => {
                const isSelected = selectedPickupId === address.pickupId
                const fullAddress = formatFullAddress(address)

                return (
                  <Grid key={address.pickupId} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAddress?.(address.pickupId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectAddress?.(address.pickupId)
                        }
                      }}
                      sx={{
                        height: '100%',
                        minHeight: 216,
                        cursor: 'pointer',
                        borderRadius: '12px',
                        border: `1px solid ${
                          isSelected ? brand.navy : alpha(brand.navy, 0.12)
                        }`,
                        bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#fff',
                        boxShadow: isSelected
                          ? `0 0 0 2px ${alpha(brand.navy, 0.12)}, 0 16px 34px ${alpha(
                              brand.navy,
                              0.13,
                            )}`
                          : `0 10px 24px ${alpha(brand.navy, 0.05)}`,
                        transition: 'border-color .18s ease, box-shadow .18s ease, transform .18s ease',
                        '&:hover': {
                          borderColor: brand.navy,
                          boxShadow: `0 16px 34px ${alpha(brand.navy, 0.11)}`,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <CardContent
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.25,
                          p: 2,
                          '&:last-child': { pb: 2 },
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 900,
                                fontSize: 14.5,
                                color: 'text.primary',
                                textTransform: 'uppercase',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {formatWarehouseName(address)}
                            </Typography>
                            {address.pickup?.contactName && (
                              <Typography
                                sx={{
                                  mt: 0.8,
                                  fontWeight: 800,
                                  fontSize: 13,
                                  color: 'text.primary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {address.pickup.contactName},
                              </Typography>
                            )}
                          </Box>
                          {address.isPrimary && (
                            <Tooltip title="Primary pickup address">
                              <Chip
                                label="Primary"
                                size="small"
                                icon={<BiCheckCircle style={{ fontSize: 15 }} />}
                                sx={{
                                  borderRadius: '8px',
                                  fontWeight: 800,
                                  color: brand.red,
                                  bgcolor: alpha(brand.red, 0.1),
                                  '& .MuiChip-icon': { color: brand.red },
                                }}
                              />
                            </Tooltip>
                          )}
                        </Stack>

                        <Tooltip title={fullAddress} arrow disableInteractive>
                          <Typography
                            sx={{
                              color: 'text.secondary',
                              fontSize: 13,
                              lineHeight: 1.55,
                              minHeight: 62,
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {fullAddress || '-'}
                          </Typography>
                        </Tooltip>

                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          Mobile: {address.pickup?.contactPhone || '-'}
                        </Typography>

                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto' }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: 11.5 }}>
                            Updated {moment(address.updatedAt).format('DD MMM YYYY')}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <CustomSwitch
                                onChange={(event) =>
                                  handleStatusToggle(address.pickupId, event.target.checked)
                                }
                                checked={Boolean(address.isPickupEnabled)}
                              />
                            </Box>
                            {!address.isPrimary && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleMakePrimary(address.pickupId)
                                }}
                                sx={{
                                  minWidth: 0,
                                  px: 1,
                                  borderRadius: '8px',
                                  fontSize: 11,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Primary
                              </Button>
                            )}
                            <Tooltip title="Edit address">
                              <IconButton
                                size="small"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleEdit(address)
                                }}
                                sx={{
                                  border: `1px solid ${alpha(brand.navy, 0.22)}`,
                                  borderRadius: '8px',
                                  color: brand.navy,
                                }}
                              >
                                <CiEdit />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2, display: { xs: 'block', md: 'none' } }} />

      <CustomDrawer
        width={drawerWidth}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedAddress(undefined)
        }}
        title={selectedAddress ? 'Edit Pickup Address' : 'Add New Pickup Address'}
        showBackButton
        backLabel="Back to addresses"
      >
        <AddPickupAddressForm
          key={selectedAddress?.id ?? 'new'}
          setDrawer={setDrawerOpen}
          initialData={selectedAddress}
        />
      </CustomDrawer>
    </>
  )
}

export default PickupAddressesList

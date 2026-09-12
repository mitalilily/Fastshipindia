// src/hooks/useZones.js
import { useToast } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { b2bAdminService } from '../services/b2bAdmin.service'
import { zoneService } from '../services/zones.service'

// The API returns zones in creation order. Keep the B2C pricing UI aligned
// with the rate-card order (Zone A through Zone E), irrespective of when a
// zone was added.
const B2C_ZONE_ORDER = {
  WITHIN_CITY: 10, // Zone A
  WITHIN_STATE: 20, // Zone B
  WITHIN_REGION: 21, // Zone B legacy variant
  METRO_TO_METRO: 30, // Zone C
  ROI: 40, // Zone D
  KASHMIR: 50, // Zone E
}

const getB2CZonePosition = (zone) => {
  const code = String(zone?.code || '').trim().toUpperCase()
  if (B2C_ZONE_ORDER[code] !== undefined) return B2C_ZONE_ORDER[code]

  const label = `${zone?.name || ''} ${zone?.description || ''}`.toUpperCase()
  if (label.includes('KASHMIR') || label.includes('LADAKH') || label.includes('NORTH EAST')) return 50
  return 100
}

const sortB2CZones = (zones) =>
  [...zones].sort((left, right) => {
    const positionDifference = getB2CZonePosition(left) - getB2CZonePosition(right)
    if (positionDifference !== 0) return positionDifference
    return String(left?.name || left?.code || '').localeCompare(String(right?.name || right?.code || ''))
  })

export function useZones(businessType = null, filters = {}) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const queryKey = ['zones', businessType, filters]
  const normalizedType = businessType ? String(businessType).toUpperCase() : null
  const isB2B = normalizedType === 'B2B'
  const refreshZoneBackedViews = () => {
    queryClient.invalidateQueries({ queryKey: ['zones'] })
    queryClient.invalidateQueries({ queryKey: ['shippingRates'] })
    queryClient.invalidateQueries({ queryKey: ['b2b-zone-rates'] })
  }

  const { data: fetchedZones = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      isB2B
        ? b2bAdminService.getZones({
            ...filters,
            include_global: filters.include_global ?? true,
          })
        : zoneService.getZones(businessType, filters),
    keepPreviousData: true,
  })

  const zones = useMemo(
    () => (normalizedType === 'B2C' ? sortB2CZones(fetchedZones) : fetchedZones),
    [fetchedZones, normalizedType],
  )

  const createZone = useMutation({
    mutationFn: (payload) =>
      isB2B
        ? b2bAdminService.createZone({ ...payload, business_type: 'B2B' })
        : zoneService.createZone(payload),
    onSuccess: () => {
      refreshZoneBackedViews()
      toast({
        title: isB2B ? 'Zone saved with selected pincodes.' : 'Zone created successfully.',
        description: isB2B
          ? 'Only the selected pincodes are now mapped to this zone.'
          : undefined,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create zone.',
        description: error?.response?.data?.error || error?.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })

  const updateZone = useMutation({
    mutationFn: (zone) =>
      isB2B
        ? b2bAdminService.updateZone(zone.id, zone)
        : zoneService.updateZone(zone),
    onSuccess: (data) => {
      refreshZoneBackedViews()
      toast({
        title: isB2B ? 'Zone and pincode selection updated.' : data.message || 'Zone updated successfully',
        description: isB2B
          ? 'Only the selected pincodes are mapped to this zone.'
          : undefined,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    },
    onError: (error) => {
      toast({
        title: error.message || 'Failed to update zone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })

  const deleteZone = useMutation({
    mutationFn: (id) => (isB2B ? b2bAdminService.deleteZone(id) : zoneService.deleteZone(id)),
    onSuccess: () => {
      refreshZoneBackedViews()
      toast({
        title: 'Zone deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    },
    onError: () => {
      toast({
        title: 'Failed to delete zone.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })

  return {
    zones,
    isLoading,
    isError,
    createZone,
    deleteZone,
    updateZone,
  }
}

export function useZoneById(zoneId) {
  return useQuery({
    queryKey: ['zoneById', zoneId],
    queryFn: () => zoneService.getZoneById(zoneId),
    enabled: !!zoneId,
  })
}

import { useToast } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { b2bAdminService } from '../services/b2bAdmin.service'

export const useB2BZoneRates = (filters = {}) => {
  const queryClient = useQueryClient()
  const toast = useToast()

  const queryKey = ['b2b-zone-rates', filters]

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => b2bAdminService.getZoneRates(filters),
  })

  const upsertRate = useMutation({
    mutationFn: (payload) => b2bAdminService.upsertZoneRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast({ title: 'Zone rate saved', status: 'success', duration: 3000, isClosable: true })
    },
  })

  const deleteRate = useMutation({
    mutationFn: (id) => b2bAdminService.deleteZoneRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast({ title: 'Zone rate deleted', status: 'success', duration: 3000, isClosable: true })
    },
  })

  const importRates = useMutation({
    mutationFn: (formData) => b2bAdminService.importZoneRates(formData),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey })
      await queryClient.refetchQueries({ queryKey, type: 'active' })
      const saved = Number(result.saved ?? result.inserted ?? 0)
      const skipped = Array.isArray(result.skipped) ? result.skipped : []
      toast({
        title: skipped.length ? 'Zone rates imported with warnings' : 'Zone rates imported',
        description: `${saved} rate${saved === 1 ? '' : 's'} saved${
          skipped.length ? `, ${skipped.length} row${skipped.length === 1 ? '' : 's'} skipped` : ''
        }.`,
        status: skipped.length ? 'warning' : 'success',
        duration: 5000,
        isClosable: true,
      })
    },
  })

  return {
    rates: data,
    isLoading,
    upsertRate,
    deleteRate,
    importRates,
  }
}


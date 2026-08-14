// src/hooks/usePlans.ts
import { useToast } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlansService } from '../services/plan.service'

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: PlansService.getPlans,
  })
}

export const useCreatePlan = () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: PlansService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({ title: 'Plan created successfully', status: 'success', duration: 3000, isClosable: true })
    },
    onError: (error) => {
      toast({
        title: 'Could not create plan',
        description: error?.response?.data?.message || error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    },
  })
}

export const useUpdatePlan = () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => PlansService.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({
        title: 'Plan updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error updating plan',
        description: error?.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })
}

export const useDeletePlan = () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: PlansService.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({ title: 'Plan deleted successfully', status: 'success', duration: 3000, isClosable: true })
    },
    onError: (error) => {
      toast({
        title: 'Could not delete plan',
        description: error?.response?.data?.message || error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    },
  })
}

export const useAssignUserPlan = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ userId, planId }) => PlansService.assignPlanToUser(userId, planId),
    onSuccess: () => {
      toast({
        title: 'Plan assigned successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      // optional: invalidate queries to refetch updated user data
      queryClient.invalidateQueries(['userInfo'])
    },
    onError: (error) => {
      toast({
        title: 'Failed to assign plan',
        description: error?.message || 'Something went wrong',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })
}

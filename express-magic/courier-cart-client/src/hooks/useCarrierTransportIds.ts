import { useQuery } from '@tanstack/react-query'
import { getCarrierTransportIds, type CarrierTransportId } from '../api/courier'

export const useCarrierTransportIds = () => {
  return useQuery<CarrierTransportId[]>({
    queryKey: ['carrierTransportIds'],
    queryFn: getCarrierTransportIds,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

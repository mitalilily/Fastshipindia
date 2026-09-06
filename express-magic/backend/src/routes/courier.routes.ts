// src/routes/courier.routes.ts
import { Router } from 'express'
import {
  deleteCourierController,
  getAllCouriersController,
  getAllCouriersListController,
  getServiceProvidersController,
  updateCourierStatusController,
  updateServiceProviderStatusController,
} from '../controllers/admin/courier.controller'
import { getShippingRatesForUserController } from '../controllers/courier.controller'
import {
  getCarrierTransportIdsController,
  updateCarrierTransportIdsController,
} from '../controllers/carrierTransportId.controller'
import {
  createCourierController,
  calculateB2BRateForUserController,
  fetchAvailableCouriers,
  fetchAvailableCouriersForGuestController,
  fetchAvailableCouriersToUser,
  getCourier,
  getCouriers,
} from '../controllers/courierIntegration.controller'
import { requireAuth } from '../middlewares/requireAuth'
import { isAdminMiddleware } from '../middlewares/isAdmin'

const router = Router()

router.get('/shipping-rates', requireAuth, getShippingRatesForUserController)
router.get('/transport-ids', requireAuth, getCarrierTransportIdsController)
router.put('/transport-ids', requireAuth, isAdminMiddleware, updateCarrierTransportIdsController)
router.get('/full-list', requireAuth, getAllCouriersListController)
router.get('/list', requireAuth, getAllCouriersController)
router.get(
  '/providers',
  requireAuth,
  isAdminMiddleware,
  getServiceProvidersController,
)
router.post('/available-to-guest', fetchAvailableCouriersForGuestController)
router.post('/available', requireAuth, fetchAvailableCouriers)
router.post('/available-to-user', requireAuth, fetchAvailableCouriersToUser)
router.post('/b2b/calculate-rate', requireAuth, calculateB2BRateForUserController)
router.post('/create', requireAuth, isAdminMiddleware, createCourierController)
router.delete('/delete/:id', requireAuth, isAdminMiddleware, deleteCourierController)
router.patch('/status/:id', requireAuth, isAdminMiddleware, updateCourierStatusController)
router.patch(
  '/providers/:serviceProvider',
  requireAuth,
  isAdminMiddleware,
  updateServiceProviderStatusController,
)

router.get('/', getCouriers)
router.get('/:id', getCourier)

export default router

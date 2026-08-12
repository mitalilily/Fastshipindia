import { Router } from 'express'
import {
  calculateShippingCostController,
  cancelShipmentController,
  createMpsShipmentController,
  createPickupRequestController,
  createShipmentController,
  editShipmentController,
  expectedTatController,
  fetchSingleWaybillController,
  fetchWaybillsController,
  generateShippingLabelController,
  heavyProductServiceabilityController,
  serviceabilityController,
  trackShipmentController,
  updateEwaybillController,
} from '../controllers/delhiveryB2C.controller'
import { isAdminMiddleware } from '../middlewares/isAdmin'
import { requireAuth } from '../middlewares/requireAuth'

const router = Router()

router.use(requireAuth, isAdminMiddleware)
router.get('/serviceability/:pincode', serviceabilityController)
router.get('/heavy-serviceability/:pincode', heavyProductServiceabilityController)
router.get('/tat', expectedTatController)
router.get('/waybills', fetchWaybillsController)
router.get('/waybill', fetchSingleWaybillController)
router.get('/shipments/track', trackShipmentController)
router.get('/shipping-cost', calculateShippingCostController)
router.get('/shipments/label', generateShippingLabelController)
router.post('/pickup-requests', createPickupRequestController)
router.post('/shipments', createShipmentController)
router.post('/shipments/mps', createMpsShipmentController)
router.post('/shipments/edit', editShipmentController)
router.post('/shipments/cancel', cancelShipmentController)
router.put('/shipments/:waybill/ewaybill', updateEwaybillController)

export default router

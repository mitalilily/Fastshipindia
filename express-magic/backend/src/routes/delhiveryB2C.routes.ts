import { Router } from 'express'
import {
  cancelShipmentController,
  createMpsShipmentController,
  createShipmentController,
  editShipmentController,
  expectedTatController,
  fetchSingleWaybillController,
  fetchWaybillsController,
  heavyProductServiceabilityController,
  serviceabilityController,
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
router.post('/shipments', createShipmentController)
router.post('/shipments/mps', createMpsShipmentController)
router.post('/shipments/edit', editShipmentController)
router.post('/shipments/cancel', cancelShipmentController)
router.put('/shipments/:waybill/ewaybill', updateEwaybillController)

export default router

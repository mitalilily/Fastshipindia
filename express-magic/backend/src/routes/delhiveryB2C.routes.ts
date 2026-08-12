import { Router } from 'express'
import {
  expectedTatController,
  fetchWaybillsController,
  heavyProductServiceabilityController,
  serviceabilityController,
} from '../controllers/delhiveryB2C.controller'
import { isAdminMiddleware } from '../middlewares/isAdmin'
import { requireAuth } from '../middlewares/requireAuth'

const router = Router()

router.use(requireAuth, isAdminMiddleware)
router.get('/serviceability/:pincode', serviceabilityController)
router.get('/heavy-serviceability/:pincode', heavyProductServiceabilityController)
router.get('/tat', expectedTatController)
router.get('/waybills', fetchWaybillsController)

export default router

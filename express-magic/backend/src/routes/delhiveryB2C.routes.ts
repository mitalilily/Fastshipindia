import { Router } from 'express'
import { serviceabilityController } from '../controllers/delhiveryB2C.controller'
import { isAdminMiddleware } from '../middlewares/isAdmin'
import { requireAuth } from '../middlewares/requireAuth'

const router = Router()

router.use(requireAuth, isAdminMiddleware)
router.get('/serviceability/:pincode', serviceabilityController)

export default router

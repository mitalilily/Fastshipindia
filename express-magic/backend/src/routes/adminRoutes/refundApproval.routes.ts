import { Router } from 'express'
import {
  approveRefundRequest,
  declineRefundRequest,
  getRefundApprovalRequests,
} from '../../controllers/admin/refundApproval.controller'
import { isAdminMiddleware } from '../../middlewares/isAdmin'
import { requireAuth } from '../../middlewares/requireAuth'

const router = Router()

router.get('/', requireAuth, isAdminMiddleware, getRefundApprovalRequests)
router.post('/:id/approve', requireAuth, isAdminMiddleware, approveRefundRequest)
router.post('/:id/decline', requireAuth, isAdminMiddleware, declineRefundRequest)

export default router

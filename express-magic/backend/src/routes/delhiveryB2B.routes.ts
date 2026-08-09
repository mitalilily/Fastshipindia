import { Router } from 'express'
import multer from 'multer'
import {
  appointmentController,
  cancelPickupController,
  cancelShipmentController,
  createPickupController,
  createWarehouseController,
  downloadDocumentController,
  freightChargesController,
  freightEstimateController,
  generateDocumentController,
  generateDocumentStatusController,
  loginController,
  logoutController,
  lrCopyController,
  manifestController,
  manifestStatusController,
  resetPasswordController,
  serviceabilityController,
  shippingLabelController,
  tatController,
  trackShipmentController,
  updateShipmentController,
  updateShipmentStatusController,
  updateWarehouseController,
} from '../controllers/delhiveryB2B.controller'
import { isAdminMiddleware } from '../middlewares/isAdmin'
import { requireAuth } from '../middlewares/requireAuth'

const router = Router()
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
})

router.use(requireAuth, isAdminMiddleware)

router.post('/auth/password-reset', resetPasswordController)
router.post('/auth/login', loginController)
router.post('/auth/logout', logoutController)
router.get('/serviceability/:pincode', serviceabilityController)
router.get('/tat', tatController)
router.post('/freight/estimate', freightEstimateController)
router.get('/freight/charges', freightChargesController)
router.post('/warehouses', createWarehouseController)
router.patch('/warehouses', updateWarehouseController)
router.post(
  '/shipments/manifest',
  documentUpload.fields([{ name: 'doc_file', maxCount: 10 }]),
  manifestController,
)
router.get('/shipments/manifest/:jobId', manifestStatusController)
router.get('/shipments/update/:jobId', updateShipmentStatusController)
router.put(
  '/shipments/:lrn',
  documentUpload.fields([{ name: 'invoice_file', maxCount: 10 }]),
  updateShipmentController,
)
router.delete('/shipments/:lrn', cancelShipmentController)
router.get('/shipments/:lrn/tracking', trackShipmentController)
router.post('/shipments/:lrn/appointments', appointmentController)
router.post('/pickups', createPickupController)
router.delete('/pickups/:pickupId', cancelPickupController)
router.get('/shipments/:lrn/labels/:size', shippingLabelController)
router.get('/shipments/:lrn/lr-copy', lrCopyController)
router.post('/documents/:docType', generateDocumentController)
router.get('/documents/:docType/:jobId', generateDocumentStatusController)
router.get('/documents', downloadDocumentController)

export default router

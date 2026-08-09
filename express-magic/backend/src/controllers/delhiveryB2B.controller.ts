import { Request, Response } from 'express'
import {
  DelhiveryB2BService,
  DelhiveryB2BUpload,
} from '../models/services/couriers/delhiveryB2B.service'

const service = new DelhiveryB2BService()

const sendResult = async (res: Response, action: Promise<unknown>) => {
  try {
    const data = await action
    return res.json({ success: true, data })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 500)
    return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message: error?.message || 'Delhivery B2B request failed',
    })
  }
}

const multipartPayload = (req: Request) => {
  const payload: Record<string, unknown> = { ...(req.body || {}) }
  const files = (req.files || {}) as Record<string, Express.Multer.File[]>

  for (const [field, uploads] of Object.entries(files)) {
    payload[field] = uploads.map(
      (upload): DelhiveryB2BUpload => ({
        buffer: upload.buffer,
        mimetype: upload.mimetype,
        originalname: upload.originalname,
      }),
    )
  }

  return payload
}

export const resetPasswordController = (req: Request, res: Response) =>
  sendResult(res, service.resetPassword(req.body?.username))

export const loginController = async (_req: Request, res: Response) => {
  try {
    const login = await service.login(true)
    return res.json({
      success: true,
      data: { authenticated: true, expiresAt: new Date(login.expiresAt).toISOString() },
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 500)
    return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message: error?.message || 'Delhivery B2B login failed',
    })
  }
}

export const logoutController = (_req: Request, res: Response) =>
  sendResult(res, service.logout())

export const serviceabilityController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.checkServiceability(
      req.params.pincode,
      req.query.weight === undefined ? undefined : Number(req.query.weight),
    ),
  )

export const tatController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.getExpectedTat(String(req.query.origin_pin || ''), String(req.query.destination_pin || '')),
  )

export const freightEstimateController = (req: Request, res: Response) =>
  sendResult(res, service.estimateFreight(req.body || {}))

export const freightChargesController = (req: Request, res: Response) =>
  sendResult(res, service.getFreightCharges(String(req.query.lrns || '')))

export const createWarehouseController = (req: Request, res: Response) =>
  sendResult(res, service.createWarehouse(req.body || {}))

export const updateWarehouseController = (req: Request, res: Response) =>
  sendResult(res, service.updateWarehouse(req.body || {}))

export const manifestController = (req: Request, res: Response) =>
  sendResult(res, service.manifestShipment(multipartPayload(req)))

export const manifestStatusController = (req: Request, res: Response) =>
  sendResult(res, service.getManifestStatus(req.params.jobId))

export const updateShipmentController = (req: Request, res: Response) =>
  sendResult(res, service.updateShipment(req.params.lrn, multipartPayload(req)))

export const updateShipmentStatusController = (req: Request, res: Response) =>
  sendResult(res, service.getShipmentUpdateStatus(req.params.jobId))

export const cancelShipmentController = (req: Request, res: Response) =>
  sendResult(res, service.cancelShipment(req.params.lrn))

export const trackShipmentController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.trackShipment(req.params.lrn, String(req.query.all_wbns || '').toLowerCase() === 'true'),
  )

export const appointmentController = (req: Request, res: Response) =>
  sendResult(res, service.bookLastMileAppointment({ ...req.body, lrn: req.params.lrn }))

export const createPickupController = (req: Request, res: Response) =>
  sendResult(res, service.createPickupRequest(req.body || {}))

export const cancelPickupController = (req: Request, res: Response) =>
  sendResult(res, service.cancelPickupRequest(req.params.pickupId))

export const shippingLabelController = (req: Request, res: Response) =>
  sendResult(res, service.getShippingLabel(req.params.lrn, req.params.size))

export const lrCopyController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.getLrCopy(req.params.lrn, req.query.lr_copy_type as string | undefined),
  )

export const generateDocumentController = (req: Request, res: Response) =>
  sendResult(res, service.generateDocument(req.params.docType, req.body || {}))

export const generateDocumentStatusController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.getGenerateDocumentStatus(req.params.docType, req.params.jobId),
  )

export const downloadDocumentController = (req: Request, res: Response) =>
  sendResult(res, service.downloadDocument(req.query as Record<string, unknown>))

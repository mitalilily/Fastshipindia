import { Request, Response } from 'express'
import {
  DelhiveryService,
  isDelhiveryB2CHeavyPincodeServiceable,
  isDelhiveryB2CPincodeServiceable,
} from '../models/services/couriers/delhivery.service'

const service = new DelhiveryService()

const sendDataResult = async (res: Response, action: Promise<unknown>) => {
  try {
    const data = await action
    return res.json({
      success: true,
      data,
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 500)
    return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message: error?.message || 'Delhivery B2C request failed',
    })
  }
}

const sendResult = async (
  res: Response,
  action: Promise<unknown>,
  isServiceable: (data: unknown) => boolean,
) => {
  try {
    const data = await action
    return res.json({
      success: true,
      data,
      serviceable: isServiceable(data),
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 500)
    return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message: error?.message || 'Delhivery B2C request failed',
    })
  }
}

export const serviceabilityController = (req: Request, res: Response) =>
  sendResult(res, service.checkServiceability(req.params.pincode), isDelhiveryB2CPincodeServiceable)

export const heavyProductServiceabilityController = (req: Request, res: Response) =>
  sendResult(
    res,
    service.checkHeavyProductTypeServiceability(req.params.pincode),
    isDelhiveryB2CHeavyPincodeServiceable,
  )

export const expectedTatController = (req: Request, res: Response) =>
  sendDataResult(
    res,
    service.getB2CExpectedTAT({
      origin_pin: req.query.origin_pin,
      destination_pin: req.query.destination_pin,
      mot: req.query.mot,
      pdt: req.query.pdt,
      expected_pickup_date: req.query.expected_pickup_date,
    }),
  )

export const fetchWaybillsController = (req: Request, res: Response) =>
  sendDataResult(res, service.fetchB2CBulkWaybills(req.query.count))

export const fetchSingleWaybillController = (_req: Request, res: Response) =>
  sendDataResult(res, service.fetchB2CSingleWaybill())

export const trackShipmentController = (req: Request, res: Response) =>
  sendDataResult(
    res,
    service.trackB2CShipment({
      waybill: req.query.waybill,
      ref_ids: req.query.ref_ids,
    }),
  )

export const calculateShippingCostController = (req: Request, res: Response) =>
  sendDataResult(
    res,
    service.calculateB2CShippingCost({
      md: req.query.md,
      cgm: req.query.cgm,
      o_pin: req.query.o_pin,
      d_pin: req.query.d_pin,
      ss: req.query.ss,
      pt: req.query.pt,
      l: req.query.l,
      b: req.query.b,
      h: req.query.h,
      ipkg_type: req.query.ipkg_type,
    }),
  )

export const generateShippingLabelController = (req: Request, res: Response) =>
  sendDataResult(
    res,
    service.generateB2CShippingLabel({
      waybill: req.query.waybill,
      pdf: req.query.pdf,
      pdf_size: req.query.pdf_size,
    }),
  )

export const createPickupRequestController = (req: Request, res: Response) =>
  sendDataResult(res, service.createB2CPickupRequest(req.body))

export const createClientWarehouseController = (req: Request, res: Response) =>
  sendDataResult(res, service.createB2CClientWarehouse(req.body))

export const updateClientWarehouseController = (req: Request, res: Response) =>
  sendDataResult(res, service.updateB2CClientWarehouse(req.body))

export const createShipmentController = (req: Request, res: Response) =>
  sendDataResult(res, service.createB2CShipmentManifest(req.body))

export const createMpsShipmentController = (req: Request, res: Response) =>
  sendDataResult(res, service.createB2CMpsShipmentManifest(req.body))

export const editShipmentController = (req: Request, res: Response) =>
  sendDataResult(res, service.editB2CShipment(req.body))

export const cancelShipmentController = (req: Request, res: Response) =>
  sendDataResult(res, service.cancelShipment(req.body?.waybill))

export const updateEwaybillController = (req: Request, res: Response) =>
  sendDataResult(res, service.updateB2CEwaybill(req.params.waybill, req.body))

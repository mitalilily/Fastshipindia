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

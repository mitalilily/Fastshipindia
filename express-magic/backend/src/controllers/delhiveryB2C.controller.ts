import { Request, Response } from 'express'
import {
  DelhiveryService,
  isDelhiveryB2CHeavyPincodeServiceable,
  isDelhiveryB2CPincodeServiceable,
} from '../models/services/couriers/delhivery.service'

const service = new DelhiveryService()

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

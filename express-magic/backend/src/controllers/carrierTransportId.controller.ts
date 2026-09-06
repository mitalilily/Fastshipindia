import { Request, Response } from 'express'
import {
  listCarrierTransportIds,
  saveCarrierTransportIds,
} from '../models/services/carrierTransportId.service'

export async function getCarrierTransportIdsController(req: Request, res: Response) {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const data = await listCarrierTransportIds({ includeInactive })
    return res.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching carrier transport IDs:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch carrier transport IDs',
    })
  }
}

export async function updateCarrierTransportIdsController(req: Request, res: Response) {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : req.body
    const data = await saveCarrierTransportIds(entries)
    return res.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating carrier transport IDs:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update carrier transport IDs',
    })
  }
}

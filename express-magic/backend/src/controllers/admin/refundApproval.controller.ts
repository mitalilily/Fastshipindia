import { Request, Response } from 'express'
import {
  approveRefundApprovalRequest,
  declineRefundApprovalRequest,
  ensureRefundApprovalSchema,
  listRefundApprovalRequests,
} from '../../models/services/refundApproval.service'

export const getRefundApprovalRequests = async (req: Request, res: Response): Promise<any> => {
  try {
    await ensureRefundApprovalSchema()
    const status = String(req.query.status || 'pending').trim().toLowerCase()
    const requests = await listRefundApprovalRequests({
      status: ['pending', 'approved', 'declined', 'all'].includes(status)
        ? (status as any)
        : 'pending',
      limit: Number(req.query.limit || 50),
    })

    return res.status(200).json({ success: true, data: requests })
  } catch (error: any) {
    console.error('Error fetching refund approval requests:', error?.message || error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch refund approval requests',
    })
  }
}

export const approveRefundRequest = async (req: any, res: Response): Promise<any> => {
  try {
    await ensureRefundApprovalSchema()
    const request = await approveRefundApprovalRequest({
      requestId: String(req.params.id || '').trim(),
      adminUserId: String(req.user?.sub || ''),
      notes: String(req.body?.notes || '').trim(),
    })

    return res.status(200).json({
      success: true,
      message: 'Refund approved and wallet credited',
      data: request,
    })
  } catch (error: any) {
    console.error('Error approving refund request:', error?.message || error)
    return res.status(400).json({
      success: false,
      message: error?.message || 'Failed to approve refund request',
    })
  }
}

export const declineRefundRequest = async (req: any, res: Response): Promise<any> => {
  try {
    await ensureRefundApprovalSchema()
    const request = await declineRefundApprovalRequest({
      requestId: String(req.params.id || '').trim(),
      adminUserId: String(req.user?.sub || ''),
      notes: String(req.body?.notes || '').trim(),
    })

    return res.status(200).json({
      success: true,
      message: 'Refund request declined',
      data: request,
    })
  } catch (error: any) {
    console.error('Error declining refund request:', error?.message || error)
    return res.status(400).json({
      success: false,
      message: error?.message || 'Failed to decline refund request',
    })
  }
}

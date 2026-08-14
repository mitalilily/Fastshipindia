import { Request, Response } from 'express'
import { PlansService } from '../../models/services/plan.service'
import { HttpError } from '../../utils/classes'

const sendPlanError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ success: false, message: error.message })
  }
  console.error(fallback, error)
  return res.status(500).json({ success: false, message: fallback })
}

export const PlansController = {
  getPlans: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as 'active' | 'inactive' | undefined
      const allPlans = await PlansService.getAll({ status })
      return res.json(allPlans)
    } catch (error) {
      return sendPlanError(res, error, 'Failed to fetch plans')
    }
  },

  createPlan: async (req: Request, res: Response) => {
    try {
      const plan = await PlansService.create(req.body || {})
      return res.status(201).json(plan)
    } catch (error) {
      return sendPlanError(res, error, 'Failed to create plan')
    }
  },

  updatePlan: async (req: Request, res: Response) => {
    try {
      const updatedPlan = await PlansService.update(req.params.id, req.body || {})
      return res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        data: updatedPlan,
      })
    } catch (error) {
      return sendPlanError(res, error, 'Failed to update plan')
    }
  },

  deletePlan: async (req: Request, res: Response) => {
    try {
      const plan = await PlansService.remove(req.params.id)
      return res.json({ success: true, message: 'Plan deleted successfully', data: plan })
    } catch (error) {
      return sendPlanError(res, error, 'Failed to delete plan')
    }
  },

  assignPlanToUser: async (req: Request, res: Response) => {
    try {
      const { userId, planId } = req.body
      if (!userId || !planId) {
        return res.status(400).json({ success: false, message: 'userId and planId are required' })
      }

      const result = await PlansService.assignOrUpdateUserPlan(userId, planId)
      return res.status(200).json({
        success: true,
        message: 'Plan assigned successfully',
        data: result,
      })
    } catch (error) {
      return sendPlanError(res, error, 'Failed to assign plan')
    }
  },
}

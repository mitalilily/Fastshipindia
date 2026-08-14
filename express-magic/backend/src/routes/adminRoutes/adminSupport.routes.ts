// src/routes/admin.support.routes.ts
import { Router } from 'express'
import { getAllTickets, getTicketsByUserId } from '../../controllers/admin/support.controller'
import {
  getTicketById,
  getTicketMessages,
  replyToTicket,
  updateTicket,
} from '../../controllers/support.controller'
import { isAdminMiddleware } from '../../middlewares/isAdmin'
import { requireAuth } from '../../middlewares/requireAuth'

const router = Router()

// List all tickets with filters
router.get('/support-tickets', requireAuth, isAdminMiddleware, getAllTickets)

// Get a specific ticket
router.get('/support-tickets/:id', requireAuth, isAdminMiddleware, getTicketById)
router.get('/support-tickets/:id/messages', requireAuth, isAdminMiddleware, getTicketMessages)
router.post('/support-tickets/:id/messages', requireAuth, isAdminMiddleware, replyToTicket)

// Update ticket (status, due date)
router.patch('/support-tickets/:id', requireAuth, isAdminMiddleware, updateTicket)

router.get('/support-tickets/user/:userId', requireAuth, isAdminMiddleware, getTicketsByUserId)

export default router

import { Response } from 'express'
import {
  addTicketMessageService,
  createTicketService,
  getTicketByIdService,
  getTicketMessagesService,
  getUserTicketsService,
  updateTicketStatusService
} from '../models/services/support.service'

export const createTicket = async (req: any, res: Response) => {
  try {
    const { subject, category, subcategory, awbNumber, description, dueDate, attachments } =
      req.body
    const userId = req.user.sub

    const ticket = await createTicketService({
      userId,
      subject,
      category,
      subcategory,
      awbNumber,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      attachments,
    })

    res.status(201).json(ticket)
  } catch (err) {
    console.error('[Support] Ticket creation failed:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getMyTickets = async (req: any, res: Response) => {
  try {
    const userId = req.user.sub
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const offset = (page - 1) * limit

    const filters = {
      status: req.query.status ?? '',
      category: req.query.category as string | undefined,
      awbNumber: req.query.awbNumber as string | undefined,
    }

    const { tickets, totalCount, statusCounts } = await getUserTicketsService(userId, limit, offset, filters)

    res.status(200).json({
      data: tickets,
      totalCount,
      statusCounts,
      message: 'Successfully fetched tickets',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getTicketById = async (req: any, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.sub
    const isAdmin = req.user.role === 'admin'

    const ticket = await getTicketByIdService(id, userId, isAdmin)
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    res.status(200).json(ticket)
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.sub
    const isAdmin = req.user.role === 'admin'
    const existingTicket = await getTicketByIdService(id, userId, isAdmin)
    if (!existingTicket) return res.status(404).json({ message: 'Ticket not found' })

    const { status, dueDate } = req.body
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid ticket status' })
    }
    const ticket = await updateTicketStatusService(id, {
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })

    res.status(200).json(ticket)
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getTicketMessages = async (req: any, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.sub
    const isAdmin = req.user.role === 'admin'
    const messages = await getTicketMessagesService(id, userId, isAdmin)

    if (!messages) return res.status(404).json({ message: 'Ticket not found' })
    res.status(200).json({ data: messages })
  } catch (err) {
    console.error('[Support] Get ticket messages failed:', err)
    res.status(500).json({ message: 'Unable to load ticket conversation' })
  }
}

export const replyToTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.sub
    const isAdmin = req.user.role === 'admin'
    const message = String(req.body?.message || '').trim()
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : []

    if (!message || message.length > 4000) {
      return res.status(400).json({ message: 'Reply must be between 1 and 4000 characters' })
    }

    const reply = await addTicketMessageService({
      ticketId: id,
      senderId: userId,
      senderRole: isAdmin ? 'admin' : 'seller',
      message,
      attachments,
      isAdmin,
    })

    if (!reply) return res.status(404).json({ message: 'Ticket not found' })
    res.status(201).json(reply)
  } catch (err) {
    console.error('[Support] Reply to ticket failed:', err)
    res.status(500).json({ message: 'Unable to send reply' })
  }
}


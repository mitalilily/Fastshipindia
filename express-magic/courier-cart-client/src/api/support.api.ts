// src/api/support.api.ts
import axiosInstance from './axiosInstance'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export interface CreateTicketPayload {
  subject: string
  category: string
  subcategory: string
  awbNumber?: string
  description: string
  attachments?: string[]
  dueDate?: string // ISO string
}

export interface SupportTicket {
  id: string
  subject: string
  category: string
  subcategory: string
  awbNumber: string | null
  description: string
  attachments: string[]
  dueDate: string | null
  status: TicketStatus
  createdAt: string
  updatedAt: string
  sellerEmail?: string | null
  sellerPhone?: string | null
  sellerCompanyInfo?: Record<string, unknown> | null
}

export interface SupportTicketMessage {
  id: string
  ticketId: string
  senderId: string
  senderRole: 'admin' | 'seller'
  message: string
  attachments: string[]
  createdAt: string
  senderEmail?: string | null
  senderCompanyInfo?: Record<string, unknown> | null
}

export const createSupportTicket = async (payload: CreateTicketPayload) => {
  const res = await axiosInstance.post<SupportTicket>('/support/tickets', payload)
  return res.data
}

// src/api/support.ts or similar

export const getMySupportTickets = async (page = 1, limit = 10, filters = {}) => {
  const flatParams = {
    page,
    limit,
    ...filters, // flatten the filter keys directly into the query
  }

  const res = await axiosInstance.get<{
    data: SupportTicket[]
    message: string
    totalCount: number,
     statusCounts: Record<TicketStatus, number>
  }>('/support/tickets', {
    params: flatParams,
  })

  return res.data
}

export const getSupportTicketById = async (id: string) => {
  const res = await axiosInstance.get<SupportTicket>(`/support/tickets/${id}`)
  return res.data
}

export const getSupportTicketMessages = async (id: string) => {
  const res = await axiosInstance.get<{ data: SupportTicketMessage[] }>(
    `/support/tickets/${id}/messages`,
  )
  return res.data.data
}

export const replyToSupportTicket = async (id: string, message: string) => {
  const res = await axiosInstance.post<SupportTicketMessage>(`/support/tickets/${id}/messages`, {
    message,
  })
  return res.data
}

export const updateSupportTicket = async (
  id: string,
  data: Partial<Pick<SupportTicket, 'status' | 'dueDate'>>,
) => {
  const res = await axiosInstance.patch<SupportTicket>(`/support/tickets/${id}`, data)
  return res.data
}


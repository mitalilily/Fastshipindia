import { Request, Response } from 'express'
import {
  adjustWalletBalanceByAdmin,
  getConsolidatedWalletMisExportRows,
  getConsolidatedWalletMisReport,
  getAllWallets,
  getWalletByUserId,
  getWalletTransactionsByUserId,
} from '../../models/services/adminWallet.service'
import { buildCsv } from '../../utils/csv'

const MAX_ADMIN_ADJUSTMENT = 9_999_999_999.99

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(max, Math.floor(parsed))
}

const WALLET_MIS_HEADERS = [
  'Customer Name',
  'Customer id',
  'transaction Date',
  'wallet transaction Amount',
  'Transaction against',
  'transaction type',
  'AWB',
  'Courier partner name',
  'Weight',
]

const parseDateParam = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const endOfDay = (date?: Date) => {
  if (!date) return undefined
  const out = new Date(date)
  out.setHours(23, 59, 59, 999)
  return out
}

const parseNumberParam = (value?: string) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseWalletMisQuery = (query: Request['query']) => {
  const queryType = query.type as string | undefined
  const type: 'credit' | 'debit' | undefined =
    queryType === 'credit' || queryType === 'debit' ? queryType : undefined
  const dateFrom = parseDateParam(query.dateFrom as string | undefined)
  const dateTo = endOfDay(parseDateParam(query.dateTo as string | undefined))

  return {
    page: parseInt((query.page as string) || '1'),
    limit: parseInt((query.limit as string) || '50'),
    search: (query.search as string) || undefined,
    customerId: (query.customerId as string) || undefined,
    type,
    transactionAgainst: (query.transactionAgainst as string) || undefined,
    dateFrom,
    dateTo,
    awb: (query.awb as string) || undefined,
    courier: (query.courier as string) || undefined,
    minWeight: parseNumberParam(query.minWeight as string | undefined),
    maxWeight: parseNumberParam(query.maxWeight as string | undefined),
    shipmentOnly: query.shipmentOnly === 'true',
  }
}

export const listWallets = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100_000)
    const limit = parsePositiveInt(req.query.limit, 20, 100)
    const search = (req.query.search as string) || ''
    const sortBy =
      (req.query.sortBy as 'balance' | 'createdAt' | 'updatedAt' | 'email' | 'companyName' | undefined) ||
      'updatedAt'
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc' | undefined) || 'desc'

    const result = await getAllWallets({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    })

    res.status(200).json({ success: true, ...result })
  } catch (error) {
    console.error('Error fetching wallets:', error)
    res.status(500).json({ success: false, message: 'Server error fetching wallets' })
  }
}

export const getWalletMisReport = async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await getConsolidatedWalletMisReport(parseWalletMisQuery(req.query))
    res.status(200).json({ success: true, ...result })
  } catch (error: any) {
    console.error('Error fetching wallet MIS report:', error)
    res.status(500).json({
      success: false,
      message: error?.message || 'Server error fetching wallet MIS report',
    })
  }
}

export const exportWalletMisReportCsv = async (req: Request, res: Response): Promise<any> => {
  try {
    const query = parseWalletMisQuery(req.query)
    const rows = await getConsolidatedWalletMisExportRows({
      ...query,
      limit: parseInt((req.query.limit as string) || '5000'),
    })
    const csv = buildCsv(WALLET_MIS_HEADERS, rows)
    const today = new Date().toISOString().split('T')[0]

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="wallet_mis_${today}.csv"`)
    return res.status(200).send(csv)
  } catch (error: any) {
    console.error('Error exporting wallet MIS report:', error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Server error exporting wallet MIS report',
    })
  }
}

export const getWallet = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' })
    }

    const wallet = await getWalletByUserId(userId)
    res.status(200).json({ success: true, data: wallet })
  } catch (error: any) {
    console.error('Error fetching wallet:', error)
    if (error.message === 'Wallet not found for this user') {
      return res.status(404).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: 'Server error fetching wallet' })
  }
}

export const getWalletTransactions = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' })
    }

    const page = parsePositiveInt(req.query.page, 1, 100_000)
    const limit = parsePositiveInt(req.query.limit, 50, 100)
    const rawType = String(req.query.type || '').trim().toLowerCase()
    if (rawType && rawType !== 'credit' && rawType !== 'debit') {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' })
    }
    const type = rawType ? (rawType as 'credit' | 'debit') : undefined
    const dateFrom = parseDateParam(req.query.dateFrom as string | undefined)
    const dateTo = endOfDay(parseDateParam(req.query.dateTo as string | undefined))

    if (req.query.dateFrom && !dateFrom) {
      return res.status(400).json({ success: false, message: 'Invalid start date' })
    }
    if (req.query.dateTo && !dateTo) {
      return res.status(400).json({ success: false, message: 'Invalid end date' })
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date' })
    }

    const result = await getWalletTransactionsByUserId({
      userId,
      page,
      limit,
      type,
      dateFrom,
      dateTo,
    })

    res.status(200).json({ success: true, ...result })
  } catch (error: any) {
    console.error('Error fetching wallet transactions:', error)
    if (error.message === 'Wallet not found for this user') {
      return res.status(404).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: 'Server error fetching wallet transactions' })
  }
}

export const adjustWalletBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params
    const { type, amount, reason, notes } = req.body || {}

    if (!userId || !type || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, amount, and reason are required',
      })
    }

    if (type !== 'credit' && type !== 'debit') {
      return res.status(400).json({
        success: false,
        message: 'type must be either "credit" or "debit"',
      })
    }

    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > MAX_ADMIN_ADJUSTMENT) {
      return res.status(400).json({
        success: false,
        message: `amount must be between 0.01 and ${MAX_ADMIN_ADJUSTMENT}`,
      })
    }
    const roundedAmount = Math.round(amountNum * 100) / 100
    if (Math.abs(roundedAmount - amountNum) > Number.EPSILON) {
      return res.status(400).json({
        success: false,
        message: 'amount can have at most two decimal places',
      })
    }

    const cleanReason = String(reason).trim()
    const cleanNotes = String(notes || '').trim()
    if (cleanReason.length < 2 || cleanReason.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'reason must be between 2 and 128 characters',
      })
    }
    if (cleanNotes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'notes cannot exceed 1000 characters',
      })
    }

    const adjustment = await adjustWalletBalanceByAdmin({
      userId,
      adminUserId: String((req as any).user?.sub || 'admin'),
      amount: roundedAmount,
      type,
      reason: cleanReason,
      notes: cleanNotes,
    })

    const updatedWallet = await getWalletByUserId(userId)

    res.status(200).json({
      success: true,
      message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`,
      data: updatedWallet,
      transaction: adjustment.transaction,
    })
  } catch (error: any) {
    console.error('Error adjusting wallet balance:', error)
    if (error.message === 'Wallet not found for this user') {
      return res.status(404).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: 'Server error adjusting wallet balance' })
  }
}

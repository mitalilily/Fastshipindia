export const WALLET_ADJUSTMENT_REASONS = {
  credit: [
    'Manual wallet recharge',
    'Payment received',
    'Order refund',
    'Promotional credit',
    'COD remittance adjustment',
    'Shipping charge reversal',
    'Billing correction',
    'Goodwill credit',
  ],
  debit: [
    'Shipping charges',
    'COD charges',
    'RTO charges',
    'Weight discrepancy adjustment',
    'Penalty or service charge',
    'Refund reversal',
    'Billing correction',
    'Manual wallet debit',
  ],
}

export const OTHER_WALLET_REASON = '__other__'

export const resolveWalletAdjustmentReason = (reasonOption, customReason) =>
  reasonOption === OTHER_WALLET_REASON ? customReason.trim() : reasonOption.trim()

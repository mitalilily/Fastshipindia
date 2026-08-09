export type OtpResponseLike = {
  devOtp?: unknown
  otp?: unknown
  code?: unknown
  verificationCode?: unknown
  data?: OtpResponseLike
}

const toSixDigitOtp = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const otp = String(value).trim()
  return /^\d{6}$/.test(otp) ? otp : ''
}

export const extractScreenOtp = (response?: OtpResponseLike | null): string => {
  if (!response) return ''

  return (
    toSixDigitOtp(response.devOtp) ||
    toSixDigitOtp(response.otp) ||
    toSixDigitOtp(response.code) ||
    toSixDigitOtp(response.verificationCode) ||
    extractScreenOtp(response.data)
  )
}

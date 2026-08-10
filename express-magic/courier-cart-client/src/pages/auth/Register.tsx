import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import { useState } from 'react'
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiTruck, FiUser } from 'react-icons/fi'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import { registerMerchantApi, type RegisterMerchantPayload } from '../../api/auth'
import OtpForm from '../../components/auth/OtpForm'
import { toast } from '../../components/UI/Toast'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../context/auth/AuthContext'
import { extractScreenOtp } from '../../utils/authOtp'
import { DEMO_OTP, isDemoLoginEnabled, setRegistrationDraft } from '../../utils/demoAuth'

type FormState = RegisterMerchantPayload & { confirmPassword: string; accepted: boolean }
type FieldErrors = Partial<Record<keyof FormState | 'form', string>>
type ApiError = { response?: { status?: number; data?: { error?: string } } }

const initialForm: FormState = {
  userType: 'individual',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  accepted: false,
}

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const { teal, tealDark, orange, ink, text, muted, paper, surface, border } = BRAND.colors

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    borderRadius: 1,
    bgcolor: paper,
    '& fieldset': { borderColor: border },
    '&:hover fieldset': { borderColor: alpha(teal, 0.55) },
    '&.Mui-focused fieldset': { borderColor: teal, borderWidth: 1.5 },
  },
  '& .MuiFormHelperText-root': { ml: 0, mt: 0.45, fontWeight: 650 },
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.userType) errors.userType = 'Select a user type.'
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) errors.phone = 'Enter a valid 10-digit phone number.'
  if (!passwordPattern.test(form.password)) errors.password = 'Use 8+ characters with uppercase, lowercase, number and special character.'
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.'
  if (!form.accepted) errors.accepted = 'Accept the Terms and Privacy Policy.'
  return errors
}

export default function Register() {
  const { isAuthenticated, loading } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationOtp, setVerificationOtp] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const email = form.email.trim().toLowerCase()
    const phone = form.phone.replace(/\D/g, '')
    setSubmitting(true)
    setRegistrationDraft({ userType: form.userType, name: form.name.trim(), email, phone: `+91${phone}` })
    sessionStorage.setItem('activeEmail', email)

    try {
      const response = await registerMerchantApi({
        userType: form.userType,
        name: form.name.trim(),
        email,
        phone,
        password: form.password,
      })
      setVerificationEmail(email)
      setVerificationOtp(extractScreenOtp(response) || (isDemoLoginEnabled() ? DEMO_OTP : ''))
      toast.open({ message: response.message || 'Account created. Verify your email to continue.', severity: 'success' })
    } catch (error: unknown) {
      const apiError = error as ApiError
      const message = apiError.response?.data?.error || 'Account registration is temporarily unavailable.'
      if (apiError.response?.status === 409) {
        setErrors({ form: message })
      } else if (isDemoLoginEnabled()) {
        setVerificationEmail(email)
        setVerificationOtp(DEMO_OTP)
        toast.open({ message: `${message} Demo verification is available on screen.`, severity: 'warning' })
      } else {
        setErrors({ form: message })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: surface, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(480px, 1fr) minmax(520px, 0.82fr)' } }}>
      <Box sx={{ display: { xs: 'none', lg: 'flex' }, position: 'relative', overflow: 'hidden', bgcolor: '#eaf2fc', alignItems: 'center', justifyContent: 'center', p: 5 }}>
        <Box component="img" src="/images/fastship-login-3d.webp" alt="FastShip delivery network" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#ffffff', 0.12)}, ${alpha(tealDark, 0.52)})` }} />
        <Stack sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }} justifyContent="space-between">
          <Box component="img" src={BRAND.logo} alt="FastShip" sx={{ width: 150, bgcolor: '#fff', p: 1, borderRadius: 1, boxShadow: '0 12px 30px rgba(6,26,51,0.16)' }} />
          <Box sx={{ maxWidth: 560, color: paper }}>
            <Typography component="h1" sx={{ fontSize: 48, lineHeight: 1.06, fontWeight: 950, letterSpacing: 0 }}>Start shipping with confidence.</Typography>
            <Typography sx={{ mt: 1.5, fontSize: 18, lineHeight: 1.55, color: alpha(paper, 0.86) }}>Create your merchant workspace for courier booking, tracking, billing and delivery operations.</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ minWidth: 0, bgcolor: paper, overflowY: 'auto' }}>
        <Stack sx={{ minHeight: '100svh', px: { xs: 2, sm: 4, xl: 7 }, py: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Box component="img" src={BRAND.logo} alt="FastShip" sx={{ width: 126, display: { lg: 'none' } }} />
            <Button component={RouterLink} to="/tracking" startIcon={<FiTruck />} sx={{ ml: 'auto', minHeight: 38, px: 2, borderRadius: 1, bgcolor: teal, color: '#fff', textTransform: 'none', fontWeight: 850, '&:hover': { bgcolor: tealDark } }}>Track Order</Button>
          </Stack>

          <Box sx={{ width: '100%', maxWidth: 590, mx: 'auto', my: 'auto' }}>
            <Typography component="h2" sx={{ color: ink, fontSize: { xs: 28, sm: 32 }, fontWeight: 950, letterSpacing: 0 }}>Create your FastShip account</Typography>
            <Typography sx={{ mt: 0.4, mb: 2, color: muted, fontSize: 14.5 }}>Already registered? <Link component={RouterLink} to="/login" sx={{ color: teal, fontWeight: 850 }}>Sign in</Link></Typography>

            {verificationEmail ? (
              <Box sx={{ borderTop: `1px solid ${border}`, pt: 2 }}>
                <Typography sx={{ color: ink, fontSize: 20, fontWeight: 900 }}>Verify your email</Typography>
                <Typography sx={{ mt: 0.5, mb: 1.5, color: text }}>Enter the code for <b>{verificationEmail}</b> to activate your account.</Typography>
                <OtpForm email={verificationEmail} debugOtp={verificationOtp} onDebugOtpChange={setVerificationOtp} onEditEmail={() => setVerificationEmail('')} />
              </Box>
            ) : (
              <Stack component="form" onSubmit={handleSubmit} spacing={1.15} noValidate>
                {errors.form && <Box role="alert" sx={{ p: 1.2, border: `1px solid ${alpha(orange, 0.28)}`, bgcolor: alpha(orange, 0.06), color: orange, fontSize: 13.5, fontWeight: 750 }}>{errors.form}</Box>}

                <FormControl error={Boolean(errors.userType)} size="small" sx={fieldSx}>
                  <InputLabel>User type</InputLabel>
                  <Select value={form.userType} label="User type" onChange={(event) => update('userType', event.target.value as FormState['userType'])}>
                    <MenuItem value="individual">Individual Seller</MenuItem>
                    <MenuItem value="business">Business / Company</MenuItem>
                  </Select>
                  {errors.userType && <Typography sx={{ mt: 0.45, color: '#d32f2f', fontSize: 12, fontWeight: 650 }}>{errors.userType}</Typography>}
                </FormControl>

                <TextField label="Full name" value={form.name} onChange={(event) => update('name', event.target.value)} error={Boolean(errors.name)} helperText={errors.name} sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><FiUser /></InputAdornment> }} />
                <TextField label="Email address" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} error={Boolean(errors.email)} helperText={errors.email} sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><FiMail /></InputAdornment> }} />
                <TextField label="Phone number" value={form.phone} onChange={(event) => update('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} error={Boolean(errors.phone)} helperText={errors.phone} sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><Stack direction="row" alignItems="center" spacing={0.7}><FiPhone /><span>+91</span></Stack></InputAdornment> }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.15 }}>
                  <TextField label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} error={Boolean(errors.password)} helperText={errors.password} sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><FiLock /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <FiEyeOff /> : <FiEye />}</IconButton></InputAdornment> }} />
                  <TextField label="Confirm password" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword} sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><FiLock /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</IconButton></InputAdornment> }} />
                </Box>

                <FormControlLabel control={<Checkbox checked={form.accepted} onChange={(event) => update('accepted', event.target.checked)} sx={{ color: border, '&.Mui-checked': { color: teal } }} />} label={<Typography sx={{ color: text, fontSize: 13.5 }}>I agree to the <Link component={RouterLink} to="/terms" target="_blank" sx={{ color: teal, fontWeight: 800 }}>Terms and Conditions</Link> and <Link component={RouterLink} to="/privacy" target="_blank" sx={{ color: teal, fontWeight: 800 }}>Privacy Policy</Link>.</Typography>} />
                {errors.accepted && <Typography sx={{ mt: '-8px !important', color: '#d32f2f', fontSize: 12, fontWeight: 650 }}>{errors.accepted}</Typography>}

                <Button type="submit" disabled={submitting} sx={{ minHeight: 48, borderRadius: 1, bgcolor: teal, color: '#fff', textTransform: 'none', fontSize: 15, fontWeight: 900, '&:hover': { bgcolor: tealDark }, '&.Mui-disabled': { bgcolor: alpha(teal, 0.5), color: '#fff' } }}>{submitting ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}</Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

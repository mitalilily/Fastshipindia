import { Router } from 'express'
import {
  adminChangePasswordController,
  adminLoginController,
  googleOAuthLogin,
  logoutController,
  logoutOtherDevicesController,
  //   loginController,
  //   logoutController,
  refreshTokenController,
  registerMerchant,
  requestEmailVerification,
  requestPasswordReset,
  requestOtp,
  resetPassword,
  verifyEmailToken,
  verifyOtp,
} from '../controllers/authController'
import { isAdminMiddleware } from '../middlewares/isAdmin'
import { requireAuth } from '../middlewares/requireAuth'

const router = Router()

router.post('/admin/login', adminLoginController)
router.post('/admin/change-password', requireAuth, isAdminMiddleware, adminChangePasswordController)

router.post('/request-otp', requestOtp)
router.post('/verify-otp', verifyOtp)
router.post('/register', registerMerchant)

router.post('/request-password-login', requestEmailVerification)
router.post('/request-password-reset', requestPasswordReset)
router.post('/reset-password', resetPassword)

router.post('/verify-user-email', verifyEmailToken)
router.post('/signin-with-google', googleOAuthLogin)

// router.post("/login", loginController);
router.post('/refresh-token', refreshTokenController) // ✅ No auth needed - uses refresh token
router.post('/logout', logoutController) // ✅ Logout should work even if access token expired

router.post('/logout-other-devices', requireAuth, logoutOtherDevicesController)

export default router

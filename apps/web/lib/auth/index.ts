// Re-export only the server actions for client components
// These are 'use server' functions that can be safely imported in client components
export {
  signup,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
  changePassword,
  type AuthResult,
} from './actions'

import { Router } from 'express'
import {
  login,
  logout,
  register,
  wxLogin,
  getProfile,
  updateProfile,
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from '../controllers/user.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

// 无需认证
router.post('/login', login)
router.post('/wx-login', wxLogin)
router.post('/register', register)

// 需要认证
router.get('/profile', authenticate, getProfile)
router.patch('/profile', authenticate, updateProfile)
router.post('/logout', authenticate, logout)

// 收货地址（需要认证）
router.post('/addresses', authenticate, createAddress)
router.get('/addresses', authenticate, getAddresses)
router.patch('/addresses/:addressId', authenticate, updateAddress)
router.delete('/addresses/:addressId', authenticate, deleteAddress)

export default router

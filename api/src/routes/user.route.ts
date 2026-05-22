import { Router, Request, Response, NextFunction } from 'express'
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
import {
  getCartList,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} from '../controllers/cart.controller'
import { authenticate } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { removeDir } from '../utils/file'

const router = Router()

const autoCleanupTemp = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => removeDir(req.tempDir))
  next()
}

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      removeDir(req.tempDir)
      return res.status(400).json({ code: 400, msg: err.message || '文件上传失败' })
    }
    next()
  })
}

// 无需认证
router.post('/login', login)
router.post('/wx-login', wxLogin)
router.post('/register', register)

// 需要认证
router.get('/profile', authenticate, getProfile)
router.patch('/profile', authenticate, updateProfile)
router.post('/profile/avatar', handleUpload, autoCleanupTemp, authenticate, updateProfile)
router.post('/logout', authenticate, logout)

// 收货地址（需要认证）
router.post('/addresses', authenticate, createAddress)
router.get('/addresses', authenticate, getAddresses)
router.patch('/addresses/:addressId', authenticate, updateAddress)
router.delete('/addresses/:addressId', authenticate, deleteAddress)

// 购物车（需要认证）
router.get('/cart', authenticate, getCartList)
router.post('/cart', authenticate, addToCart)
router.patch('/cart/:cartId', authenticate, updateCartQuantity)
router.delete('/cart/:cartId', authenticate, removeFromCart)

export default router

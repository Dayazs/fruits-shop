import { Router } from 'express'
import {
  createOrder,
  getOrderList,
  getOrderDetail,
  cancelOrder,
  payOrder,
  payCallback,
  getAdminOrderList,
  getAdminOrderDetail,
  adminUpdateOrder,
  shipOrder,
} from '../controllers/order.controller'
import { authenticate, isAdmin } from '../middleware/auth'

const router = Router()

// ─── C 端（需登录）───
router.post('/', authenticate, createOrder)
router.get('/', authenticate, getOrderList)
router.get('/:orderId', authenticate, getOrderDetail)
router.patch('/:orderId/cancel', authenticate, cancelOrder)
router.post('/pay', authenticate, payOrder)

// ─── 支付回调（微信服务器 JSON，无需认证）───
router.post('/pay-callback', payCallback)

// ─── 管理端（需管理员认证）───
router.get('/admin/list', authenticate, isAdmin, getAdminOrderList)
router.get('/admin/:orderId', authenticate, isAdmin, getAdminOrderDetail)
router.patch('/admin/:orderId', authenticate, isAdmin, adminUpdateOrder)
router.patch('/admin/:orderId/ship', authenticate, isAdmin, shipOrder)

export default router

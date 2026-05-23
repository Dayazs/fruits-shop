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

// ─── 管理端（固定路径在前，避免被 :orderId 误匹配）───
router.get('/admin/list', authenticate, isAdmin, getAdminOrderList)
router.get('/admin/:orderId', authenticate, isAdmin, getAdminOrderDetail)
router.patch('/admin/:orderId', authenticate, isAdmin, adminUpdateOrder)
router.patch('/admin/:orderId/ship', authenticate, isAdmin, shipOrder)

// ─── 支付回调（无需认证）───
router.post('/pay-callback', payCallback)

// ─── C 端（需登录）───
router.post('/', authenticate, createOrder)
router.post('/pay', authenticate, payOrder)
router.get('/', authenticate, getOrderList)
router.get('/:orderId', authenticate, getOrderDetail)
router.patch('/:orderId/cancel', authenticate, cancelOrder)

export default router

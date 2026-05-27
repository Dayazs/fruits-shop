import { Router } from 'express'
import {
  login,
  getUserList,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  exportUsers,
} from '../controllers/admin.controller'
import { authenticate, isAdmin } from '../middleware/auth'

const router = Router()

// 管理员登录（无需认证）
router.post('/login', login)

// ─── 用户管理（均需管理员认证）───
router.get('/users/export', authenticate, isAdmin, exportUsers)
router.get('/users', authenticate, isAdmin, getUserList)
router.patch('/users/:id', authenticate, isAdmin, updateUser)
router.patch('/users/:id/status', authenticate, isAdmin, toggleUserStatus)
router.patch('/users/:id/reset-password', authenticate, isAdmin, resetUserPassword)

export default router

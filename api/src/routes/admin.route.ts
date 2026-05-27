import { Router } from 'express'
import {
  login,
  getUserList,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  exportUsers,
  getAdminList,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getPermissionList,
  getMe,
} from '../controllers/admin.controller'
import { authenticate, isAdmin, requirePermission } from '../middleware/auth'

const router = Router()

// 管理员登录（无需认证）
router.post('/login', login)

// 获取当前管理员最新信息（含 DB 最新权限，用于权限刷新）
router.get('/me', authenticate, isAdmin, getMe)

// ─── 用户管理（router 级 isAdmin，子路由可加细粒度权限）───
router.get('/users/export', authenticate, isAdmin, exportUsers)
router.get('/users', authenticate, isAdmin, getUserList)
router.patch('/users/:id', authenticate, isAdmin, updateUser)
router.patch('/users/:id/status', authenticate, isAdmin, toggleUserStatus)
router.patch('/users/:id/reset-password', authenticate, isAdmin, resetUserPassword)

// ─── 管理员管理（需 admin 权限或超管）───
const adminAuth = [authenticate, isAdmin, requirePermission('admin')]
router.get('/admins', ...adminAuth, getAdminList)
router.post('/admins', ...adminAuth, createAdmin)
router.patch('/admins/:id', ...adminAuth, updateAdmin)
router.delete('/admins/:id', ...adminAuth, deleteAdmin)

// ─── 权限定义（所有管理员可查看，用于角色配置时选择）───
router.get('/permissions', authenticate, isAdmin, getPermissionList)

// ─── 角色管理（需 admin 权限或超管）───
router.get('/roles', ...adminAuth, getRoleList)
router.post('/roles', ...adminAuth, createRole)
router.patch('/roles/:id', ...adminAuth, updateRole)
router.delete('/roles/:id', ...adminAuth, deleteRole)

export default router

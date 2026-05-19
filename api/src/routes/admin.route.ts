import { Router } from 'express'
import { login } from '../controllers/admin.controller'

const router = Router()

router.post('/login', login) // 管理员登录

export default router

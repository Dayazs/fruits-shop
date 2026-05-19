import { Router } from 'express'
import {
  getUserInfo,
  login,
  logout,
  register,
} from '../controllers/user.controller'

const router = Router()

// 测试接口
router.get('/getUser', getUserInfo)

router.post('/login', login) // 用户登录
router.post('/register', register) // 用户注册
router.post('/logout', logout) // 用户登出

export default router

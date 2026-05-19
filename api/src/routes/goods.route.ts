import { Router } from 'express'
import { createGoods, getAdminGoodsList } from '../controllers/goods.controller'
import { authenticate, isAdmin } from '../middleware/auth'

const router = Router()

router.post('/admin/create', authenticate, isAdmin, createGoods) // 添加商品
router.get('/admin/list', authenticate, isAdmin, getAdminGoodsList) // 后台商品列表

export default router

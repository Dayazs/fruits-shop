import { Router } from 'express'
import userRouter from './user.route'
import adminRouter from './admin.route'
import goodsRouter from './goods.route'

const router = Router()

router.use('/user', userRouter) // 用户相关接口
router.use('/admin', adminRouter) // 管理员相关接口
router.use('/goods', goodsRouter) // 商品相关接口
export default router

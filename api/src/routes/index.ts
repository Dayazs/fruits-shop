import { Router } from 'express'
import userRouter from './user.route'
import adminRouter from './admin.route'
import goodsRouter from './goods.route'
import bannerRouter from './banner.route'
import homeRouter from './home.route'
import orderRouter from './order.route'

const router = Router()

router.use('/user', userRouter) // 用户相关接口
router.use('/admin', adminRouter) // 管理员相关接口
router.use('/goods', goodsRouter) // 商品相关接口
router.use('/banners', bannerRouter) // 轮播图相关接口
router.use('/home', homeRouter) // C 端首页接口（无需认证）
router.use('/order', orderRouter) // 订单相关接口
export default router

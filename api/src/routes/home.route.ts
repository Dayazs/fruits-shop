import { Router } from 'express'
import { getGoodsList, getGoodsDetail, getPublicCategories, getPublicBanners } from '../controllers/home.controller'

const router = Router()

// 商品列表（仅上架）
router.get('/goods', getGoodsList)
// 商品详情（含 SKU）
router.get('/goods/:id', getGoodsDetail)
// 商品分类（仅显示）
router.get('/categories', getPublicCategories)
// 轮播图（仅启用）
router.get('/banners', getPublicBanners)

export default router

import { Router, Request, Response, NextFunction } from 'express'
import {
  createGoods,
  getAdminGoodsList,
  toggleGoodsStatus,
  updateGoods,
  softDeleteGoods,
  hardDeleteGoods,
  getRecycleBin,
  getCategories,
  restoreGoods,
  getGoodsSkus,
} from '../controllers/goods.controller'
import { authenticate, isAdmin } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { removeDir } from '../utils/file'

const router = Router()

// 文件上传后的自动清理：不论成功或失败，都确保临时目录被清理
const autoCleanupTemp = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => removeDir(req.tempDir))
  next()
}

// multer 错误处理：上传失败时立即清理临时目录
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      removeDir(req.tempDir)
      return res
        .status(400)
        .json({ code: 400, msg: err.message || '文件上传失败' })
    }
    next()
  })
}

// 需要文件上传的路由
const withUpload = [handleUpload, autoCleanupTemp, authenticate, isAdmin]

// 仅认证鉴权
const withAuth = [authenticate, isAdmin]

// 商品列表（不含已删除）
router.get('/admin/list', ...withAuth, getAdminGoodsList)
// 商品分类
router.get('/admin/categories', ...withAuth, getCategories)
// 回收站列表
router.get('/admin/recycle', ...withAuth, getRecycleBin)
// 商品 SKU 详情
router.get('/admin/:goodsId/skus', ...withAuth, getGoodsSkus)
// 添加商品
router.post('/admin/create', ...withUpload, createGoods)
// 编辑商品信息
router.patch('/admin/:goodsId', ...withUpload, updateGoods)
// 更新商品状态
router.patch('/admin/:goodsId/status', ...withAuth, toggleGoodsStatus)
// 软删除（移入回收站）
router.delete('/admin/:goodsId', ...withAuth, softDeleteGoods)
// 移除软删除
router.patch('/admin/:goodsId/restoregoods', ...withAuth, restoreGoods)
// 彻底删除
router.delete('/admin/:goodsId/hard', ...withAuth, hardDeleteGoods)

export default router

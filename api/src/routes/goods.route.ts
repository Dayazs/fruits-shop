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
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/goods.controller'
import { authenticate, isAdmin } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { removeDir } from '../utils/file'

const router = Router()

const autoCleanupTemp = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => removeDir(req.tempDir))
  next()
}

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

const withUpload = [handleUpload, autoCleanupTemp, authenticate, isAdmin]
const withAuth = [authenticate, isAdmin]

// ─── 固定路径（必须在带参路由前）───
router.get('/admin/list', ...withAuth, getAdminGoodsList)
router.get('/admin/categories', ...withAuth, getCategories)
router.get('/admin/recycle', ...withAuth, getRecycleBin)
router.post('/admin/create', ...withUpload, createGoods)

// ─── 分类增/改/删（固定 "categories" 段，在 :goodsId 前）───
router.post('/admin/categories', ...withAuth, createCategory)
router.patch('/admin/categories/:categoryId', ...withAuth, updateCategory)
router.delete('/admin/categories/:categoryId', ...withAuth, deleteCategory)

// ─── :goodsId 参数路由 ───
router.get('/admin/:goodsId/skus', ...withAuth, getGoodsSkus)
router.patch('/admin/:goodsId', ...withUpload, updateGoods)
router.patch('/admin/:goodsId/status', ...withAuth, toggleGoodsStatus)
router.patch('/admin/:goodsId/restoregoods', ...withAuth, restoreGoods)
router.delete('/admin/:goodsId', ...withAuth, softDeleteGoods)
router.delete('/admin/:goodsId/hard', ...withAuth, hardDeleteGoods)

export default router

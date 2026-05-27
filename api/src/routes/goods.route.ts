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
import { authenticate, isAdmin, requirePermission } from '../middleware/auth'
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

const auth = [authenticate, isAdmin] as any[]
const rp = requirePermission

const goodsList = [...auth, rp('goods')]
const goodsAdd = [...auth, rp('goods:add')]
const goodsEdit = [...auth, rp('goods:edit')]
const goodsToggle = [...auth, rp('goods:toggle')]
const catAdd = [...auth, rp('category:add')]
const catEdit = [...auth, rp('category:edit')]
const catDelete = [...auth, rp('category:delete')]
const withUpload = (perms: any[]) => [handleUpload, autoCleanupTemp, ...perms]

// ─── 固定路径（必须在带参路由前）───
router.get('/admin/list', ...goodsList, getAdminGoodsList)
router.get('/admin/categories', ...goodsList, getCategories)
router.get('/admin/recycle', ...goodsList, getRecycleBin)
router.post('/admin/create', ...withUpload(goodsAdd), createGoods)

// ─── 分类增/改/删 ───
router.post('/admin/categories', ...withUpload(catAdd), createCategory)
router.patch('/admin/categories/:categoryId', ...withUpload(catEdit), updateCategory)
router.delete('/admin/categories/:categoryId', ...catDelete, deleteCategory)

// ─── :goodsId 参数路由 ───
router.get('/admin/:goodsId/skus', ...goodsList, getGoodsSkus)
router.patch('/admin/:goodsId', ...withUpload(goodsEdit), updateGoods)
router.patch('/admin/:goodsId/status', ...goodsToggle, toggleGoodsStatus)
router.patch('/admin/:goodsId/restoregoods', ...goodsList, restoreGoods)
router.delete('/admin/:goodsId', ...goodsList, softDeleteGoods)
router.delete('/admin/:goodsId/hard', ...goodsList, hardDeleteGoods)

export default router

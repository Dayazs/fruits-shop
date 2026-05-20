import { Router, Request, Response, NextFunction } from 'express'
import {
  createGoods,
  getAdminGoodsList,
  toggleGoodsStatus,
  updateGoods,
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

// 需要文件上传的路由（创建、编辑）
const withUpload = [handleUpload, autoCleanupTemp, authenticate, isAdmin]

// 无需文件上传的路由
const withAuth = [authenticate, isAdmin]

// 添加商品
router.post('/admin/create', ...withUpload, createGoods)
// 编辑商品信息
router.patch('/admin/:goodsId', ...withUpload, updateGoods)
// 获取商品列表
router.get('/admin/list', ...withAuth, getAdminGoodsList)
// 更新商品状态
router.patch('/admin/:goodsId/status', ...withAuth, toggleGoodsStatus)

export default router

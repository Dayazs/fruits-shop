import { Router, Request, Response, NextFunction } from 'express'
import { createGoods, getAdminGoodsList } from '../controllers/goods.controller'
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
      // multer 内部已创建 tempDir，需清理
      return res
        .status(400)
        .json({ code: 400, msg: err.message || '文件上传失败' })
    }
    next()
  })
}

router.post(
  '/admin/create',
  handleUpload,
  autoCleanupTemp,
  authenticate,
  isAdmin,
  createGoods,
)

router.get('/admin/list', authenticate, isAdmin, getAdminGoodsList)

export default router

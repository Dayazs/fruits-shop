import { Router, Request, Response, NextFunction } from 'express'
import { getBanners, createBanner, updateBanner, deleteBanner } from '../controllers/banner.controller'
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
      return res.status(400).json({ code: 400, msg: err.message || '文件上传失败' })
    }
    next()
  })
}

const withUpload = [handleUpload, autoCleanupTemp, authenticate, isAdmin]
const withAuth = [authenticate, isAdmin]

router.get('/', ...withAuth, getBanners)
router.post('/', ...withUpload, createBanner)
router.patch('/:bannerId', ...withUpload, updateBanner)
router.delete('/:bannerId', ...withAuth, deleteBanner)

export default router

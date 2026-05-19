import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      tempDir?: string
    }
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    // 第一个文件到达时创建临时目录，后续文件复用同一目录
    if (!req.tempDir) {
      const uuid = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
      const tempDir = path.join('uploads', 'temp', uuid)
      fs.ensureDirSync(tempDir)
      req.tempDir = tempDir
    }
    cb(null, req.tempDir)
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('仅支持上传图片文件'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

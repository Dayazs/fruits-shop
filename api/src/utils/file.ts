import fs from 'fs-extra'
import path from 'path'

const UPLOADS_ROOT = path.join(__dirname, '../../uploads')

export function ensureDir(dirPath: string): void {
  fs.ensureDirSync(dirPath)
}

export function createTempDir(): string {
  const uuid = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
  const tempDir = path.join(UPLOADS_ROOT, 'temp', uuid)
  fs.ensureDirSync(tempDir)
  return tempDir
}

export function moveFile(tempFilePath: string, targetDir: string): string {
  const fileName = path.basename(tempFilePath)
  const targetPath = path.join(targetDir, fileName)
  fs.moveSync(tempFilePath, targetPath, { overwrite: true })
  return targetPath
}

export function removeDir(dirPath?: string | null): void {
  if (dirPath && fs.existsSync(dirPath)) {
    fs.removeSync(dirPath)
  }
}

// 根据 URL 路径删除文件，如 /uploads/goods/abc/img.jpg
export function deleteFileByUrl(urlPath?: string | null): void {
  if (!urlPath) return
  // URL 路径格式: /uploads/goods/xxx/file.jpg → 转为文件系统路径
  const filePath = path.join(UPLOADS_ROOT, '..', urlPath)
  if (fs.existsSync(filePath)) {
    fs.removeSync(filePath)
  }
}

type FileRef = { filename: string }

export function persistGoodsImages(
  tempDir: string,
  goodsDirName: string,
  mainImageFile: FileRef | undefined,
  imageFiles: FileRef[],
  skuImageFiles: FileRef[],
) {
  const goodsDir = path.join(UPLOADS_ROOT, 'goods', goodsDirName)
  fs.ensureDirSync(goodsDir)

  let mainImageRelPath = ''
  const imageRelPaths: string[] = []
  const skuImageRelPaths: string[] = []

  if (mainImageFile) {
    const tempPath = path.join(tempDir, mainImageFile.filename)
    const targetPath = path.join(goodsDir, mainImageFile.filename)
    if (fs.existsSync(tempPath)) {
      fs.moveSync(tempPath, targetPath, { overwrite: true })
      mainImageRelPath = `/uploads/goods/${goodsDirName}/${mainImageFile.filename}`
    }
  }

  for (const file of imageFiles) {
    const tempPath = path.join(tempDir, file.filename)
    const targetPath = path.join(goodsDir, file.filename)
    if (fs.existsSync(tempPath)) {
      fs.moveSync(tempPath, targetPath, { overwrite: true })
      imageRelPaths.push(`/uploads/goods/${goodsDirName}/${file.filename}`)
    }
  }

  for (const file of skuImageFiles) {
    const tempPath = path.join(tempDir, file.filename)
    const targetPath = path.join(goodsDir, file.filename)
    if (fs.existsSync(tempPath)) {
      fs.moveSync(tempPath, targetPath, { overwrite: true })
      skuImageRelPaths.push(`/uploads/goods/${goodsDirName}/${file.filename}`)
    }
  }

  return { mainImageRelPath, imageRelPaths, skuImageRelPaths, goodsDir }
}

// 将单个文件从临时目录移动到指定 goods 子目录，返回 URL 路径
export function moveToGoodsDir(
  tempDir: string,
  goodsDirName: string,
  file: FileRef,
): string {
  const goodsDir = path.join(UPLOADS_ROOT, 'goods', goodsDirName)
  fs.ensureDirSync(goodsDir)

  const tempPath = path.join(tempDir, file.filename)
  const targetPath = path.join(goodsDir, file.filename)
  if (fs.existsSync(tempPath)) {
    fs.moveSync(tempPath, targetPath, { overwrite: true })
    return `/uploads/goods/${goodsDirName}/${file.filename}`
  }
  return ''
}

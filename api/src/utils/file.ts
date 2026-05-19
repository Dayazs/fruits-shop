import fs from 'fs-extra'
import path from 'path'

const UPLOADS_ROOT = path.join(__dirname, '../../uploads')

// 确保目录存在，不存在则自动创建
export function ensureDir(dirPath: string): void {
  fs.ensureDirSync(dirPath)
}

// 在 uploads/temp 下创建请求专属的临时目录，返回目录路径
export function createTempDir(): string {
  const uuid = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
  const tempDir = path.join(UPLOADS_ROOT, 'temp', uuid)
  fs.ensureDirSync(tempDir)
  return tempDir
}

// 将文件从临时目录移动到目标目录，返回移动后的完整路径
export function moveFile(tempFilePath: string, targetDir: string): string {
  const fileName = path.basename(tempFilePath)
  const targetPath = path.join(targetDir, fileName)
  fs.moveSync(tempFilePath, targetPath, { overwrite: true })
  return targetPath
}

// 删除目录及其所有内容
export function removeDir(dirPath?: string | null): void {
  if (dirPath && fs.existsSync(dirPath)) {
    fs.removeSync(dirPath)
  }
}

type FileRef = { filename: string }

// 将临时目录中的文件批量迁移到 goods/{goodsDirName}，返回 { mainImage, images, skuImages }
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

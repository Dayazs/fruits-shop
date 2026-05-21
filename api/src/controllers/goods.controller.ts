import { Request, Response } from 'express'
import path from 'path'
import { goodsService } from '../service/goods.service'
import {
  removeDir,
  persistGoodsImages,
  moveToGoodsDir,
  deleteFileByUrl,
} from '../utils/file'
import prisma from '../lib/prisma'

// 从 req.files 中提取 SKU 图片，按索引准确匹配：sku_image_0 → sku0, sku_image_1 → sku1
const extractSkuImages = (
  files: Express.Multer.File[] | undefined,
): Map<number, Express.Multer.File> => {
  const map = new Map<number, Express.Multer.File>()
  if (!files) return map
  for (const f of files) {
    const match = f.fieldname.match(/^sku_image_(\d+)$/)
    if (match) {
      map.set(parseInt(match[1]), f)
    }
  }
  return map
}

// 添加商品
export const createGoods = async (req: Request, res: Response) => {
  let goodsDir = ''

  try {
    const files = req.files as Express.Multer.File[] | undefined

    const mainImageFile = files?.find((f) => f.fieldname === 'main_image')
    const imageFiles = files?.filter((f) => f.fieldname === 'images') || []
    const skuImageMap = extractSkuImages(files)

    // 解析 JSON 字段
    let skus = req.body.skus
    if (typeof skus === 'string') {
      skus = JSON.parse(skus)
    }

    const name = req.body.name as string | undefined
    const category_id = req.body.category_id
      ? parseInt(req.body.category_id as string)
      : undefined
    const description = (req.body.description as string) || ''
    const status = req.body.status ? parseInt(req.body.status as string) : 1
    const sort_order = req.body.sort_order
      ? parseInt(req.body.sort_order as string)
      : 0

    if (
      !name ||
      !category_id ||
      !skus ||
      !Array.isArray(skus) ||
      skus.length === 0
    ) {
      return res
        .status(400)
        .json({ code: 400, msg: '商品名称、分类ID和SKU列表不能为空' })
    }

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i]
      if (!sku.spec_name) {
        return res
          .status(400)
          .json({ code: 400, msg: `第${i + 1}个SKU规格名称不能为空` })
      }
      if (sku.price === undefined || sku.price === null) {
        return res
          .status(400)
          .json({ code: 400, msg: `第${i + 1}个SKU售价不能为空` })
      }
      if (sku.stock === undefined || sku.stock === null) {
        return res
          .status(400)
          .json({ code: 400, msg: `第${i + 1}个SKU库存不能为空` })
      }
    }

    const goodsDirName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`

    // 迁移主图、副图
    const persistResult = persistGoodsImages(
      req.tempDir || '',
      goodsDirName,
      mainImageFile,
      imageFiles,
      [], // SKU 图片单独处理
    )

    goodsDir = persistResult.goodsDir

    // 按索引迁移 SKU 图片，确保图片准确关联到正确的 SKU
    const skuImageRelPaths: string[] = []
    for (let i = 0; i < skus.length; i++) {
      const skuFile = skuImageMap.get(i)
      if (skuFile) {
        const relPath = moveToGoodsDir(req.tempDir || '', goodsDirName, skuFile)
        skuImageRelPaths.push(relPath)
      } else {
        skuImageRelPaths.push('')
      }
    }

    const skusWithImages = skus.map((sku: any, index: number) => ({
      ...sku,
      image: skuImageRelPaths[index] || sku.image || '',
    }))

    const data = await goodsService.createGoods(
      name,
      category_id,
      description,
      persistResult.mainImageRelPath,
      JSON.stringify(persistResult.imageRelPaths),
      status,
      sort_order,
      skusWithImages,
    )

    res.status(200).json({ code: 200, msg: '添加商品成功', data })
  } catch (err: any) {
    removeDir(goodsDir)
    res.status(500).json({ code: 500, msg: err.message || '添加商品失败' })
  }
}

// 后台获取商品列表
export const getAdminGoodsList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const name = req.query.name as string | undefined
    const categoryId = req.query.categoryId
      ? parseInt(req.query.categoryId as string)
      : undefined
    const status =
      req.query.status !== undefined
        ? parseInt(req.query.status as string)
        : undefined

    const data = await goodsService.getAdminGoodsList({
      page,
      pageSize,
      name,
      categoryId,
      status,
    })

    res.status(200).json({ code: 200, msg: '获取商品列表成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message || '获取商品列表失败' })
  }
}

// 获取商品 SKU 列表
export const getGoodsSkus = async (req: Request, res: Response) => {
  try {
    const goodsId = parseInt(req.params.goodsId as string)
    const data = await goodsService.getGoodsSkus(goodsId)
    return res.status(200).json({ code: 200, msg: '获取 SKU 列表成功', data })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 设置商品状态（上架/下架）
export const toggleGoodsStatus = async (req: Request, res: Response) => {
  try {
    const { goodsId } = req.params
    const data = await goodsService.toggleGoodsStatus(Number(goodsId))
    return res.status(200).json({ code: 200, msg: '更改成功', data })
  } catch (err: any) {
    return res.status(403).json({ code: 403, msg: err.message })
  }
}

// 软删除商品（移入回收站）
export const softDeleteGoods = async (req: Request, res: Response) => {
  try {
    const goodsId = parseInt(req.params.goodsId as string)
    const data = await goodsService.softDeleteGoods(goodsId)
    return res.status(200).json({ code: 200, msg: '已移入回收站', data })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 移除软删除
export const restoreGoods = async (req: Request, res: Response) => {
  try {
    const goodsId = parseInt(req.params.goodsId as string)
    const data = await goodsService.restoreGoods(goodsId)
    return res.status(200).json({ code: 200, msg: '已恢复', data })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 彻底删除商品（物理删除 + 清理图片文件）
export const hardDeleteGoods = async (req: Request, res: Response) => {
  try {
    const goodsId = parseInt(req.params.goodsId as string)
    const data = await goodsService.hardDeleteGoods(goodsId)

    // DB 事务成功后删除所有关联图片文件
    const cleanedDirs = new Set<string>()
    for (const filePath of data.filePaths) {
      deleteFileByUrl(filePath)
      // 收集 goods 目录 URL，如 /uploads/goods/abc123
      const match = filePath.match(/^(\/uploads\/goods\/[^/]+)/)
      if (match) cleanedDirs.add(match[1])
    }
    // 删除空下来的 goods 目录
    for (const dirUrl of cleanedDirs) {
      removeDir(path.join(__dirname, '../../', dirUrl))
    }

    return res.status(200).json({ code: 200, msg: '已彻底删除' })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 回收站列表
export const getRecycleBin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const keyword = req.query.keyword as string | undefined

    const data = await goodsService.getRecycleBin({
      page,
      pageSize,
      keyword,
    })

    return res.status(200).json({ code: 200, msg: '获取回收站列表成功', data })
  } catch (err: any) {
    return res
      .status(500)
      .json({ code: 500, msg: err.message || '获取回收站列表失败' })
  }
}

// 获取商品分类
export const getCategories = async (req: Request, res: Response) => {
  try {
    const data = await goodsService.getCategories()

    return res.status(200).json({ code: 200, msg: '获取商品分类成功', data })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 添加商品分类
export const createCategory = async (req: Request, res: Response) => {
  let imagePath = ''

  try {
    const files = req.files as Express.Multer.File[] | undefined
    const imageFile = files?.find((f) => f.fieldname === 'image')

    const { name, parent_id, sort_order, is_show } = req.body

    if (!name) {
      return res
        .status(400)
        .json({ code: 400, msg: '分类名称不能为空' })
    }

    if (imageFile) {
      imagePath = moveToGoodsDir(req.tempDir || '', 'categories', imageFile)
    }

    const data = await goodsService.createCategory({
      name,
      parent_id,
      sort_order: Number(sort_order),
      is_show: Number(is_show),
      image: imagePath || undefined,
    })

    return res.status(200).json({ code: 200, msg: '添加分类成功', data })
  } catch (err: any) {
    if (imagePath) deleteFileByUrl(imagePath)
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 编辑商品分类
export const updateCategory = async (req: Request, res: Response) => {
  let newImagePath = ''
  let oldImageUrl: string | undefined

  try {
    const categoryId = parseInt(req.params.categoryId as string)
    const files = req.files as Express.Multer.File[] | undefined
    const imageFile = files?.find((f) => f.fieldname === 'image')

    const { name, sort_order, is_show, parent_id } = req.body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (sort_order !== undefined) updates.sort_order = Number(sort_order)
    if (is_show !== undefined) updates.is_show = Number(is_show)
    if (parent_id !== undefined) updates.parent_id = parent_id

    if (imageFile) {
      newImagePath = moveToGoodsDir(req.tempDir || '', 'categories', imageFile)
      updates.image = newImagePath

      const oldCategory = await prisma.categories.findFirst({
        where: { id: categoryId },
        select: { image: true },
      })
      if (oldCategory?.image) {
        oldImageUrl = oldCategory.image
      }
    }

    const data = await goodsService.updateCategory(categoryId, updates)

    if (oldImageUrl) deleteFileByUrl(oldImageUrl)

    return res.status(200).json({ code: 200, msg: '编辑分类成功', data })
  } catch (err: any) {
    if (newImagePath) deleteFileByUrl(newImagePath)
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 删除商品分类
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId as string)

    const category = await prisma.categories.findFirst({
      where: { id: categoryId },
      select: { image: true },
    })

    const data = await goodsService.deleteCategory(categoryId)

    if (category?.image) {
      deleteFileByUrl(category.image)
    }

    return res.status(200).json({ code: 200, msg: '删除分类成功', data })
  } catch (err: any) {
    return res.status(400).json({ code: 400, msg: err.message })
  }
}

// 编辑商品信息
export const updateGoods = async (req: Request, res: Response) => {
  const goodsId = parseInt(req.params.goodsId as string)
  // 记录本次迁移的新文件路径，DB 失败时需要回滚
  const newFilePaths: string[] = []
  // 记录 DB 成功后要删除的旧文件路径
  const oldFilePathsToDelete: string[] = []

  try {
    const files = req.files as Express.Multer.File[] | undefined

    // 提取文件
    const mainImageFile = files?.find((f) => f.fieldname === 'main_image')
    const imageFiles = files?.filter((f) => f.fieldname === 'images') || []
    const skuImageMap = extractSkuImages(files)

    // 解析 JSON 字段
    let skus = req.body.skus
    if (typeof skus === 'string') {
      skus = JSON.parse(skus)
    }
    let keepImages: string[] = []
    if (typeof req.body.keep_images === 'string') {
      keepImages = JSON.parse(req.body.keep_images)
    }

    // 构建更新对象（仅包含传入的字段）
    const updates: any = {}

    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.category_id !== undefined)
      updates.category_id = parseInt(req.body.category_id as string)
    if (req.body.description !== undefined)
      updates.description = req.body.description
    if (req.body.status !== undefined)
      updates.status = parseInt(req.body.status as string)
    if (req.body.sort_order !== undefined)
      updates.sort_order = parseInt(req.body.sort_order as string)

    // 查询现有商品数据（用于图片旧路径对比和 SKU 管理）
    const existing = await prisma.fruits.findUnique({
      where: { id: goodsId },
      include: { fruit_skus: true },
    })
    if (!existing) {
      return res.status(404).json({ code: 404, msg: '商品不存在' })
    }

    // 确定 goods 目录名（沿用已有路径前缀，不存在则创建新目录）
    let goodsDirName = ''
    if (existing.main_image) {
      const parts = existing.main_image.split('/')
      // /uploads/goods/{dirName}/file.jpg → parts[3]
      goodsDirName = parts[3] || ''
    }
    if (!goodsDirName) {
      goodsDirName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`
    }

    // --- 处理主图 ---
    if (mainImageFile) {
      const newPath = moveToGoodsDir(
        req.tempDir || '',
        goodsDirName,
        mainImageFile,
      )
      if (newPath) {
        updates.main_image = newPath
        newFilePaths.push(newPath)
        if (existing.main_image) {
          oldFilePathsToDelete.push(existing.main_image)
        }
      }
    }

    // --- 处理副图：keep_images + 新上传文件 = 最终列表 ---
    if (req.body.keep_images !== undefined || imageFiles.length > 0) {
      const newImagePaths: string[] = []
      for (const f of imageFiles) {
        const relPath = moveToGoodsDir(req.tempDir || '', goodsDirName, f)
        if (relPath) {
          newImagePaths.push(relPath)
          newFilePaths.push(relPath)
        }
      }
      // 最终副图 = 保留的旧图 + 新上传的图
      const finalImages = [...keepImages, ...newImagePaths]
      updates.images = JSON.stringify(finalImages)

      // 标记被删除的旧副图文件
      if (existing.images) {
        try {
          const oldImages: string[] = JSON.parse(existing.images)
          for (const oldUrl of oldImages) {
            if (!keepImages.includes(oldUrl)) {
              oldFilePathsToDelete.push(oldUrl)
            }
          }
        } catch {
          // 旧数据无法解析，忽略
        }
      }
    }

    // --- 处理 SKU ---
    if (skus) {
      const processedSkus = skus.map((sku: any, index: number) => {
        const processed = { ...sku }

        // 按索引匹配 SKU 图片
        const skuFile = skuImageMap.get(index)
        if (skuFile) {
          const newPath = moveToGoodsDir(
            req.tempDir || '',
            goodsDirName,
            skuFile,
          )
          if (newPath) {
            processed.image = newPath
            newFilePaths.push(newPath)
          }
        }

        // 记录待删除的旧 SKU 图片
        if (skuFile && sku.id && existing.fruit_skus) {
          const oldSku = existing.fruit_skus.find((s) => s.id === sku.id)
          if (oldSku?.image) {
            oldFilePathsToDelete.push(oldSku.image)
          }
        }

        return processed
      })

      // 标记被删除 SKU 的图片（整条 SKU 被删除时）
      if (existing.fruit_skus) {
        const incomingIds: number[] = skus.map((s: any) => s.id).filter(Boolean)
        for (const oldSku of existing.fruit_skus) {
          if (!incomingIds.includes(oldSku.id) && oldSku.image) {
            oldFilePathsToDelete.push(oldSku.image)
          }
        }
      }

      updates.skus = processedSkus
    }

    // --- 数据库事务 ---
    const data = await goodsService.updateGoods(goodsId, updates)

    // 数据库成功后：删除旧文件
    for (const oldPath of oldFilePathsToDelete) {
      deleteFileByUrl(oldPath)
    }

    res.status(200).json({ code: 200, msg: '编辑商品成功', data })
  } catch (err: any) {
    // 数据库失败：回滚已迁移的新文件
    for (const newPath of newFilePaths) {
      deleteFileByUrl(newPath)
    }
    res.status(500).json({ code: 500, msg: err.message || '编辑商品失败' })
  }
}

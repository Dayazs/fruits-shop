import { Request, Response } from 'express'
import { goodsService } from '../service/goods.service'
import { removeDir, persistGoodsImages } from '../utils/file'

// 添加商品
export const createGoods = async (req: Request, res: Response) => {
  // 临时目录由 autoCleanupTemp 中间件在响应结束后统一清理
  let goodsDir = ''

  try {
    const files = req.files as Express.Multer.File[] | undefined

    // 从 multipart/form-data 中提取文件
    const mainImageFile = files?.find((f) => f.fieldname === 'main_image')
    const imageFiles = files?.filter((f) => f.fieldname === 'images') || []
    const skuImageFiles =
      files?.filter((f) => f.fieldname === 'sku_image') || []

    // 解析 JSON 字段（multipart 中为字符串）
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

    // 参数校验
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

    // 将文件从临时目录迁移到正式目录
    const goodsDirName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`

    const {
      mainImageRelPath,
      imageRelPaths,
      skuImageRelPaths,
      goodsDir: gd,
    } = persistGoodsImages(
      req.tempDir || '',
      goodsDirName,
      mainImageFile,
      imageFiles,
      skuImageFiles,
    )

    goodsDir = gd

    // 将图片路径挂到 skus 上（按索引顺序对应）
    const skusWithImages = skus.map((sku: any, index: number) => ({
      ...sku,
      image: skuImageRelPaths[index] || sku.image || '',
    }))

    // 写入数据库
    const data = await goodsService.createGoods(
      name,
      category_id,
      description,
      mainImageRelPath,
      JSON.stringify(imageRelPaths),
      status,
      sort_order,
      skusWithImages,
    )

    res.status(200).json({ code: 200, msg: '添加商品成功', data })
  } catch (err: any) {
    // 数据库写入失败：回滚已迁移的正式文件
    removeDir(goodsDir)
    res.status(500).json({ code: 500, msg: err.message || '添加商品失败' })
  }
}

// 后台获取商品列表
export const getAdminGoodsList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const keyword = req.query.keyword as string | undefined
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
      keyword,
      categoryId,
      status,
    })

    res.status(200).json({ code: 200, msg: '获取商品列表成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message || '获取商品列表失败' })
  }
}

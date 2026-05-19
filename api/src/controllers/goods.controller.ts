import { Request, Response } from 'express'
import { goodsService } from '../service/goods.service'

// 添加商品
export const createGoods = async (req: Request, res: Response) => {
  try {
    const {
      name,
      category_id,
      description,
      main_image,
      images,
      status = 1,
      sort_order = 0,
      skus,
    } = req.body

    if (!name || !category_id || !skus || !Array.isArray(skus) || skus.length === 0) {
      return res
        .status(400)
        .json({ code: 400, msg: '商品名称、分类ID和SKU列表不能为空' })
    }

    for (const sku of skus) {
      if (!sku.spec_name) {
        return res
          .status(400)
          .json({ code: 400, msg: 'SKU规格名称不能为空' })
      }
      if (sku.price === undefined || sku.price === null) {
        return res.status(400).json({ code: 400, msg: 'SKU售价不能为空' })
      }
      if (sku.stock === undefined || sku.stock === null) {
        return res.status(400).json({ code: 400, msg: 'SKU库存不能为空' })
      }
    }

    const data = await goodsService.createGoods(
      name,
      category_id,
      description || '',
      main_image || '',
      images || '',
      status,
      sort_order,
      skus,
    )

    res.status(200).json({ code: 200, msg: '添加商品成功', data })
  } catch (err: any) {
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
    const status = req.query.status !== undefined
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

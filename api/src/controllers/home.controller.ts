import { Request, Response } from 'express'
import { goodsService } from '../service/goods.service'
import { bannerService } from '../service/banner.service'

// 获取商品列表（C 端：仅上架 + 未删除）
export const getGoodsList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const name = req.query.name as string | undefined
    const categoryId = req.query.categoryId
      ? parseInt(req.query.categoryId as string)
      : undefined

    const data = await goodsService.getAdminGoodsList({
      page,
      pageSize,
      name,
      categoryId,
      status: 1, // 仅上架
    })

    res.status(200).json({ code: 200, msg: '获取商品列表成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 获取商品分类（C 端：仅 is_show=1）
export const getPublicCategories = async (req: Request, res: Response) => {
  try {
    const data = await goodsService.getPublicCategories()
    res.status(200).json({ code: 200, msg: '获取分类成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 获取轮播图（C 端：仅 status=1）
export const getPublicBanners = async (req: Request, res: Response) => {
  try {
    const data = await bannerService.getPublicBanners()
    res.status(200).json({ code: 200, msg: '获取轮播图成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

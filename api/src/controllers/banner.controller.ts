import { Request, Response } from 'express'
import { bannerService } from '../service/banner.service'
import { moveToGoodsDir, deleteFileByUrl } from '../utils/file'
import prisma from '../lib/prisma'

const BANNER_DIR = 'banners'

// 轮播图列表
export const getBanners = async (req: Request, res: Response) => {
  try {
    const data = await bannerService.getBanners()
    res.status(200).json({ code: 200, msg: '获取轮播图列表成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 添加轮播图
export const createBanner = async (req: Request, res: Response) => {
  const newFiles: string[] = []

  try {
    const files = req.files as Express.Multer.File[] | undefined
    const imageFile = files?.find((f) => f.fieldname === 'image')

    if (!imageFile) {
      return res.status(400).json({ code: 400, msg: '轮播图图片不能为空' })
    }

    const title = req.body.title as string
    const fruit_id = req.body.fruit_id
      ? parseInt(req.body.fruit_id as string)
      : undefined
    const sort_order = req.body.sort_order
      ? parseInt(req.body.sort_order as string)
      : undefined
    const status = req.body.status
      ? parseInt(req.body.status as string)
      : undefined
    const link_url = (req.body.link_url as string) || undefined

    if (!title) {
      return res.status(400).json({ code: 400, msg: '标题不能为空' })
    }
    if (!fruit_id) {
      return res.status(400).json({ code: 400, msg: '关联商品不能为空' })
    }
    if (sort_order === undefined) {
      return res.status(400).json({ code: 400, msg: '排序不能为空' })
    }
    if (status === undefined) {
      return res.status(400).json({ code: 400, msg: '状态不能为空' })
    }

    const imagePath = moveToGoodsDir(req.tempDir || '', BANNER_DIR, imageFile)
    if (!imagePath) {
      return res.status(400).json({ code: 400, msg: '图片保存失败' })
    }
    newFiles.push(imagePath)

    const data = await bannerService.createBanner({
      title,
      image_url: imagePath,
      fruit_id,
      sort_order,
      status,
      link_url,
    })

    res.status(200).json({ code: 200, msg: '添加轮播图成功', data })
  } catch (err: any) {
    for (const p of newFiles) deleteFileByUrl(p)
    res.status(400).json({ code: 400, msg: err.message || '添加轮播图失败' })
  }
}

// 编辑轮播图
export const updateBanner = async (req: Request, res: Response) => {
  const newFiles: string[] = []
  let oldImageUrl: string | undefined

  try {
    const bannerId = parseInt(req.params.bannerId as string)
    const files = req.files as Express.Multer.File[] | undefined
    const imageFile = files?.find((f) => f.fieldname === 'image')

    const updates: any = {}

    if (req.body.title !== undefined) updates.title = req.body.title
    if (req.body.fruit_id !== undefined)
      updates.fruit_id = parseInt(req.body.fruit_id as string)
    if (req.body.sort_order !== undefined)
      updates.sort_order = parseInt(req.body.sort_order as string)
    if (req.body.status !== undefined)
      updates.status = parseInt(req.body.status as string)
    if (req.body.link_url !== undefined) updates.link_url = req.body.link_url

    if (imageFile) {
      const imagePath = moveToGoodsDir(req.tempDir || '', BANNER_DIR, imageFile)
      if (!imagePath) {
        return res.status(400).json({ code: 400, msg: '图片保存失败' })
      }
      updates.image_url = imagePath
      newFiles.push(imagePath)

      const oldBanner = await prisma.banners.findFirst({
        where: { id: bannerId },
        select: { image_url: true },
      })
      if (oldBanner?.image_url && oldBanner.image_url !== imagePath) {
        oldImageUrl = oldBanner.image_url
      }
    }

    const data = await bannerService.updateBanner(bannerId, updates)

    if (oldImageUrl) deleteFileByUrl(oldImageUrl)

    res.status(200).json({ code: 200, msg: '编辑轮播图成功', data })
  } catch (err: any) {
    for (const p of newFiles) deleteFileByUrl(p)
    res.status(400).json({ code: 400, msg: err.message || '编辑轮播图失败' })
  }
}

// 删除轮播图
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const bannerId = parseInt(req.params.bannerId as string)

    const oldBanner = await prisma.banners.findFirst({
      where: { id: bannerId },
      select: { image_url: true },
    })

    const data = await bannerService.deleteBanner(bannerId)

    if (oldBanner?.image_url) {
      deleteFileByUrl(oldBanner.image_url)
    }

    res.status(200).json({ code: 200, msg: '删除轮播图成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message || '删除轮播图失败' })
  }
}

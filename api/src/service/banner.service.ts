import prisma from '../lib/prisma'

export const bannerService = {
  // 轮播图列表（管理端，全部）
  async getBanners() {
    return prisma.banners.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        fruits: {
          select: { id: true, name: true },
        },
      },
    })
  },

  // 轮播图列表（C 端，仅返回启用的）
  async getPublicBanners() {
    return prisma.banners.findMany({
      where: { status: 1 },
      orderBy: { sort_order: 'asc' },
      include: {
        fruits: {
          select: { id: true, name: true },
        },
      },
    })
  },

  // 添加轮播图
  async createBanner(params: {
    title: string
    image_url: string
    fruit_id: number
    sort_order: number
    status: number
    link_url?: string
  }) {
    const now = new Date()

    // 校验关联商品是否存在
    const fruit = await prisma.fruits.findFirst({
      where: { id: params.fruit_id, deleted_at: null },
    })
    if (!fruit) {
      throw new Error('关联商品不存在')
    }

    return prisma.banners.create({
      data: {
        title: params.title,
        image_url: params.image_url,
        fruit_id: params.fruit_id,
        link_url: params.link_url || null,
        sort_order: params.sort_order,
        status: params.status,
        created_at: now,
        updated_at: now,
      },
      include: {
        fruits: { select: { id: true, name: true } },
      },
    })
  },

  // 编辑轮播图
  async updateBanner(
    bannerId: number,
    updates: {
      title?: string
      image_url?: string
      fruit_id?: number
      sort_order?: number
      status?: number
      link_url?: string
    },
  ) {
    const banner = await prisma.banners.findFirst({
      where: { id: bannerId },
    })
    if (!banner) {
      throw new Error('轮播图不存在')
    }

    // 校验关联商品是否存在
    if (updates.fruit_id !== undefined) {
      const fruit = await prisma.fruits.findFirst({
        where: { id: updates.fruit_id, deleted_at: null },
      })
      if (!fruit) {
        throw new Error('关联商品不存在')
      }
    }

    const data: any = { updated_at: new Date() }
    if (updates.title !== undefined) data.title = updates.title
    if (updates.image_url !== undefined) data.image_url = updates.image_url
    if (updates.fruit_id !== undefined) data.fruit_id = updates.fruit_id
    if (updates.sort_order !== undefined) data.sort_order = updates.sort_order
    if (updates.status !== undefined) data.status = updates.status
    if (updates.link_url !== undefined) data.link_url = updates.link_url

    return prisma.banners.update({
      where: { id: bannerId },
      data,
      include: {
        fruits: { select: { id: true, name: true } },
      },
    })
  },

  // 删除轮播图（物理删除）
  async deleteBanner(bannerId: number) {
    const banner = await prisma.banners.findFirst({
      where: { id: bannerId },
    })
    if (!banner) {
      throw new Error('轮播图不存在')
    }

    return prisma.banners.delete({
      where: { id: bannerId },
    })
  },
}

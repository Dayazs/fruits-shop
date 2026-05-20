import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'

// 自动生成SKU编码
const generateSkuCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `SKU${timestamp}${random}`
}

interface SkuInput {
  spec_name: string
  weight?: number
  price: number
  original_price?: number
  stock: number
  image?: string
}

export const goodsService = {
  // 商品添加
  async createGoods(
    name: string,
    category_id: number,
    description: string,
    main_image: string,
    images: string,
    status: number,
    sort_order: number,
    skus: SkuInput[],
  ) {
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const fruit = await tx.fruits.create({
        data: {
          name,
          category_id,
          description,
          main_image,
          images,
          status,
          sort_order,
          created_at: now,
          updated_at: now,
        },
      })

      // 生成符合表结构的sku数组
      const skuData = skus.map((sku) => ({
        fruit_id: fruit.id,
        spec_name: sku.spec_name,
        weight: sku.weight ? new Prisma.Decimal(sku.weight) : null,
        price: new Prisma.Decimal(sku.price),
        original_price: sku.original_price
          ? new Prisma.Decimal(sku.original_price)
          : null,
        stock: sku.stock,
        sku_code: generateSkuCode(),
        image: sku.image || null,
        created_at: now,
        updated_at: now,
      }))

      // 接收sku数组，批量插入
      await tx.fruit_skus.createMany({ data: skuData })

      const createdSkus = await tx.fruit_skus.findMany({
        where: { fruit_id: fruit.id },
      })

      return { fruit, skus: createdSkus }
    })

    return result
  },

  // 后台获取商品列表
  async getAdminGoodsList(params: {
    page: number
    pageSize: number
    keyword?: string
    categoryId?: number
    status?: number
  }) {
    const { page, pageSize, keyword, categoryId, status } = params

    const where: any = {}

    if (keyword) {
      where.name = { contains: keyword }
    }

    if (categoryId !== undefined && categoryId !== null) {
      where.category_id = categoryId
    }

    if (status !== undefined && status !== null) {
      where.status = status
    }

    const [total, list] = await Promise.all([
      prisma.fruits.count({ where }),
      prisma.fruits.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort_order: 'asc' },
        include: {
          fruit_skus: true,
          categories: {
            select: { id: true, name: true },
          },
        },
      }),
    ])

    return {
      total,
      page,
      pageSize,
      list,
    }
  },

  // 编辑商品
  async updateGoods(
    goodsId: number,
    updates: {
      name?: string
      category_id?: number
      description?: string
      main_image?: string
      images?: string
      status?: number
      sort_order?: number
      skus?: Array<{
        id?: number
        spec_name?: string
        weight?: number | null
        price?: number
        original_price?: number | null
        stock?: number
        image?: string | null
      }>
    },
  ) {
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      // 更新水果主表
      const fruitData: any = { updated_at: now }
      if (updates.name !== undefined) fruitData.name = updates.name
      if (updates.category_id !== undefined)
        fruitData.category_id = updates.category_id
      if (updates.description !== undefined)
        fruitData.description = updates.description
      if (updates.main_image !== undefined)
        fruitData.main_image = updates.main_image
      if (updates.images !== undefined) fruitData.images = updates.images
      if (updates.status !== undefined) fruitData.status = updates.status
      if (updates.sort_order !== undefined)
        fruitData.sort_order = updates.sort_order

      await tx.fruits.update({
        where: { id: goodsId },
        data: fruitData,
      })

      // 处理 SKU
      if (updates.skus !== undefined) {
        const newSkus = updates.skus

        // 查出已有的 SKU
        const existingSkus = await tx.fruit_skus.findMany({
          where: { fruit_id: goodsId },
        })

        const existingIds = existingSkus.map((s) => s.id)

        // 需要删除的 SKU：已有但在本次列表中不存在的
        const incomingIds = newSkus.map((s) => s.id).filter(Boolean) as number[]
        const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id))

        if (idsToDelete.length > 0) {
          await tx.fruit_skus.deleteMany({
            where: { id: { in: idsToDelete } },
          })
        }

        // 更新已有的 SKU
        for (const sku of newSkus) {
          if (sku.id) {
            const skuData: any = { updated_at: now }
            if (sku.spec_name !== undefined) skuData.spec_name = sku.spec_name
            if (sku.weight !== undefined)
              skuData.weight = sku.weight !== null ? new Prisma.Decimal(sku.weight) : null
            if (sku.price !== undefined)
              skuData.price = new Prisma.Decimal(sku.price)
            if (sku.original_price !== undefined)
              skuData.original_price =
                sku.original_price !== null
                  ? new Prisma.Decimal(sku.original_price)
                  : null
            if (sku.stock !== undefined) skuData.stock = sku.stock
            if (sku.image !== undefined) skuData.image = sku.image

            await tx.fruit_skus.update({
              where: { id: sku.id },
              data: skuData,
            })
          } else {
            // 新建 SKU
            await tx.fruit_skus.create({
              data: {
                fruit_id: goodsId,
                spec_name: sku.spec_name || '',
                weight: sku.weight !== undefined && sku.weight !== null
                  ? new Prisma.Decimal(sku.weight)
                  : null,
                price: new Prisma.Decimal(sku.price || 0),
                original_price:
                  sku.original_price !== undefined && sku.original_price !== null
                    ? new Prisma.Decimal(sku.original_price)
                    : null,
                stock: sku.stock || 0,
                sku_code: generateSkuCode(),
                image: sku.image || null,
                created_at: now,
                updated_at: now,
              },
            })
          }
        }
      }

      // 返回更新后的完整数据
      return tx.fruits.findUnique({
        where: { id: goodsId },
        include: {
          fruit_skus: true,
          categories: { select: { id: true, name: true } },
        },
      })
    })

    return result
  },

  // 更改商品状态（上架/下架）
  async toggleGoodsStatus(goodsId: number) {
    // 先查询商品
    const goods = await prisma.fruits.findFirst({
      where: { id: goodsId },
      select: { status: true },
    })

    if (!goods) {
      throw new Error('商品不存在')
    }

    // 切换状态
    const newStatus = goods.status === 1 ? 0 : 1

    // 更新状态
    const updatedGoods = await prisma.fruits.update({
      where: { id: goodsId },
      data: { status: newStatus },
    })

    return updatedGoods
  },
}

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
}

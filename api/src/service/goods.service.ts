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

  // 获取商品分类（管理端，全部）
  async getCategories() {
    const categories = await prisma.categories.findMany()
    return categories
  },

  // 获取商品分类（C 端，仅返回 is_show=1）
  async getPublicCategories() {
    return prisma.categories.findMany({
      where: { is_show: 1 },
      orderBy: { sort_order: 'asc' },
    })
  },

  // 添加商品分类
  async createCategory(params: {
    name: string
    parent_id?: number
    sort_order?: number
    is_show?: number
    image?: string
  }) {
    const { name, parent_id = 0, sort_order = 0, is_show = 1, image } = params

    if (parent_id !== 0) {
      const parent = await prisma.categories.findFirst({
        where: { id: parent_id },
      })
      if (!parent) {
        throw new Error('父分类不存在')
      }
    }

    const now = new Date()

    return prisma.categories.create({
      data: {
        name,
        parent_id,
        sort_order,
        is_show,
        image: image || null,
        created_at: now,
        updated_at: now,
      },
    })
  },

  // 编辑商品分类
  async updateCategory(
    categoryId: number,
    updates: {
      name?: string
      sort_order?: number
      is_show?: number
      parent_id?: number
      image?: string
    },
  ) {
    const category = await prisma.categories.findFirst({
      where: { id: categoryId },
    })

    if (!category) {
      throw new Error('分类不存在')
    }

    // 如果传了 parent_id，校验父分类是否存在
    if (updates.parent_id !== undefined) {
      const parent = await prisma.categories.findFirst({
        where: { id: updates.parent_id },
      })
      if (!parent) {
        throw new Error('父分类不存在')
      }
    }

    const now = new Date()
    const data: any = { updated_at: now }
    if (updates.name !== undefined) data.name = updates.name
    if (updates.sort_order !== undefined) data.sort_order = updates.sort_order
    if (updates.is_show !== undefined) data.is_show = updates.is_show
    if (updates.parent_id !== undefined) data.parent_id = updates.parent_id
    if (updates.image !== undefined) data.image = updates.image

    return prisma.categories.update({
      where: { id: categoryId },
      data,
    })
  },

  // 删除商品分类
  async deleteCategory(categoryId: number) {
    const category = await prisma.categories.findFirst({
      where: { id: categoryId },
    })

    if (!category) {
      throw new Error('分类不存在')
    }

    // 检查是否有商品引用了该分类
    const productCount = await prisma.fruits.count({
      where: { category_id: categoryId, deleted_at: null },
    })

    if (productCount > 0) {
      throw new Error('该分类下有商品，无法删除')
    }

    return prisma.categories.delete({
      where: { id: categoryId },
    })
  },

  // 根据商品 ID 获取该商品的所有 SKU 详情
  async getGoodsSkus(goodsId: number) {
    const goods = await prisma.fruits.findFirst({
      where: { id: goodsId, deleted_at: null },
      select: { id: true, name: true },
    })

    if (!goods) {
      throw new Error('商品不存在')
    }

    const skus = await prisma.fruit_skus.findMany({
      where: { fruit_id: goodsId },
      orderBy: { id: 'asc' },
    })

    return { goodsId: goods.id, goodsName: goods.name, skus }
  },

  // 后台获取商品列表
  async getAdminGoodsList(params: {
    page: number
    pageSize: number
    name?: string
    categoryId?: number
    status?: number
  }) {
    const { page, pageSize, name, categoryId, status } = params

    const where: any = {}

    if (name) {
      where.name = { contains: name }
    }

    if (categoryId !== undefined && categoryId !== null) {
      where.category_id = categoryId
    }

    if (status !== undefined && status !== null) {
      where.status = status
    }

    // 排除已软删除的商品
    where.deleted_at = null

    const [total, list] = await Promise.all([
      prisma.fruits.count({ where }),
      prisma.fruits.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort_order: 'asc' },
        include: {
          fruit_skus: {
            orderBy: { id: 'asc' },
          },
          categories: {
            select: { id: true, name: true },
          },
        },
      }),
    ])

    // 转换数据结构：first_sku_price + total_stock，移除完整 SKU 数组
    const transformedList = list.map((fruit) => {
      const skus = fruit.fruit_skus
      const first_sku_price = skus.length > 0 ? skus[0].price : null
      const total_stock = skus.reduce((sum, s) => sum + s.stock, 0)

      return {
        id: fruit.id,
        name: fruit.name,
        category_id: fruit.category_id,
        description: fruit.description,
        main_image: fruit.main_image,
        images: fruit.images,
        status: fruit.status,
        sort_order: fruit.sort_order,
        deleted_at: fruit.deleted_at,
        created_at: fruit.created_at,
        updated_at: fruit.updated_at,
        first_sku_price,
        total_stock,
        categories: fruit.categories,
      }
    })

    return {
      total,
      page,
      pageSize,
      list: transformedList,
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
        const idsToDelete = existingIds.filter(
          (id) => !incomingIds.includes(id),
        )

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
              skuData.weight =
                sku.weight !== null ? new Prisma.Decimal(sku.weight) : null
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
                weight:
                  sku.weight !== undefined && sku.weight !== null
                    ? new Prisma.Decimal(sku.weight)
                    : null,
                price: new Prisma.Decimal(sku.price || 0),
                original_price:
                  sku.original_price !== undefined &&
                  sku.original_price !== null
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

  // 软删除：移入回收站
  async softDeleteGoods(goodsId: number) {
    const goods = await prisma.fruits.findFirst({
      where: { id: goodsId },
      select: { id: true, deleted_at: true },
    })

    if (!goods) {
      throw new Error('商品不存在')
    }

    if (goods.deleted_at) {
      throw new Error('商品已在回收站中')
    }

    const now = new Date()

    return prisma.fruits.update({
      where: { id: goodsId },
      data: { deleted_at: now, updated_at: now },
    })
  },

  // 移除软删除
  async restoreGoods(goodsId: number) {
    const goods = await prisma.fruits.findFirst({
      where: { id: goodsId },
    })
    if (!goods) {
      throw new Error('未找到商品')
    }

    const now = new Date()

    return await prisma.fruits.update({
      where: { id: goodsId },
      data: { deleted_at: null, updated_at: now },
    })
  },

  // 彻底删除：物理删除商品及其 SKU，返回需要清理的图片路径
  async hardDeleteGoods(goodsId: number) {
    return prisma.$transaction(async (tx) => {
      // 确保商品存在且已软删除
      const goods = await tx.fruits.findFirst({
        where: { id: goodsId },
        include: { fruit_skus: true },
      })

      if (!goods) {
        throw new Error('商品不存在')
      }

      if (!goods.deleted_at) {
        throw new Error('商品未在回收站中，请先软删除')
      }

      // 收集所有需要删除的图片文件路径
      const filePaths: string[] = []

      if (goods.main_image) {
        filePaths.push(goods.main_image)
      }

      if (goods.images) {
        try {
          const imageList: string[] = JSON.parse(goods.images)
          filePaths.push(...imageList)
        } catch {
          // 数据异常，忽略
        }
      }

      for (const sku of goods.fruit_skus) {
        if (sku.image) {
          filePaths.push(sku.image)
        }
      }

      // fruit_skus 设置了 onDelete: Cascade，删除 fruit 会自动级联删除 SKU
      await tx.fruits.delete({ where: { id: goodsId } })

      return { deletedGoodsId: goodsId, filePaths }
    })
  },

  // 回收站列表
  async getRecycleBin(params: {
    page: number
    pageSize: number
    keyword?: string
  }) {
    const { page, pageSize, keyword } = params

    const where: any = {
      deleted_at: { not: null },
    }

    if (keyword) {
      where.name = { contains: keyword }
    }

    const [total, list] = await Promise.all([
      prisma.fruits.count({ where }),
      prisma.fruits.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { deleted_at: 'desc' },
        include: {
          fruit_skus: true,
          categories: { select: { id: true, name: true } },
        },
      }),
    ])

    // 转换数据结构
    const transformedList = list.map((fruit) => {
      const skus = fruit.fruit_skus
      const first_sku_price = skus.length > 0 ? skus[0].price : null
      const total_stock = skus.reduce((sum, s) => sum + s.stock, 0)

      return {
        id: fruit.id,
        name: fruit.name,
        category_id: fruit.category_id,
        description: fruit.description,
        main_image: fruit.main_image,
        images: fruit.images,
        status: fruit.status,
        sort_order: fruit.sort_order,
        deleted_at: fruit.deleted_at,
        created_at: fruit.created_at,
        updated_at: fruit.updated_at,
        first_sku_price,
        total_stock,
        categories: fruit.categories,
      }
    })

    return { total, page, pageSize, list: transformedList }
  },
}

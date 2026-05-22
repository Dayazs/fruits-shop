import prisma from '../lib/prisma'

export const cartService = {
  // 获取购物车列表
  async getCartList(userId: number) {
    return prisma.carts.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
      include: {
        fruits: {
          select: { id: true, name: true, main_image: true },
        },
        fruit_skus: true,
      },
    })
  },

  // 添加购物车（自动处理重复：同 fruit+sku 则 quantity+1）
  async addToCart(
    userId: number,
    fruitId: number,
    skuId: number,
    quantity: number = 1,
  ) {
    return prisma.$transaction(async (tx) => {
      // 校验 SKU 存在且属于该商品
      const sku = await tx.fruit_skus.findFirst({
        where: { id: skuId, fruit_id: fruitId },
      })
      if (!sku) {
        throw new Error('SKU 不存在')
      }

      // 校验库存
      if (sku.stock < quantity) {
        throw new Error('库存不足')
      }

      // 检查是否已有同 fruit_id + sku_id 的购物车记录
      const existing = await tx.carts.findFirst({
        where: { user_id: userId, fruit_id: fruitId, sku_id: skuId },
      })

      if (existing) {
        // 已存在：quantity +1
        const updated = await tx.carts.update({
          where: { id: existing.id },
          data: {
            quantity: (existing.quantity ?? 0) + quantity,
            updated_at: new Date(),
          },
          include: {
            fruits: { select: { id: true, name: true, main_image: true } },
            fruit_skus: true,
          },
        })

        // 扣减库存
        await tx.fruit_skus.update({
          where: { id: skuId },
          data: { stock: sku.stock - quantity },
        })

        return updated
      } else {
        // 新建记录
        const now = new Date()
        const created = await tx.carts.create({
          data: {
            user_id: userId,
            fruit_id: fruitId,
            sku_id: skuId,
            quantity,
            created_at: now,
            updated_at: now,
          },
          include: {
            fruits: { select: { id: true, name: true, main_image: true } },
            fruit_skus: true,
          },
        })

        // 扣减库存
        await tx.fruit_skus.update({
          where: { id: skuId },
          data: { stock: sku.stock - quantity },
        })

        return created
      }
    })
  },

  // 更新购物车数量
  async updateQuantity(cartId: number, userId: number, quantity: number) {
    if (quantity < 1) {
      throw new Error('数量不能小于1')
    }

    return prisma.$transaction(async (tx) => {
      const cart = await tx.carts.findFirst({
        where: { id: cartId, user_id: userId },
        include: { fruit_skus: true },
      })
      if (!cart) {
        throw new Error('购物车记录不存在')
      }

      const diff = quantity - (cart.quantity ?? 0)
      if (diff === 0) return cart

      // 增加数量时检查库存
      if (diff > 0 && cart.fruit_skus.stock < diff) {
        throw new Error('库存不足')
      }

      // 更新数量
      const updated = await tx.carts.update({
        where: { id: cartId },
        data: { quantity, updated_at: new Date() },
        include: {
          fruits: { select: { id: true, name: true, main_image: true } },
          fruit_skus: true,
        },
      })

      // 更新 SKU 库存
      await tx.fruit_skus.update({
        where: { id: cart.sku_id },
        data: { stock: cart.fruit_skus.stock - diff },
      })

      return updated
    })
  },

  // 删除购物车商品（恢复库存）
  async removeFromCart(cartId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.carts.findFirst({
        where: { id: cartId, user_id: userId },
      })
      if (!cart) {
        throw new Error('购物车记录不存在')
      }

      // 恢复库存
      await tx.fruit_skus.update({
        where: { id: cart.sku_id },
        data: {
          stock: { increment: cart.quantity || 0 },
        },
      })

      // 删除记录
      return tx.carts.delete({ where: { id: cartId } })
    })
  },
}

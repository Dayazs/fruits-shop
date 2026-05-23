import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'

// 生成订单号
const generateOrderNo = (): string => {
  const now = new Date()
  const y = now.getFullYear().toString().slice(2)
  const M = (now.getMonth() + 1).toString().padStart(2, '0')
  const d = now.getDate().toString().padStart(2, '0')
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const s = now.getSeconds().toString().padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `NO${y}${M}${d}${h}${m}${s}${rand}`
}

// 订单状态
export const ORDER_STATUS = {
  PENDING_PAY: 0,   // 待付款
  PENDING_SHIP: 1,   // 待发货
  PENDING_RECEIVE: 2, // 待收货
  COMPLETED: 3,       // 已完成
  CANCELLED: 4,       // 已取消
} as const

export const orderService = {
  // 从购物车创建订单
  async createOrder(
    userId: number,
    cartIds: number[],
    addressId: number,
    remark?: string,
  ) {
    if (!cartIds || cartIds.length === 0) {
      throw new Error('请选择要结算的商品')
    }

    return prisma.$transaction(async (tx) => {
      // 查询选中的购物车记录（校验归属）
      const cartItems = await tx.carts.findMany({
        where: {
          id: { in: cartIds },
          user_id: userId,
        },
        include: {
          fruits: true,
          fruit_skus: true,
        },
      })

      if (cartItems.length === 0) {
        throw new Error('购物车记录不存在')
      }

      // 二次校验库存（结算时再次确认，防止已扣除库存仍不足的边界情况）
      // 库存已在加入购物车时扣减，此处为防御性检查
      for (const item of cartItems) {
        const sku = await tx.fruit_skus.findUnique({
          where: { id: item.sku_id },
        })
        if (!sku || sku.stock < 0) {
          throw new Error(`"${item.fruits.name} - ${item.fruit_skus.spec_name}" 库存异常，请联系客服`)
        }
      }

      // 校验地址归属
      const address = await tx.addresses.findFirst({
        where: { id: addressId, user_id: userId },
      })
      if (!address) {
        throw new Error('收货地址不存在')
      }

      // 计算总金额
      let totalAmount = 0
      const orderItemsData: Array<{
        fruit_name: string
        spec_name: string
        price: Prisma.Decimal
        quantity: number
        total_price: Prisma.Decimal
        fruit_id: number
        sku_id: number
      }> = []

      for (const item of cartItems) {
        const price = item.fruit_skus.price
        const qty = item.quantity ?? 1
        const itemTotal = price.times(qty)
        totalAmount += itemTotal.toNumber()

        orderItemsData.push({
          fruit_id: item.fruit_id,
          sku_id: item.sku_id,
          fruit_name: item.fruits.name,
          spec_name: item.fruit_skus.spec_name,
          price,
          quantity: qty,
          total_price: itemTotal,
        })
      }

      const now = new Date()
      const orderNo = generateOrderNo()

      // 创建订单
      const order = await tx.orders.create({
        data: {
          order_no: orderNo,
          user_id: userId,
          total_amount: new Prisma.Decimal(totalAmount),
          status: ORDER_STATUS.PENDING_PAY,
          address_id: addressId,
          remark: remark || null,
          created_at: now,
          updated_at: now,
        },
      })

      // 批量创建订单详情
      await tx.order_items.createMany({
        data: orderItemsData.map((item) => ({
          ...item,
          order_id: order.id,
          created_at: now,
          updated_at: now,
        })),
      })

      // 删除已结算的购物车记录
      await tx.carts.deleteMany({
        where: { id: { in: cartIds } },
      })

      // 返回完整订单
      return tx.orders.findUnique({
        where: { id: order.id },
        include: {
          order_items: true,
          addresses: true,
        },
      })
    })
  },

  // 获取订单列表
  async getOrderList(
    userId: number,
    params: { page: number; pageSize: number; status?: number },
  ) {
    const { page, pageSize, status } = params

    const where: any = { user_id: userId }
    if (status !== undefined && status !== null) {
      where.status = status
    }

    const [total, list] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          order_items: {
            include: {
              fruits: { select: { main_image: true } },
            },
          },
          addresses: true,
        },
      }),
    ])

    // 将 main_image 提升到 order_item 顶层
    const transformedList = list.map((order) => ({
      ...order,
      order_items: order.order_items.map((item) => ({
        ...item,
        main_image: item.fruits.main_image,
        fruits: undefined,
      })),
    }))

    return { total, page, pageSize, list: transformedList }
  },

  // 获取订单详情
  async getOrderDetail(orderId: number, userId: number) {
    const order = await prisma.orders.findFirst({
      where: { id: orderId, user_id: userId },
      include: {
        order_items: {
          include: {
            fruits: { select: { main_image: true } },
          },
        },
        addresses: true,
      },
    })
    if (!order) {
      throw new Error('订单不存在')
    }

    return {
      ...order,
      order_items: order.order_items.map((item) => ({
        ...item,
        main_image: item.fruits.main_image,
        fruits: undefined,
      })),
    }
  },

  // 取消订单（待付款 → 已取消，恢复库存）
  async cancelOrder(orderId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.orders.findFirst({
        where: { id: orderId, user_id: userId },
        include: { order_items: true },
      })
      if (!order) throw new Error('订单不存在')
      if (order.status !== ORDER_STATUS.PENDING_PAY) {
        throw new Error('当前状态不允许取消')
      }

      // 恢复库存
      for (const item of order.order_items) {
        await tx.fruit_skus.update({
          where: { id: item.sku_id },
          data: { stock: { increment: item.quantity } },
        })
      }

      return tx.orders.update({
        where: { id: orderId },
        data: { status: ORDER_STATUS.CANCELLED, updated_at: new Date() },
      })
    })
  },

  // 更新订单状态（支付回调/发货/完成）
  async updateOrderStatus(orderId: number, status: number) {
    const now = new Date()
    const data: any = { status, updated_at: now }

    if (status === ORDER_STATUS.PENDING_SHIP) {
      data.pay_time = now
    } else if (status === ORDER_STATUS.COMPLETED) {
      data.finish_time = now
    }

    return prisma.orders.update({
      where: { id: orderId },
      data,
    })
  },

  // 管理端：获取所有订单
  async getAdminOrderList(params: {
    page: number
    pageSize: number
    status?: number
    keyword?: string
  }) {
    const { page, pageSize, status, keyword } = params

    const where: any = {}
    if (status !== undefined && status !== null) where.status = status
    if (keyword) {
      where.OR = [
        { order_no: { contains: keyword } },
        { users: { username: { contains: keyword } } },
      ]
    }

    const [total, list] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          order_items: {
            include: {
              fruits: { select: { main_image: true } },
            },
          },
          addresses: true,
          users: { select: { id: true, username: true, mobile: true } },
        },
      }),
    ])

    const transformedList = list.map((order) => ({
      ...order,
      order_items: order.order_items.map((item) => ({
        ...item,
        main_image: item.fruits.main_image,
        fruits: undefined,
      })),
    }))

    return { total, page, pageSize, list: transformedList }
  },

  // 管理端：发货
  async shipOrder(orderId: number) {
    const order = await prisma.orders.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_SHIP) {
      throw new Error('当前状态不允许发货')
    }

    return prisma.orders.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.PENDING_RECEIVE,
        ship_time: new Date(),
        updated_at: new Date(),
      },
    })
  },
}

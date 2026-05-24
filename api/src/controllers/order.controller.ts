import { Request, Response } from 'express'
import { orderService, ORDER_STATUS } from '../service/order.service'
import { payService } from '../service/pay.service'
import prisma from '../lib/prisma'

// ─── C 端接口 ───

// 创建订单（从购物车结算）
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { cart_ids, address_id, remark } = req.body

    if (!cart_ids || !Array.isArray(cart_ids) || cart_ids.length === 0) {
      return res.status(400).json({ code: 400, msg: '请选择要结算的商品' })
    }
    if (!address_id) {
      return res.status(400).json({ code: 400, msg: '请选择收货地址' })
    }

    const data = await orderService.createOrder(userId, cart_ids, address_id, remark)

    res.status(200).json({ code: 200, msg: '下单成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 获取订单列表
export const getOrderList = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const status = req.query.status !== undefined
      ? parseInt(req.query.status as string)
      : undefined

    const data = await orderService.getOrderList(userId, { page, pageSize, status })

    res.status(200).json({ code: 200, msg: '获取订单列表成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 获取订单详情
export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const orderId = parseInt(req.params.orderId as string)
    const data = await orderService.getOrderDetail(orderId, userId)

    res.status(200).json({ code: 200, msg: '获取订单详情成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 取消订单
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const orderId = parseInt(req.params.orderId as string)
    const data = await orderService.cancelOrder(orderId, userId)

    res.status(200).json({ code: 200, msg: '订单已取消', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 发起支付（获取小程序支付参数）
export const payOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { order_id, openid } = req.body

    if (!order_id) {
      return res.status(400).json({ code: 400, msg: '订单ID不能为空' })
    }

    const data = await payService.generatePayParams(
      parseInt(order_id as string),
      userId,
      openid,
    )
    res.status(200).json({ code: 200, msg: '获取支付参数成功', data })
  } catch (err: any) {
    console.log(err)
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 直接购买（不经过购物车）
export const directBuy = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { sku_id, address_id } = req.body

    if (!sku_id || !address_id) {
      return res.status(400).json({ code: 400, msg: '参数不完整' })
    }

    const data = await orderService.directBuy(userId, parseInt(sku_id), parseInt(address_id))
    res.status(200).json({ code: 200, msg: '下单成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 支付成功确认（小程序端 wx.requestPayment 成功后调用）
export const paySuccess = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const orderId = parseInt(req.params.orderId as string)

    // 校验订单归属和状态
    const order = await prisma.orders.findFirst({
      where: { id: orderId, user_id: userId },
    })
    if (!order) {
      return res.status(404).json({ code: 404, msg: '订单不存在' })
    }
    if (order.status !== ORDER_STATUS.PENDING_PAY) {
      return res.status(400).json({ code: 400, msg: '订单状态不允许此操作' })
    }

    const data = await orderService.updateOrderStatus(orderId, ORDER_STATUS.PENDING_SHIP)

    res.status(200).json({ code: 200, msg: '支付成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 确认收货（买家操作）
export const confirmReceipt = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const orderId = parseInt(req.params.orderId as string)

    const order = await prisma.orders.findFirst({
      where: { id: orderId, user_id: userId },
    })
    if (!order) {
      return res.status(404).json({ code: 404, msg: '订单不存在' })
    }
    if (order.status !== ORDER_STATUS.PENDING_RECEIVE) {
      return res.status(400).json({ code: 400, msg: '订单状态不允许此操作' })
    }

    const data = await orderService.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED)
    res.status(200).json({ code: 200, msg: '确认收货成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 支付结果回调（微信服务器调用 —— V3 JSON 格式）
export const payCallback = async (req: Request, res: Response) => {
  try {
    const headers: Record<string, string> = {}
    for (const key of Object.keys(req.headers)) {
      headers[key.toLowerCase()] = req.headers[key] as string
    }

    const rawBody = (req as any).rawBody as string
    const result = await payService.handlePayCallback(headers, rawBody, req.body)
    console.log('pay callback result:', result)

    if (result.code === 'SUCCESS') {
      res.status(200).json({ code: result.code, message: result.message })
    } else {
      res.status(400).json({ code: result.code, message: result.message })
    }
  } catch (err: any) {
    res.status(500).json({ code: 'FAIL', message: err.message })
  }
}

// ─── 管理端接口 ───

// 管理端订单列表
export const getAdminOrderList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const status = req.query.status !== undefined
      ? parseInt(req.query.status as string)
      : undefined
    const keyword = req.query.keyword as string | undefined

    const data = await orderService.getAdminOrderList({
      page,
      pageSize,
      status,
      keyword,
    })

    res.status(200).json({ code: 200, msg: '获取订单列表成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 管理端订单详情
export const getAdminOrderDetail = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId as string)
    const data = await orderService.getAdminOrderDetail(orderId)

    res.status(200).json({ code: 200, msg: '获取订单详情成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 管理端编辑订单
export const adminUpdateOrder = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId as string)
    const { address_id, remark, status } = req.body

    const data = await orderService.adminUpdateOrder(orderId, {
      address_id,
      remark,
      status,
    })

    res.status(200).json({ code: 200, msg: '编辑订单成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 管理端发货
export const shipOrder = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId as string)
    const data = await orderService.shipOrder(orderId)

    res.status(200).json({ code: 200, msg: '发货成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

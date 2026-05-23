import { Request, Response } from 'express'
import { orderService, ORDER_STATUS } from '../service/order.service'
import { payService } from '../service/pay.service'

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

    const result = await payService.handlePayCallback(headers, req.body)

    res.status(200).json({ code: result.code, message: result.message })
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

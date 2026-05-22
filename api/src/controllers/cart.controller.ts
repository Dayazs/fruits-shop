import { Request, Response } from 'express'
import { cartService } from '../service/cart.service'
import prisma from '../lib/prisma'

// 获取购物车列表
export const getCartList = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const data = await cartService.getCartList(userId)
    res.status(200).json({ code: 200, msg: '获取购物车成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 添加购物车
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { fruit_id, sku_id, quantity } = req.body

    if (!fruit_id) {
      return res
        .status(400)
        .json({ code: 400, msg: '商品ID不能为空' })
    }

    // sku_id 可选：不传时自动选择第一个 SKU
    let finalSkuId = sku_id ? parseInt(sku_id as string) : undefined

    if (!finalSkuId) {
      const firstSku = await prisma.fruit_skus.findFirst({
        where: { fruit_id },
        orderBy: { id: 'asc' },
      })
      if (!firstSku) {
        return res.status(400).json({ code: 400, msg: '该商品没有可用SKU' })
      }
      finalSkuId = firstSku.id
    }

    const data = await cartService.addToCart(
      userId,
      fruit_id,
      finalSkuId,
      quantity || 1,
    )

    res.status(200).json({ code: 200, msg: '已加入购物车', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 更新购物车数量
export const updateCartQuantity = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const cartId = parseInt(req.params.cartId as string)
    const { quantity } = req.body

    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ code: 400, msg: '数量不能小于1' })
    }

    const data = await cartService.updateQuantity(cartId, userId, quantity)

    res.status(200).json({ code: 200, msg: '更新数量成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 删除购物车商品
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const cartId = parseInt(req.params.cartId as string)

    const data = await cartService.removeFromCart(cartId, userId)

    res.status(200).json({ code: 200, msg: '已移出购物车', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

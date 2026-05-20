import { Request, Response } from 'express'
import { userService } from '../service/user.service'
import { codeToOpenId } from '../config/wxpay'

// 注册
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, mobile } = req.body
    const data = await userService.register(username, password, mobile)
    res.status(200).json({ code: 200, msg: '注册成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message })
  }
}

// 登录
export const login = async (req: Request, res: Response) => {
  try {
    const { account, password } = req.body
    const data = await userService.login(account, password)
    res.status(200).json({ code: 200, msg: '登录成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message })
  }
}

// 微信一键登录
export const wxLogin = async (req: Request, res: Response) => {
  try {
    const { code, nickname, avatar } = req.body

    if (!code) {
      return res.status(400).json({ code: 400, msg: '缺少微信登录 code' })
    }

    const openid = await codeToOpenId(code)
    const data = await userService.wxLogin(openid, nickname, avatar)

    res.status(200).json({ code: 200, msg: '登录成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message || '微信登录失败' })
  }
}

// 登出
export const logout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body
    const data = await userService.logout(userId)
    res.status(200).json({ code: 200, msg: '登出成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message })
  }
}

// ─── 用户信息 ───

// 获取用户信息
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const data = await userService.getProfile(userId)
    res.status(200).json({ code: 200, msg: '获取用户信息成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 更新用户信息
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { avatar, username, mobile } = req.body
    const data = await userService.updateProfile(userId, { avatar, username, mobile })
    res.status(200).json({ code: 200, msg: '更新用户信息成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// ─── 收货地址 ───

// 添加收货地址
export const createAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const { receiver_name, receiver_mobile, province, city, district, detail_address, is_default } = req.body

    if (!receiver_name || !receiver_mobile || !province || !city || !district || !detail_address) {
      return res.status(400).json({ code: 400, msg: '收货人、电话和完整地址不能为空' })
    }

    const data = await userService.createAddress(userId, {
      receiver_name,
      receiver_mobile,
      province,
      city,
      district,
      detail_address,
      is_default,
    })

    res.status(200).json({ code: 200, msg: '添加地址成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 获取收货地址列表
export const getAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const data = await userService.getAddresses(userId)
    res.status(200).json({ code: 200, msg: '获取地址列表成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 编辑收货地址
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const addressId = parseInt(req.params.addressId as string)
    const { receiver_name, receiver_mobile, province, city, district, detail_address, is_default } = req.body

    const data = await userService.updateAddress(addressId, userId, {
      receiver_name,
      receiver_mobile,
      province,
      city,
      district,
      detail_address,
      is_default,
    })

    res.status(200).json({ code: 200, msg: '编辑地址成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 删除收货地址
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id
    const addressId = parseInt(req.params.addressId as string)
    const data = await userService.deleteAddress(addressId, userId)

    res.status(200).json({ code: 200, msg: '删除地址成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

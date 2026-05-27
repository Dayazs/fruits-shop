import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token'

export const userService = {
  // 测试
  async getUserInfo() {
    return { id: 1, username: 'Chisa' }
  },

  // 注册
  async register(username: string, password: string, mobile: string) {
    // 判断用户是否存在
    const exisUser = await prisma.users.findFirst({
      where: { OR: [{ username }, { mobile }] },
    })

    if (exisUser) {
      throw new Error('该用户已存在')
    }

    // 密码加密
    const hashPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.users.create({
      data: {
        username,
        password: hashPassword,
        mobile,
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    return {
      username: user.username,
      avatar: user.avatar,
    }
  },

  // 登录
  async login(account: string, password: string) {
    // 查找用户
    const exisUser = await prisma.users.findFirst({
      where: { OR: [{ username: account }, { mobile: account }] },
    })

    if (!exisUser) {
      throw new Error('用户不存在')
    }

    if (exisUser.status === 0) {
      throw new Error('该用户已被禁用')
    }

    // 校验密码
    const isVaild = await bcrypt.compare(password, exisUser.password)
    if (!isVaild) {
      throw new Error('密码错误')
    }

    // 生成token
    const accessToken = generateAccessToken({
      id: exisUser.id,
      username: exisUser.username,
    })

    // 保存 refresh_token 到数据库
    const refreshToken = generateRefreshToken({ id: exisUser.id })
    await prisma.users.update({
      where: { id: exisUser.id },
      data: { refresh_token: refreshToken },
    })

    return {
      id: exisUser.id,
      username: exisUser.username,
      avatar: exisUser.avatar,
      token: accessToken,
    }
  },

  // 刷新token
  async refreshToken(refreshToken: string) {
    // 验证 refresh_token
    const decoded = verifyRefreshToken(refreshToken) as any
    if (!decoded) {
      throw new Error('refresh_token 无效或已过期')
    }

    // 查找用户
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.id,
        refresh_token: refreshToken,
      },
    })

    if (!user) {
      throw new Error('refresh_token 无效')
    }

    // 生成新的 access_token
    const newAccessToken = generateAccessToken({
      id: user.id,
      username: user.username,
    })

    return { token: newAccessToken }
  },

  // 微信一键登录
  async wxLogin(openid: string, nickname?: string, avatar?: string) {
    const now = new Date()

    // 查找是否已有该微信用户
    let user = await prisma.users.findFirst({
      where: { openid },
    })

    if (user) {
      // 检查用户是否被禁用
      if (user.status === 0) {
        throw new Error('该用户已被禁用')
      }
      // 已有用户：更新昵称和头像（如果传入）
      if (nickname || avatar) {
        user = await prisma.users.update({
          where: { id: user.id },
          data: {
            ...(nickname ? { username: nickname } : {}),
            ...(avatar ? { avatar } : {}),
            updated_at: now,
          },
        })
      }
    } else {
      // 新用户：自动生成用户名
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const autoUsername = `微信用户_${randomSuffix}`

      user = await prisma.users.create({
        data: {
          username: nickname || autoUsername,
          password: '',
          openid,
          avatar: avatar || null,
          created_at: now,
          updated_at: now,
        },
      })
    }

    // 生成 token
    const accessToken = generateAccessToken({
      id: user.id,
      username: user.username,
    })

    const refreshToken = generateRefreshToken({ id: user.id })
    await prisma.users.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    })

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      token: accessToken,
    }
  },

  // 获取用户信息
  async getProfile(userId: number) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        mobile: true,
        email: true,
        openid: true,
        created_at: true,
      },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return user
  },

  // 更新用户信息
  async updateProfile(
    userId: number,
    updates: { avatar?: string; username?: string; mobile?: string },
  ) {
    const data: any = { updated_at: new Date() }
    if (updates.avatar !== undefined) data.avatar = updates.avatar
    if (updates.username !== undefined) data.username = updates.username
    if (updates.mobile !== undefined) data.mobile = updates.mobile

    return prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        avatar: true,
        mobile: true,
      },
    })
  },

  // ─── 收货地址 ───

  // 添加收货地址
  async createAddress(
    userId: number,
    params: {
      receiver_name: string
      receiver_mobile: string
      province: string
      city: string
      district: string
      detail_address: string
      is_default?: number
    },
  ) {
    const now = new Date()

    // 首个地址自动设为默认
    const addressCount = await prisma.addresses.count({
      where: { user_id: userId },
    })
    const isDefault = addressCount === 0 ? 1 : (params.is_default ?? 0)

    // 若设置为默认，先取消其他默认地址
    if (isDefault === 1) {
      await prisma.addresses.updateMany({
        where: { user_id: userId, is_default: 1 },
        data: { is_default: 0 },
      })
    }

    return prisma.addresses.create({
      data: {
        user_id: userId,
        receiver_name: params.receiver_name,
        receiver_mobile: params.receiver_mobile,
        province: params.province,
        city: params.city,
        district: params.district,
        detail_address: params.detail_address,
        is_default: isDefault,
        created_at: now,
        updated_at: now,
      },
    })
  },

  // 获取收货地址列表
  async getAddresses(userId: number) {
    return prisma.addresses.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { id: 'desc' }],
    })
  },

  // 编辑收货地址
  async updateAddress(
    addressId: number,
    userId: number,
    updates: {
      receiver_name?: string
      receiver_mobile?: string
      province?: string
      city?: string
      district?: string
      detail_address?: string
      is_default?: number
    },
  ) {
    const addr = await prisma.addresses.findFirst({
      where: { id: addressId, user_id: userId },
    })

    if (!addr) {
      throw new Error('地址不存在')
    }

    // 若设置为默认，先取消其他默认地址
    if (updates.is_default === 1) {
      await prisma.addresses.updateMany({
        where: { user_id: userId, is_default: 1 },
        data: { is_default: 0 },
      })
    }

    const data: any = { updated_at: new Date() }
    if (updates.receiver_name !== undefined) data.receiver_name = updates.receiver_name
    if (updates.receiver_mobile !== undefined) data.receiver_mobile = updates.receiver_mobile
    if (updates.province !== undefined) data.province = updates.province
    if (updates.city !== undefined) data.city = updates.city
    if (updates.district !== undefined) data.district = updates.district
    if (updates.detail_address !== undefined) data.detail_address = updates.detail_address
    if (updates.is_default !== undefined) data.is_default = updates.is_default

    const updated = await prisma.addresses.update({
      where: { id: addressId },
      data,
    })

    // 如果取消了默认且该地址原为默认，自动将另一个地址设为默认
    if (updates.is_default === 0 && addr.is_default === 1) {
      const nextDefault = await prisma.addresses.findFirst({
        where: { user_id: userId, id: { not: addressId } },
        orderBy: { id: 'desc' },
      })
      if (nextDefault) {
        await prisma.addresses.update({
          where: { id: nextDefault.id },
          data: { is_default: 1 },
        })
      }
    }

    return updated
  },

  // 删除收货地址（物理删除）
  async deleteAddress(addressId: number, userId: number) {
    const addr = await prisma.addresses.findFirst({
      where: { id: addressId, user_id: userId },
    })

    if (!addr) {
      throw new Error('地址不存在')
    }

    const deleted = await prisma.addresses.delete({
      where: { id: addressId },
    })

    // 如果删除的是默认地址，将另一个地址设为默认
    if (addr.is_default === 1) {
      const nextDefault = await prisma.addresses.findFirst({
        where: { user_id: userId },
        orderBy: { id: 'desc' },
      })
      if (nextDefault) {
        await prisma.addresses.update({
          where: { id: nextDefault.id },
          data: { is_default: 1 },
        })
      }
    }

    return deleted
  },

  async logout(userId: number) {
    await prisma.users.update({
      where: { id: userId },
      data: { refresh_token: null },
    })
  },
}

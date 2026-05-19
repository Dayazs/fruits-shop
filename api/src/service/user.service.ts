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

  async logout(userId: number) {
    await prisma.users.update({
      where: { id: userId },
      data: { refresh_token: null },
    })
  },
}

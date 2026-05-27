import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'

export const adminService = {
  // 管理员登录
  async login(username: string, password: string) {
    // 查找管理员
    const exisAdmin = await prisma.admins.findFirst({
      where: { username },
      include: { roles: true }, // 关联角色表
    })

    if (!exisAdmin) {
      throw new Error('管理员不存在')
    }

    // 校验密码
    const isVaild = await bcrypt.compare(password, exisAdmin.password)
    if (!isVaild) {
      throw new Error('密码错误')
    }

    // 获取权限列表
    let permissions: string[] = []
    if (exisAdmin.roles?.permissions) {
      const rolePermissions = exisAdmin.roles.permissions as string | string[]
      if (Array.isArray(rolePermissions)) {
        permissions = rolePermissions
      } else if (typeof rolePermissions === 'string') {
        try {
          permissions = JSON.parse(rolePermissions)
        } catch {
          permissions = []
        }
      }
    }

    // 生成token
    const accessToken = jwt.sign(
      { id: exisAdmin.id, type: 'admin', role_id: exisAdmin.role_id },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' },
    )

    return {
      id: exisAdmin.id,
      username: exisAdmin.username,
      avatar: exisAdmin.avatar,
      role: exisAdmin.roles?.name,
      permissions,
      token: accessToken,
    }
  },

  // ─── 用户管理 ───

  // 用户列表（分页 + 筛选）
  async getUserList(params: {
    page: number
    pageSize: number
    username?: string
    status?: number
    startDate?: string
    endDate?: string
  }) {
    const { page, pageSize, username, status, startDate, endDate } = params
    const where: Prisma.usersWhereInput = {}

    if (username) {
      where.username = { contains: username }
    }
    if (status !== undefined && status !== null) {
      where.status = status
    }
    if (startDate || endDate) {
      where.created_at = {}
      if (startDate) (where.created_at as any).gte = new Date(startDate)
      if (endDate) (where.created_at as any).lte = new Date(endDate + ' 23:59:59')
    }

    const [total, list] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          avatar: true,
          openid: true,
          status: true,
          created_at: true,
          updated_at: true,
          _count: { select: { orders: true, addresses: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return { total, list }
  },

  // 获取所有用户（导出用）
  async getAllUsersForExport(params: {
    username?: string
    status?: number
    startDate?: string
    endDate?: string
  }) {
    const { username, status, startDate, endDate } = params
    const where: Prisma.usersWhereInput = {}

    if (username) where.username = { contains: username }
    if (status !== undefined && status !== null) where.status = status
    if (startDate || endDate) {
      where.created_at = {}
      if (startDate) (where.created_at as any).gte = new Date(startDate)
      if (endDate) (where.created_at as any).lte = new Date(endDate + ' 23:59:59')
    }

    return prisma.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        mobile: true,
        status: true,
        created_at: true,
        _count: { select: { orders: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  },

  // 编辑用户信息
  async updateUser(
    id: number,
    data: { username?: string; email?: string; mobile?: string },
  ) {
    const user = await prisma.users.findUnique({ where: { id } })
    if (!user) throw new Error('用户不存在')

    if (data.username && data.username !== user.username) {
      const dup = await prisma.users.findUnique({ where: { username: data.username } })
      if (dup) throw new Error('用户名已被占用')
    }

    return prisma.users.update({
      where: { id },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        mobile: true,
        avatar: true,
        status: true,
        updated_at: true,
      },
    })
  },

  // 切换用户启用/禁用状态
  async toggleUserStatus(id: number) {
    const user = await prisma.users.findUnique({ where: { id } })
    if (!user) throw new Error('用户不存在')

    const newStatus = user.status === 1 ? 0 : 1
    return prisma.users.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
      select: { id: true, username: true, status: true },
    })
  },

  // 重置用户密码
  async resetUserPassword(id: number, newPassword: string) {
    const user = await prisma.users.findUnique({ where: { id } })
    if (!user) throw new Error('用户不存在')

    if (!newPassword || newPassword.length < 6) {
      throw new Error('密码长度不能少于6位')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    return prisma.users.update({
      where: { id },
      data: { password: hashed, updated_at: new Date() },
      select: { id: true, username: true, updated_at: true },
    })
  },
}

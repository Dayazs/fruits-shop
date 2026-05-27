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

    // 生成token（注入权限信息，中间件无需查库）
    const accessToken = jwt.sign(
      {
        id: exisAdmin.id,
        type: 'admin',
        role_id: exisAdmin.role_id,
        permissions,
      },
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

  // ─── 管理员管理 ───

  async getAdminList(params: { page: number; pageSize: number; username?: string }) {
    const { page, pageSize, username } = params
    const where: any = {}
    if (username) where.username = { contains: username }

    const [total, list] = await Promise.all([
      prisma.admins.count({ where }),
      prisma.admins.findMany({
        where,
        select: {
          id: true, username: true, avatar: true, role_id: true,
          created_at: true, updated_at: true,
          roles: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return { total, list }
  },

  async createAdmin(username: string, password: string, roleId?: number) {
    const exist = await prisma.admins.findFirst({ where: { username } })
    if (exist) throw new Error('管理员已存在')
    if (!password || password.length < 6) throw new Error('密码至少6位')

    const hashed = await bcrypt.hash(password, 10)
    return prisma.admins.create({
      data: {
        username,
        password: hashed,
        role_id: roleId || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, username: true, role_id: true, created_at: true },
    })
  },

  async updateAdmin(id: number, data: { username?: string; password?: string; role_id?: number | null }) {
    const admin = await prisma.admins.findUnique({ where: { id } })
    if (!admin) throw new Error('管理员不存在')
    if (data.username && data.username !== admin.username) {
      const dup = await prisma.admins.findFirst({ where: { username: data.username } })
      if (dup) throw new Error('用户名已被占用')
    }

    const updateData: any = { updated_at: new Date() }
    if (data.username !== undefined) updateData.username = data.username
    if (data.role_id !== undefined) updateData.role_id = data.role_id
    if (data.password) {
      if (data.password.length < 6) throw new Error('密码至少6位')
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    return prisma.admins.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role_id: true, updated_at: true },
    })
  },

  async deleteAdmin(id: number) {
    const admin = await prisma.admins.findUnique({ where: { id } })
    if (!admin) throw new Error('管理员不存在')
    await prisma.admins.delete({ where: { id } })
    return { id }
  },

  // ─── 角色管理 ───

  async getRoleList() {
    return prisma.roles.findMany({
      select: { id: true, name: true, permissions: true, created_at: true },
      orderBy: { id: 'asc' },
    })
  },

  async createRole(name: string, permissions: string[]) {
    const exist = await prisma.roles.findFirst({ where: { name } })
    if (exist) throw new Error('角色名已存在')

    return prisma.roles.create({
      data: {
        name,
        permissions: JSON.stringify(permissions),
        created_at: new Date(),
        updated_at: new Date(),
      },
    })
  },

  async updateRole(id: number, data: { name?: string; permissions?: string[] }) {
    const role = await prisma.roles.findUnique({ where: { id } })
    if (!role) throw new Error('角色不存在')

    const updateData: any = { updated_at: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.permissions !== undefined) updateData.permissions = JSON.stringify(data.permissions)

    return prisma.roles.update({ where: { id }, data: updateData })
  },

  async deleteRole(id: number) {
    // 检查是否有管理员使用该角色
    const count = await prisma.admins.count({ where: { role_id: id } })
    if (count > 0) throw new Error('该角色下还有管理员，请先转移或删除')

    await prisma.roles.delete({ where: { id } })
    return { id }
  },

  // ─── 权限定义 ───

  async getPermissionList() {
    return prisma.permissions.findMany({
      orderBy: [{ parent_value: 'asc' }, { id: 'asc' }],
    })
  },

  // 获取当前管理员的最新权限（从 DB 查询，非 JWT 缓存）
  async getMe(adminId: number) {
    const admin = await prisma.admins.findUnique({
      where: { id: adminId },
      include: { roles: true },
    })
    if (!admin) throw new Error('管理员不存在')

    let permissions: string[] = []
    if (admin.roles?.permissions) {
      const rp = admin.roles.permissions as string | string[]
      permissions = Array.isArray(rp) ? rp : (() => { try { return JSON.parse(rp) } catch { return [] } })()
    }

    return {
      id: admin.id,
      username: admin.username,
      avatar: admin.avatar,
      role: admin.roles?.name || null,
      permissions,
    }
  },
}

import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
}

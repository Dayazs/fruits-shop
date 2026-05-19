import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

async function initAdmin() {
  const adminUsername = 'test01'
  const adminPassword = '123456'

  try {
    // 检查管理员是否已存在
    const existingAdmin = await prisma.admins.findFirst({
      where: { username: adminUsername },
    })

    if (existingAdmin) {
      console.log('管理员已存在，跳过初始化')
      return
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // 创建管理员
    const admin = await prisma.admins.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    console.log('管理员初始化成功:', { username: admin.username, id: admin.id })
  } catch (error) {
    console.error('初始化管理员失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initAdmin()

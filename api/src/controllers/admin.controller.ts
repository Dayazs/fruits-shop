import { Request, Response } from 'express'
import { adminService } from '../service/admin.service'
import ExcelJS from 'exceljs'

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    const data = await adminService.login(username, password)

    res.status(200).json({ code: 200, msg: '登录成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message })
  }
}

// ─── 用户管理 ───

// 用户列表
export const getUserList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const username = req.query.username as string | undefined
    const status = req.query.status !== undefined ? parseInt(req.query.status as string) : undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const data = await adminService.getUserList({
      page, pageSize, username, status, startDate, endDate,
    })
    res.status(200).json({ code: 200, msg: '获取成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 编辑用户信息
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const { username, email, mobile } = req.body
    const data = await adminService.updateUser(id, { username, email, mobile })
    res.status(200).json({ code: 200, msg: '更新成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 切换用户启用/禁用
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const data = await adminService.toggleUserStatus(id)
    res.status(200).json({ code: 200, msg: data.status === 1 ? '已启用' : '已禁用', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 重置用户密码
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const { password } = req.body
    const data = await adminService.resetUserPassword(id, password)
    res.status(200).json({ code: 200, msg: '密码重置成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// 导出用户 Excel
export const exportUsers = async (req: Request, res: Response) => {
  try {
    const username = req.query.username as string | undefined
    const status = req.query.status !== undefined ? parseInt(req.query.status as string) : undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const users = await adminService.getAllUsersForExport({
      username, status, startDate, endDate,
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('用户列表')

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '邮箱', key: 'email', width: 28 },
      { header: '手机号', key: 'mobile', width: 18 },
      { header: '状态', key: 'status', width: 10 },
      { header: '订单数', key: 'orders', width: 10 },
      { header: '注册时间', key: 'created_at', width: 22 },
    ]

    // 表头样式
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    for (const u of users) {
      sheet.addRow({
        id: u.id,
        username: u.username,
        email: u.email || '',
        mobile: u.mobile || '',
        status: u.status === 1 ? '正常' : '禁用',
        orders: u._count.orders,
        created_at: u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '',
      })
    }

    // 数据行边框
    sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber === 1) return
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// ─── 管理员管理 ───

export const getAdminList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const username = req.query.username as string | undefined
    const data = await adminService.getAdminList({ page, pageSize, username })
    res.status(200).json({ code: 200, msg: '获取成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password, role_id } = req.body
    const data = await adminService.createAdmin(username, password, role_id)
    res.status(200).json({ code: 200, msg: '创建成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const { username, password, role_id } = req.body
    const data = await adminService.updateAdmin(id, { username, password, role_id })
    res.status(200).json({ code: 200, msg: '更新成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const data = await adminService.deleteAdmin(id)
    res.status(200).json({ code: 200, msg: '删除成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// ─── 角色管理 ───

export const getRoleList = async (_req: Request, res: Response) => {
  try {
    const data = await adminService.getRoleList()
    res.status(200).json({ code: 200, msg: '获取成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, permissions } = req.body
    const data = await adminService.createRole(name, permissions)
    res.status(200).json({ code: 200, msg: '创建成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

export const updateRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const { name, permissions } = req.body
    const data = await adminService.updateRole(id, { name, permissions })
    res.status(200).json({ code: 200, msg: '更新成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const data = await adminService.deleteRole(id)
    res.status(200).json({ code: 200, msg: '删除成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

// ─── 权限定义 ───

export const getPermissionList = async (_req: Request, res: Response) => {
  try {
    const data = await adminService.getPermissionList()
    res.status(200).json({ code: 200, msg: '获取成功', data })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

// 获取当前管理员最新信息（含 DB 中最新权限，非 JWT 缓存）
export const getMe = async (req: Request, res: Response) => {
  try {
    const data = await adminService.getMe(req.user.id)
    res.status(200).json({ code: 200, msg: '获取成功', data })
  } catch (err: any) {
    res.status(400).json({ code: 400, msg: err.message })
  }
}

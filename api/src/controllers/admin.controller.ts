import { Request, Response } from 'express'
import { adminService } from '../service/admin.service'

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    const data = await adminService.login(username, password)

    res.status(200).json({ code: 200, msg: '登录成功', data })
  } catch (err: any) {
    res.status(401).json({ code: 401, msg: err.message })
  }
}

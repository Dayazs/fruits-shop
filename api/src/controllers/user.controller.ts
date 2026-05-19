import { Request, Response, NextFunction } from 'express'
import { userService } from '../service/user.service'

// 测试
export const getUserInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const data = await userService.getUserInfo()
  res.json({ code: 200, msg: '测试接口', data })
}

// 注册
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, mobile } = req.body
    const data = await userService.register(username, password, mobile)

    res.json({ code: 200, msg: '注册成功', data })
  } catch (err: any) {
    res.json({ code: 400, msg: err.message })
  }
}

// 登录
export const login = async (req: Request, res: Response) => {
  try {
    const { account, password } = req.body
    const data = await userService.login(account, password)
    res.json({ code: 200, msg: '登录成功', data })
  } catch (err: any) {
    res.json({ code: 400, msg: err.message })
  }
}

// 登出
export const logout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body
    const data = await userService.logout(userId)
    res.json({ code: 200, msg: '登出成功', data })
  } catch (err: any) {
    res.json({ code: 400, msg: err.message })
  }
}

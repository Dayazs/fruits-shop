import Jwt from 'jsonwebtoken'
import dotdev from 'dotenv'
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/token'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ code: 401, msg: '未授权' })
  }

  try {
    const decoed = verifyAccessToken(token)
    req.user = decoed
    next()
  } catch (err) {
    res.status(401).json({ code: 401, msg: 'token已失效' })
  }
}

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.type === 'admin') {
    next()
  } else {
    res.status(403).json({ code: 403, msg: '权限不足' })
  }
}

// 权限校验中间件：接受一个或多个权限值，满足其一即放行
export const requirePermission =
  (...requiredPerms: string[]): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, msg: '未授权' })
    }
    if (req.user.type !== 'admin') {
      return res.status(403).json({ code: 403, msg: '权限不足' })
    }
    const perms: string[] = req.user.permissions || []
    // 超级管理员拥有所有权限
    if (perms.includes('*')) return next()
    // 满足任意一个即可
    if (requiredPerms.some((p) => perms.includes(p))) return next()

    return res.status(403).json({ code: 403, msg: '权限不足' })
  }

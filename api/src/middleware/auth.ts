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

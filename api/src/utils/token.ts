import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!

// 短期token
export const generateAccessToken = (payload: {
  id: number
  username: string
}) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }) // 1天过期
}

// 长期token
export const generateRefreshToken = (payload: { id: number }) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' }) // 7天过期
}

// 验证 access_token
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET)
}

// 验证 refresh_token
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET)
}

import express from 'express'
import cors from 'cors'
import path from 'path'
import cookieParser from 'cookie-parser'

import routes from './routes'

const app = express()

// 解析json
app.use(express.json())

// 解析form
app.use(express.urlencoded({ extended: true }))

// 解析cookie
app.use(cookieParser())

// cors(允许携带cookie)
app.use(cors({ origin: 'http://localhost:10041', credentials: true }))

// 静态资源
app.use('/uploads', express.static(path.join(__dirname, '../uploads/')))

// 路由
app.use('/api', routes)

export default app

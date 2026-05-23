import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import prisma from '../lib/prisma'
import { ORDER_STATUS } from './order.service'

// 微信支付 V3 配置（从 .env 读取）
const APPID = process.env.APPID!
const MCH_ID = process.env.MCH_ID!
const API_V3_KEY = process.env.PAY_API_V3_KEY || ''
const NOTIFY_URL = process.env.PAY_NOTIFY_URL || ''
const API_CERT_PATH = process.env.PAY_CERT_PATH || ''
const API_KEY_PATH = process.env.PAY_KEY_PATH || ''
const API_SERIAL_NO = process.env.PAY_SERIAL_NO || ''

// 微信支付 V3 域名
const WXPAY_HOST = 'https://api.mch.weixin.qq.com'

// 读取商户私钥（pem 证书）
const loadPrivateKey = (): string => {
  if (!API_KEY_PATH || !fs.existsSync(API_KEY_PATH)) {
    throw new Error('商户私钥文件不存在，请将 apiclient_key.pem 放到 certs/ 目录')
  }
  return fs.readFileSync(API_KEY_PATH, 'utf-8')
}

// 生成 V3 签名
const makeSign = (
  method: string,
  url: string,
  timestamp: number,
  nonceStr: string,
  body: string,
): string => {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`
  const privateKey = loadPrivateKey()
  return crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(privateKey, 'base64')
}

// 生成 V3 Authorization header
const makeAuthHeader = (
  method: string,
  url: string,
  body: string,
): { Authorization: string } => {
  const timestamp = Math.floor(Date.now() / 1000)
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const signature = makeSign(method, url, timestamp, nonceStr, body)

  return {
    Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${MCH_ID}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${API_SERIAL_NO}",signature="${signature}"`,
  }
}

// AES-256-GCM 解密回调数据
const decryptCallbackData = (
  associatedData: string,
  nonce: string,
  ciphertext: string,
): string => {
  const key = Buffer.from(API_V3_KEY)
  const ciphertextBuffer = Buffer.from(ciphertext, 'base64')
  const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16)
  const data = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf-8'), {
    authTagLength: 16,
  })
  decipher.setAuthTag(authTag)
  decipher.setAAD(Buffer.from(associatedData, 'utf-8'))

  return Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]).toString('utf-8')
}

export const payService = {
  // V3 JSAPI 统一下单 → 返回小程序调起支付参数
  async generatePayParams(orderId: number, userId: number, openid: string) {
    const order = await prisma.orders.findFirst({
      where: { id: orderId, user_id: userId },
      include: { users: true },
    })

    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_PAY) {
      throw new Error('订单状态不允许支付')
    }
    if (!NOTIFY_URL) {
      throw new Error('请先配置 PAY_NOTIFY_URL')
    }

    const path = '/v3/pay/transactions/jsapi'
    const body = JSON.stringify({
      appid: APPID,
      mchid: MCH_ID,
      description: '水果店订单',
      out_trade_no: order.order_no,
      notify_url: NOTIFY_URL,
      amount: {
        total: Math.round(Number(order.total_amount) * 100), // 分
        currency: 'CNY',
      },
      payer: {
        openid: openid || order.users.openid || '',
      },
    })

    try {
      const { data } = await axios.post(`${WXPAY_HOST}${path}`, body, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...makeAuthHeader('POST', path, body),
        },
      })

      const prepayId = data.prepay_id

      // 构建小程序调起支付参数（V3 二次签名）
      const nonceStr = crypto.randomBytes(16).toString('hex')
      const timestamp = Math.floor(Date.now() / 1000)
      const pkg = `prepay_id=${prepayId}`
      const signMessage = `${APPID}\n${timestamp}\n${nonceStr}\n${pkg}\n`
      const paySign = crypto
        .createSign('RSA-SHA256')
        .update(signMessage)
        .sign(loadPrivateKey(), 'base64')

      return {
        appId: APPID,
        timeStamp: timestamp.toString(),
        nonceStr,
        package: pkg,
        signType: 'RSA',
        paySign,
      }
    } catch (err: any) {
      if (err.response?.data) {
        throw new Error(err.response.data.message || '微信支付请求失败')
      }
      throw new Error(err.message || '微信支付请求失败')
    }
  },

  // V3 支付回调处理
  async handlePayCallback(
    headers: Record<string, string>,
    body: Record<string, any>,
  ) {
    // V3 回调：需要验证签名并解密 resource
    const signature = headers['wechatpay-signature']
    const timestamp = headers['wechatpay-timestamp']
    const nonce = headers['wechatpay-nonce']
    const serialNo = headers['wechatpay-serial']

    if (!signature || !timestamp || !nonce) {
      return { code: 'FAIL', message: '缺少签名参数' }
    }

    // 验证签名
    const message = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`
    const publicKey = API_CERT_PATH ? fs.readFileSync(API_CERT_PATH, 'utf-8') : ''
    if (publicKey) {
      const verified = crypto
        .createVerify('RSA-SHA256')
        .update(message)
        .verify(publicKey, signature, 'base64')
      if (!verified) {
        return { code: 'FAIL', message: '签名验证失败' }
      }
    }

    // 解密 resource
    const resource = body.resource
    if (!resource) {
      return { code: 'FAIL', message: '缺少 resource' }
    }

    const decrypted = decryptCallbackData(
      resource.associated_data || '',
      resource.nonce || '',
      resource.ciphertext || '',
    )

    const result = JSON.parse(decrypted)

    // 查询订单
    const order = await prisma.orders.findUnique({
      where: { order_no: result.out_trade_no },
    })
    if (!order) {
      return { code: 'FAIL', message: '订单不存在' }
    }

    // 校验金额
    const totalFee = Math.round(Number(order.total_amount) * 100)
    if (result.amount?.total !== totalFee) {
      return { code: 'FAIL', message: '金额不匹配' }
    }

    // 更新订单状态
    if (order.status === ORDER_STATUS.PENDING_PAY) {
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.PENDING_SHIP,
          pay_time: new Date(),
          updated_at: new Date(),
        },
      })
    }

    return { code: 'SUCCESS', message: 'OK' }
  },
}

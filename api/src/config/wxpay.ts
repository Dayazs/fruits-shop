import axios from 'axios'

// 通过小程序code换取openid
export const codeToOpenId = async (code: string) => {
  const { data } = await axios.get(
    'https://api.weixin.qq.com/sns/jscode2session',
    {
      params: {
        appid: process.env.APPID,
        secret: process.env.APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
    },
  )

  if (data.openid) {
    return data.openid
  }

  throw new Error(data.errmsg || '获取openid失败')
}

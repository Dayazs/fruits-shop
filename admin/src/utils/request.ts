import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (err) => {
    console.log('请求拦截器出错', err)
    return Promise.reject(err)
  },
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data

    if (res.code === 200) {
      return res.data
    }

    // 出现错误
    ElMessage.error(res.message || '请求失败')

    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (err) => {
    if (err.response) {
      const status = err.response.status
      const msg = err.response.data?.msg
      switch (status) {
        case 401:
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          localStorage.removeItem('permissions')
          ElMessage.error(msg || '登录已过期，请重新登录')
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
          break
        case 403:
          ElMessage.error('没有权限访问')
          break
        case 404:
          ElMessage.error('请求资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(err.response.data?.msg || '请求失败')
      }
    } else {
      ElMessage.error('网络异常，请检查网络')
    }
  },
)

export default request

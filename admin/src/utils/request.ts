import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.BASE_URL || '/api',
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
  (err) => {},
)

export default request

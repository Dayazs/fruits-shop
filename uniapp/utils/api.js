const BASE_URL = 'http://localhost:10040/api'
export const IMG_BASE = 'http://localhost:10040'

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    uni.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          resolve(res.data)
        } else {
          reject(res.data)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

const uploadFile = (url, filePath, name = 'avatar') => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    uni.uploadFile({
      url: BASE_URL + url,
      filePath,
      name,
      header: {
        Authorization: `Bearer ${token}`
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            reject(data)
          }
        } catch (_) {
          reject({ code: 500, msg: '解析响应失败' })
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export const userApi = {
  wxLogin: (data) => request('/user/wx-login', { method: 'POST', data }),
  getProfile: () => request('/user/profile'),
  updateProfile: (data) => request('/user/profile', { method: 'PATCH', data }),
  uploadAvatar: (filePath) => uploadFile('/user/profile/avatar', filePath, 'avatar')
}

export const homeApi = {
  getBanners: () => request('/home/banners'),
  getCategories: () => request('/home/categories')
}

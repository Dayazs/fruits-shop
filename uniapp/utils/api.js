const BASE_URL = 'http://localhost:10040/api'

const request = (url, options = {}) => {
	return new Promise((resolve, reject) => {
		const token = uni.getStorageSync('token')
		uni.request({
			url: BASE_URL + url,
			method: options.method || 'GET',
			data: options.data,
			header: {
				'Content-Type': 'application/json',
				...(token ? {
					Authorization: `Bearer ${token}`
				} : {})
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

export const userApi = {
	wxLogin: (data) => request('/user/wx-login', {
		method: 'POST',
		data
	}),
	getProfile: () => request('/user/profile'),
	updateProfile: (data) => request('/user/profile', {
		method: 'PATCH',
		data
	}),
	// logout: () => request('/user/logout', { method: 'POST' })
}
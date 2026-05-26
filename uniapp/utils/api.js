// const BASE_URL = 'http://localhost:10040/api'
// export const IMG_BASE = 'http://localhost:10040'

const BASE_URL = 'http://47.105.65.75:10040/api'
export const IMG_BASE = 'http://47.105.65.75:10040'

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
				// res.data 可能已经是对象（部分 uni-app 版本），也可能是 JSON 字符串
				let data = res.data
				if (typeof data === 'string') {
					try {
						data = JSON.parse(data)
					} catch (_) {
						reject({
							code: 500,
							msg: data || '服务器响应异常'
						})
						return
					}
				}
				if (data && data.code === 200) {
					resolve(data)
				} else {
					reject(data || {
						code: res.statusCode,
						msg: '上传失败'
					})
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
	uploadAvatar: (filePath) => uploadFile('/user/profile/avatar', filePath, 'avatar'),

	// 收货地址
	getAddresses: () => request('/user/addresses'),
	createAddress: (data) => request('/user/addresses', {
		method: 'POST',
		data
	}),
	updateAddress: (id, data) => request(`/user/addresses/${id}`, {
		method: 'PATCH',
		data
	}),
	deleteAddress: (id) => request(`/user/addresses/${id}`, {
		method: 'DELETE'
	}),

	// 购物车
	getCartList: () => request('/user/cart'),
	addToCart: (data) => request('/user/cart', {
		method: 'POST',
		data
	}),
	updateCartQuantity: (id, data) => request(`/user/cart/${id}`, {
		method: 'PATCH',
		data
	}),
	removeFromCart: (id) => request(`/user/cart/${id}`, {
		method: 'DELETE'
	})
}

const buildQuery = (params) => {
	const parts = Object.entries(params)
		.filter(([_, v]) => v !== undefined && v !== null)
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join('&')
	return parts ? '?' + parts : ''
}

export const homeApi = {
	getBanners: () => request('/home/banners'),
	getCategories: () => request('/home/categories'),
	getGoods: (params = {}) => request(`/home/goods${buildQuery(params)}`),
	getGoodsDetail: (id) => request(`/home/goods/${id}`)
}

export const orderApi = {
	createOrder: (data) => request('/order', {
		method: 'POST',
		data
	}),
	directBuy: (data) => request('/order/direct-buy', {
		method: 'POST',
		data
	}),
	getOrders: (params = {}) => request(`/order${buildQuery(params)}`),
	cancelOrder: (id) => request(`/order/${id}/cancel`, {
		method: 'PATCH'
	}),
	payOrder: (data) => request('/order/pay', {
		method: 'POST',
		data
	}),
	paySuccess: (id) => request(`/order/${id}/pay-success`, {
		method: 'PATCH'
	}),
	confirmReceipt: (id) => request(`/order/${id}/confirm-receipt`, {
		method: 'PATCH'
	})
}
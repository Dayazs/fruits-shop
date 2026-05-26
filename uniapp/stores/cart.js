import { ref } from 'vue'
import { userApi } from '@/utils/api.js'

// 全局购物车商品总数
export const cartCount = ref(0)

// 从后端刷新购物车总数
export async function refreshCartCount() {
  try {
    const token = uni.getStorageSync('token')
    if (!token) {
      cartCount.value = 0
      return
    }
    const res = await userApi.getCartList()
    const list = res.data || []
    cartCount.value = list.reduce((sum, item) => sum + item.quantity, 0)
  } catch (_) {
    // 静默失败
  }
}

// 登录状态守卫：未登录时提示并跳转到"我的"页面
export function requireLogin() {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.switchTab({ url: '/pages/mine/mine' })
    return false
  }
  return true
}

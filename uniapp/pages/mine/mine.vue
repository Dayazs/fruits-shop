<template>
  <view class="mine-page">
    <!-- ========== 用户卡片 ========== -->
    <view class="user-card" @tap="handleUserCardTap">
      <view class="card-bg"></view>
      <image class="card-bg-img" src="/static/icons/user_background.png" mode="aspectFill"></image>
      <view class="card-content">
        <image
          class="user-avatar"
          :src="isLoggedIn && userInfo.avatar ? (IMG_BASE + userInfo.avatar) : '/static/logo.png'"
          mode="aspectFill"
        ></image>
        <view class="user-info">
          <text class="user-name">
            {{ isLoggedIn && userInfo.username ? userInfo.username : '请登录' }}
          </text>
          <text class="user-arrow">&#8250;</text>
        </view>
      </view>
    </view>

    <!-- ========== 我的订单 ========== -->
    <view class="order-card">
      <view class="order-header">
        <text class="order-title">我的订单</text>
        <text class="order-all" @tap.stop="handleOrderNav(-1)">全部</text>
      </view>
      <view class="order-status-row">
        <view class="status-item" v-for="item in orderStatuses" :key="item.label"
          @tap="handleOrderNav(item.status)">
          <view class="status-icon-wrap">
            <image :src="item.icon" class="status-icon" mode="aspectFit"></image>
            <view v-if="item.status <= 2 && orderCounts[item.status] > 0" class="status-badge">
              <text class="badge-num">{{ orderCounts[item.status] > 99 ? '99+' : orderCounts[item.status] }}</text>
            </view>
          </view>
          <text class="status-text">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </view>
  <CustomTabBar />
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CustomTabBar from '@/components/custom-tab-bar.vue'
import { userApi, orderApi, IMG_BASE } from '@/utils/api.js'
import { refreshCartCount } from '@/stores/cart.js'

const isLoggedIn = ref(false)
const agreed = ref(false)
const loginLoading = ref(false)
const orderCounts = ref({ 0: 0, 1: 0, 2: 0 })
const userInfo = reactive({
  id: 0, username: '', avatar: '', mobile: ''
})

const orderStatuses = [
  { label: '待付款', icon: '/static/icons/non-payment.svg', status: 0 },
  { label: '待发货', icon: '/static/icons/not_yet_shipped.svg', status: 1 },
  { label: '已发货', icon: '/static/icons/shipped.svg', status: 2 },
  { label: '已完成', icon: '/static/icons/complete_transaction.svg', status: 3 },
  { label: '已关闭', icon: '/static/icons/transaction_closed.svg', status: 4 }
]

onLoad(() => { checkLoginStatus() })
onShow(() => { checkLoginStatus() })

const checkLoginStatus = () => {
  const token = uni.getStorageSync('token')
  if (token) {
    isLoggedIn.value = true
    fetchProfile()
    fetchOrderCounts()
  } else {
    isLoggedIn.value = false
    orderCounts.value = { 0: 0, 1: 0, 2: 0 }
  }
}

const fetchProfile = async () => {
  try {
    const res = await userApi.getProfile()
    Object.assign(userInfo, res.data)
  } catch (err) {
    if (err.code === 401) {
      uni.removeStorageSync('token')
      isLoggedIn.value = false
    }
  }
}

const fetchOrderCounts = async () => {
  try {
    const counts = { 0: 0, 1: 0, 2: 0 }
    const res = await orderApi.getOrders()
    const list = res.data?.list || []
    for (const order of list) {
      if (order.status <= 2 && counts[order.status] !== undefined) {
        counts[order.status]++
      }
    }
    orderCounts.value = counts
  } catch (_) {
    orderCounts.value = { 0: 0, 1: 0, 2: 0 }
  }
}

const toggleAgreement = () => { agreed.value = !agreed.value }

const handleWechatLogin = () => {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  loginLoading.value = true
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      try {
        const res = await userApi.wxLogin({ code: loginRes.code })
        uni.setStorageSync('token', res.data.token)
        Object.assign(userInfo, res.data)
        isLoggedIn.value = true
        refreshCartCount()
        fetchOrderCounts()
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.msg || '登录失败，请重试', icon: 'none' })
      } finally { loginLoading.value = false }
    },
    fail: () => {
      loginLoading.value = false
      uni.showToast({ title: '微信登录失败', icon: 'none' })
    }
  })
}

const handleUserCardTap = () => {
  if (isLoggedIn.value) {
    uni.navigateTo({ url: '/pages/personal/personal' })
  } else {
    uni.showModal({
      title: '登录', content: '请先登录', confirmText: '微信登录',
      success: (res) => {
        if (res.confirm) { agreed.value = true; handleWechatLogin() }
      }
    })
  }
}

const handleOrderNav = (status) => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (status === -1) {
    uni.navigateTo({ url: '/pages/order-list/order-list' })
  } else {
    uni.navigateTo({ url: `/pages/order-list/order-list?status=${status}` })
  }
}
</script>

<style>
.mine-page {
  min-height: 100vh; background-color: #f5f5f5;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
}
.user-card {
  width: 750rpx; height: 294rpx; position: relative; overflow: hidden; margin-bottom: 20rpx;
}
.card-bg {
  position: absolute; top: 0; left: 0; width: 750rpx; height: 294rpx;
  background-color: rgba(14, 204, 80, 1);
}
.card-bg-img {
  position: absolute; top: 0; left: 0; width: 750rpx; height: 294rpx; opacity: 0.15;
}
.card-content {
  position: relative; z-index: 1; display: flex; align-items: center;
  height: 294rpx; padding-left: 40rpx; padding-top: 10rpx; box-sizing: border-box;
}
.user-avatar {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.6); background-color: #eee; flex-shrink: 0;
}
.user-info { display: flex; margin-top: -60rpx; flex: 1; margin-left: 24rpx; }
.user-name { font-size: 34rpx; font-weight: bold; color: #fff; }
.user-arrow { font-size: 36rpx; color: rgba(255, 255, 255, 0.7); margin-top: -5rpx; margin-left: 12rpx; }

.order-card {
  width: 710rpx; height: 256rpx; margin: 0 auto; background-color: #fff;
  border-radius: 16rpx; box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box; padding: 24rpx 20rpx 0;
}
.order-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx;
}
.order-title { font-size: 30rpx; font-weight: bold; color: #333; }
.order-all { font-size: 26rpx; color: #999; }
.order-status-row { display: flex; justify-content: space-around; }
.status-item {
  width: 142rpx; height: 152rpx; display: flex;
  flex-direction: column; align-items: center; justify-content: center;
}
.status-icon-wrap { position: relative; }
.status-icon { width: 60rpx; height: 60rpx; margin-bottom: 12rpx; }
.status-badge {
  position: absolute; top: -8rpx; right: -16rpx;
  min-width: 28rpx; height: 28rpx; background-color: #e74c3c;
  border-radius: 14rpx; display: flex; align-items: center; justify-content: center;
  padding: 0 4rpx;
}
.badge-num { font-size: 16rpx; color: #fff; line-height: 1; }
.status-text { font-size: 24rpx; color: #666; }
</style>

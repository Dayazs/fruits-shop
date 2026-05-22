<template>
  <view class="mine-page">
    <!-- ========== 用户卡片 ========== -->
    <view class="user-card" @tap="handleUserCardTap">
      <!-- 背景层 -->
      <view class="card-bg"></view>
      <image
        class="card-bg-img"
        src="/static/icons/user_background.png"
        mode="aspectFill"
      ></image>
      <!-- 内容层 -->
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

    <!-- ========== 功能菜单 ========== -->
    <view class="menu-section">
      <view class="menu-item" @tap="handleNavTo('address')">
        <text class="menu-text">我的地址</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      <view class="menu-item" @tap="handleNavTo('pendingPayment')">
        <text class="menu-text">待付款</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      <view class="menu-item" @tap="handleNavTo('pendingShip')">
        <text class="menu-text">待发货</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      <view class="menu-item" @tap="handleNavTo('pendingReceive')">
        <text class="menu-text">待收货</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
    </view>
  </view>
  <CustomTabBar />
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CustomTabBar from '@/components/custom-tab-bar.vue'
import { userApi, IMG_BASE } from '@/utils/api.js'

const isLoggedIn = ref(false)
const agreed = ref(false)
const loginLoading = ref(false)
const userInfo = reactive({
  id: 0,
  username: '',
  avatar: '',
  mobile: ''
})

onLoad(() => {
  checkLoginStatus()
})

onShow(() => {
  checkLoginStatus()
})

const checkLoginStatus = () => {
  const token = uni.getStorageSync('token')
  if (token) {
    isLoggedIn.value = true
    fetchProfile()
  } else {
    isLoggedIn.value = false
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

const toggleAgreement = () => {
  agreed.value = !agreed.value
}

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
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.msg || '登录失败，请重试', icon: 'none' })
      } finally {
        loginLoading.value = false
      }
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
    // 未登录：弹出登录弹窗
    uni.showModal({
      title: '登录',
      content: '请先登录',
      confirmText: '微信登录',
      success: (res) => {
        if (res.confirm) {
          // 模拟勾选协议后触发登录
          agreed.value = true
          handleWechatLogin()
        }
      }
    })
  }
}

const handleNavTo = (type) => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style>
.mine-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* ========== 用户卡片 ========== */
.user-card {
  width: 750rpx;
  height: 294rpx;
  position: relative;
  overflow: hidden;
  margin-bottom: 20rpx;
}
.card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 750rpx;
  height: 294rpx;
  background-color: #09bb07;
}
.card-bg-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 750rpx;
  height: 294rpx;
  opacity: 0.15;
}
.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 294rpx;
  padding-left: 40rpx;
  padding-top: 54rpx;
  box-sizing: border-box;
}
.user-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255,255,255,0.6);
  background-color: #eee;
  flex-shrink: 0;
}
.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 24rpx;
}
.user-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #fff;
}
.user-arrow {
  font-size: 36rpx;
  color: rgba(255,255,255,0.7);
  margin-left: 12rpx;
}

/* ========== 功能菜单 ========== */
.menu-section {
  background-color: #fff;
  margin: 0 20rpx 20rpx;
  border-radius: 12rpx;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-text {
  font-size: 30rpx;
  color: #333;
}
.menu-arrow {
  font-size: 32rpx;
  color: #ccc;
}
</style>

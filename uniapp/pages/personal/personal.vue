<template>
  <view class="page">
    <!-- ========== 头像卡片 ========== -->
    <view class="setting-card avatar-card" @tap="handleAvatarTap">
      <text class="setting-label">头像</text>
      <view class="setting-right">
        <image
          class="setting-avatar"
          :src="userInfo.avatar ? (IMG_BASE + userInfo.avatar) : '/static/logo.png'"
          mode="aspectFill"
        ></image>
        <text class="setting-arrow">&#8250;</text>
      </view>
    </view>

    <!-- ========== 账号卡片 ========== -->
    <view class="setting-card account-card" @tap="handleAccountTap">
      <text class="setting-label">账号</text>
      <view class="setting-right">
        <text class="setting-value">{{ userInfo.username || '未设置' }}</text>
        <text class="setting-arrow">&#8250;</text>
      </view>
    </view>

    <!-- ========== 地址管理卡片 ========== -->
    <view class="setting-card address-card" @tap="handleAddressTap">
      <text class="setting-label">地址管理</text>
      <view class="setting-right">
        <text class="setting-arrow">&#8250;</text>
      </view>
    </view>

    <!-- ========== 退出登录 ========== -->
    <view class="logout-section">
      <button class="logout-btn" @tap="handleLogout">退出登录</button>
    </view>

    <!-- ========== 微信头像选择按钮（隐藏） ========== -->
    <button
      v-if="showAvatarPicker"
      class="avatar-picker-overlay"
      open-type="chooseAvatar"
      @chooseavatar="onChooseWechatAvatar"
    >
      <view class="picker-content">
        <text class="picker-text">点击选择微信头像</text>
        <text class="picker-cancel" @tap.stop="showAvatarPicker = false">取消</text>
      </view>
    </button>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { userApi, IMG_BASE } from '@/utils/api.js'

const userInfo = reactive({
  id: 0,
  username: '',
  avatar: '',
  mobile: ''
})

const showAvatarPicker = ref(false)

onLoad(() => {
  fetchProfile()
})

const fetchProfile = async () => {
  try {
    const res = await userApi.getProfile()
    Object.assign(userInfo, res.data)
  } catch (err) {
    uni.showToast({ title: '获取用户信息失败', icon: 'none' })
  }
}

// ─── 头像 ───
const handleAvatarTap = () => {
  uni.showActionSheet({
    itemList: ['使用微信头像', '从相册选择'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 使用微信头像
        showAvatarPicker.value = true
      } else if (res.tapIndex === 1) {
        // 从相册选择
        uni.chooseImage({
          count: 1,
          sourceType: ['album'],
          success: (chooseRes) => {
            uploadAndSaveAvatar(chooseRes.tempFilePaths[0])
          }
        })
      }
    }
  })
}

const onChooseWechatAvatar = (e) => {
  showAvatarPicker.value = false
  const tempFilePath = e.detail.avatarUrl
  if (tempFilePath) {
    uploadAndSaveAvatar(tempFilePath)
  }
}

const uploadAndSaveAvatar = async (filePath) => {
  uni.showLoading({ title: '上传中...' })
  try {
    const res = await userApi.uploadAvatar(filePath)
    userInfo.avatar = res.data.avatar
    uni.hideLoading()
    uni.showToast({ title: '头像更新成功', icon: 'success' })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: err.msg || '头像更新失败', icon: 'none' })
  }
}

// ─── 账号 ───
const handleAccountTap = () => {
  uni.showActionSheet({
    itemList: ['使用微信名称'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showModal({
          title: '设置昵称',
          editable: true,
          placeholderText: userInfo.username || '请输入昵称',
          success: async (modalRes) => {
            if (modalRes.confirm && modalRes.content) {
              const val = modalRes.content.trim()
              if (!val) {
                uni.showToast({ title: '昵称不能为空', icon: 'none' })
                return
              }
              try {
                const updateRes = await userApi.updateProfile({ username: val })
                userInfo.username = updateRes.data.username
                uni.showToast({ title: '昵称更新成功', icon: 'success' })
              } catch (err) {
                uni.showToast({ title: err.msg || '昵称更新失败', icon: 'none' })
              }
            }
          }
        })
      }
    }
  })
}

// ─── 地址管理 ───
const handleAddressTap = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

// ─── 退出登录 ───
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token')
        uni.showToast({ title: '已退出登录', icon: 'none' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      }
    }
  })
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* ========== 设置卡片通用 ========== */
.setting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 0 30rpx;
  box-sizing: border-box;
}
.setting-label {
  font-size: 30rpx;
  color: #333;
}
.setting-right {
  display: flex;
  align-items: center;
}
.setting-arrow {
  font-size: 32rpx;
  color: #ccc;
  margin-left: 12rpx;
}

/* ========== 头像卡片 ========== */
.avatar-card {
  height: 136rpx;
  margin-bottom: 2rpx;
}
.setting-avatar {
  width: 98rpx;
  height: 98rpx;
  border-radius: 50%;
  background-color: #eee;
}

/* ========== 账号卡片 ========== */
.account-card {
  height: 104rpx;
  margin-bottom: 2rpx;
}
.setting-value {
  font-size: 28rpx;
  color: #999;
}

/* ========== 地址管理卡片 ========== */
.address-card {
  height: 104rpx;
  margin-top: 20rpx;
  margin-bottom: 2rpx;
}

/* ========== 退出登录 ========== */
.logout-section {
  padding: 40rpx 30rpx calc(40rpx + env(safe-area-inset-bottom));
  background-color: #f5f5f5;
}
.logout-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  background-color: #fff;
  color: #e74c3c;
  font-size: 30rpx;
  border-radius: 12rpx;
  border: 1rpx solid #ddd;
}

/* ========== 微信头像选择遮罩 ========== */
.avatar-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border: none;
  border-radius: 0;
  padding: 0;
}
.avatar-picker-overlay::after {
  border: none;
}
.picker-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 60rpx 80rpx 40rpx;
}
.picker-text {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 30rpx;
}
.picker-cancel {
  font-size: 26rpx;
  color: #999;
  padding: 10rpx 40rpx;
}
</style>

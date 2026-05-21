<template>
	<view class="mine-page">
		<!-- 未登录 -->
		<view v-if="!isLoggedIn" class="login-container">
			<image class="login-logo" src="/static/logo.png" mode="aspectFit"></image>
			<text class="login-title">欢迎来到水果商城</text>
			<text class="login-desc">登录后享受更多权益</text>

			<view class="agreement-wrapper" @tap="toggleAgreement">
				<view class="checkbox-icon" :class="{ checked: agreed }">
					<text v-if="agreed" class="check-mark">&#10003;</text>
				</view>
				<text class="agreement-text">我已同意《用户协议》</text>
			</view>

			<button class="wechat-login-btn" :disabled="!agreed || loginLoading" :loading="loginLoading"
				@tap="handleWechatLogin">
				微信一键登录
			</button>
		</view>

		<!-- 已登录 -->
		<view v-else class="profile-container">
			<!-- 用户信息卡片 -->
			<view class="user-card">
				<view class="avatar-wrapper" @tap="handleEditAvatar">
					<image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
				</view>
				<view class="username-wrapper" @tap="handleEditUsername">
					<text class="username">{{ userInfo.username || '未知用户' }}</text>
					<text class="edit-tag">点击修改</text>
				</view>
			</view>

			<!-- 功能入口 -->
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

			<!-- 退出登录 -->
			<view class="logout-section">
				<button class="logout-btn" @tap="handleLogout">退出登录</button>
			</view>
		</view>

		<!-- 修改用户名弹窗 -->
		<view v-if="showUsernameModal" class="modal-mask" @tap="cancelUsernameModal">
			<view class="modal-content" @tap.stop>
				<text class="modal-title">修改用户名</text>
				<input class="modal-input" v-model="editUsername" placeholder="请输入新的用户名" maxlength="20" />
				<view class="modal-actions">
					<button class="modal-btn cancel" @tap="cancelUsernameModal">取消</button>
					<button class="modal-btn confirm" @tap="saveUsername">确定</button>
				</view>
			</view>
		</view>

		<!-- 修改头像弹窗 -->
		<view v-if="showAvatarModal" class="modal-mask" @tap="cancelAvatarModal">
			<view class="modal-content" @tap.stop>
				<text class="modal-title">修改头像</text>
				<input class="modal-input" v-model="editAvatar" placeholder="请输入头像图片URL" />
				<view class="modal-actions">
					<button class="modal-btn cancel" @tap="cancelAvatarModal">取消</button>
					<button class="modal-btn confirm" @tap="saveAvatar">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		reactive
	} from 'vue'
	import {
		onLoad,
		onShow
	} from '@dcloudio/uni-app'
	import {
		userApi
	} from '@/utils/api.js'

	const isLoggedIn = ref(false)
	const agreed = ref(false)
	const loginLoading = ref(false)
	const userInfo = reactive({
		id: 0,
		username: '',
		avatar: '',
		mobile: ''
	})

	const showUsernameModal = ref(false)
	const showAvatarModal = ref(false)
	const editUsername = ref('')
	const editAvatar = ref('')

	onLoad(() => {
		checkLoginStatus()
	})

	onShow(() => {
		if (isLoggedIn.value) {
			fetchProfile()
		}
	})

	const checkLoginStatus = () => {
		const token = uni.getStorageSync('token')
		if (token) {
			isLoggedIn.value = true
			fetchProfile()
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
			uni.showToast({
				title: '请先同意用户协议',
				icon: 'none'
			})
			return
		}
		loginLoading.value = true
		uni.login({
			provider: 'weixin',
			success: async (loginRes) => {
				try {
					const res = await userApi.wxLogin({
						code: loginRes.code
					})
					uni.setStorageSync('token', res.data.token)
					Object.assign(userInfo, res.data)
					isLoggedIn.value = true
					uni.showToast({
						title: '登录成功',
						icon: 'success'
					})
				} catch (err) {
					uni.showToast({
						title: err.msg || '登录失败，请重试',
						icon: 'none'
					})
				} finally {
					loginLoading.value = false
				}
			},
			fail: () => {
				loginLoading.value = false
				uni.showToast({
					title: '微信登录失败',
					icon: 'none'
				})
			}
		})
	}

	const handleEditUsername = () => {
		editUsername.value = userInfo.username || ''
		showUsernameModal.value = true
	}

	const cancelUsernameModal = () => {
		showUsernameModal.value = false
	}

	const saveUsername = async () => {
		const val = editUsername.value.trim()
		if (!val) {
			uni.showToast({
				title: '用户名不能为空',
				icon: 'none'
			})
			return
		}
		try {
			const res = await userApi.updateProfile({
				username: val
			})
			Object.assign(userInfo, res.data)
			showUsernameModal.value = false
			uni.showToast({
				title: '修改成功',
				icon: 'success'
			})
		} catch (err) {
			uni.showToast({
				title: err.msg || '修改失败',
				icon: 'none'
			})
		}
	}

	const handleEditAvatar = () => {
		editAvatar.value = userInfo.avatar || ''
		showAvatarModal.value = true
	}

	const cancelAvatarModal = () => {
		showAvatarModal.value = false
	}

	const saveAvatar = async () => {
		const val = editAvatar.value.trim()
		if (!val) {
			uni.showToast({
				title: '头像URL不能为空',
				icon: 'none'
			})
			return
		}
		try {
			const res = await userApi.updateProfile({
				avatar: val
			})
			Object.assign(userInfo, res.data)
			showAvatarModal.value = false
			uni.showToast({
				title: '修改成功',
				icon: 'success'
			})
		} catch (err) {
			uni.showToast({
				title: err.msg || '修改失败',
				icon: 'none'
			})
		}
	}

	const handleNavTo = (type) => {
		uni.showToast({
			title: '功能开发中',
			icon: 'none'
		})
	}

	const handleLogout = () => {
		uni.showModal({
			title: '提示',
			content: '确定要退出登录吗？',
			success: async (res) => {
				if (res.confirm) {
					// try {
					//   await userApi.logout()
					// } catch (_) {
					//   // 即使接口失败也清除本地数据
					// }
					uni.removeStorageSync('token')
					isLoggedIn.value = false
					userInfo.id = 0
					userInfo.username = ''
					userInfo.avatar = ''
					userInfo.mobile = ''
					uni.showToast({
						title: '已退出登录',
						icon: 'none'
					})
				}
			}
		})
	}
</script>

<style>
	.mine-page {
		min-height: 100vh;
		background-color: #f5f5f5;
	}

	/* 未登录 */
	.login-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 160rpx;
	}

	.login-logo {
		width: 160rpx;
		height: 160rpx;
		border-radius: 80rpx;
		margin-bottom: 40rpx;
	}

	.login-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 16rpx;
	}

	.login-desc {
		font-size: 26rpx;
		color: #999;
		margin-bottom: 80rpx;
	}

	.agreement-wrapper {
		display: flex;
		align-items: center;
		margin-bottom: 32rpx;
	}

	.checkbox-icon {
		width: 36rpx;
		height: 36rpx;
		border: 2rpx solid #ccc;
		border-radius: 6rpx;
		margin-right: 12rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #fff;
	}

	.checkbox-icon.checked {
		background-color: #07c160;
		border-color: #07c160;
	}

	.check-mark {
		color: #fff;
		font-size: 24rpx;
		font-weight: bold;
	}

	.agreement-text {
		font-size: 26rpx;
		color: #666;
	}

	.wechat-login-btn {
		width: 80%;
		height: 88rpx;
		line-height: 88rpx;
		background-color: #07c160;
		color: #fff;
		font-size: 32rpx;
		border-radius: 12rpx;
		border: none;
		text-align: center;
	}

	.wechat-login-btn[disabled] {
		background-color: #a0d9b8;
	}

	/* 已登录 */
	.profile-container {
		padding-bottom: 40rpx;
	}

	.user-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 60rpx 0 40rpx;
		background: linear-gradient(135deg, #07c160, #05a04a);
		margin-bottom: 20rpx;
	}

	.avatar-wrapper {
		position: relative;
		margin-bottom: 20rpx;
	}

	.avatar {
		width: 140rpx;
		height: 140rpx;
		border-radius: 70rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.5);
		background-color: #eee;
	}

	.username-wrapper {
		display: flex;
		align-items: center;
	}

	.username {
		font-size: 34rpx;
		font-weight: bold;
		color: #fff;
	}

	.edit-tag {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.8);
		margin-left: 12rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.6);
		border-radius: 6rpx;
		padding: 2rpx 10rpx;
	}

	/* 功能菜单 */
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

	/* 退出登录 */
	.logout-section {
		padding: 40rpx 20rpx;
	}

	.logout-btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		background-color: #fff;
		color: #e74c3c;
		font-size: 30rpx;
		border-radius: 12rpx;
		border: 1rpx solid #ddd;
	}

	/* 弹窗 */
	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		width: 580rpx;
		background-color: #fff;
		border-radius: 16rpx;
		padding: 40rpx 30rpx 30rpx;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		text-align: center;
		margin-bottom: 30rpx;
	}

	.modal-input {
		border: 1rpx solid #ddd;
		border-radius: 8rpx;
		padding: 16rpx 20rpx;
		font-size: 28rpx;
		margin-bottom: 30rpx;
	}

	.modal-actions {
		display: flex;
		justify-content: space-between;
	}

	.modal-btn {
		width: 45%;
		height: 72rpx;
		line-height: 72rpx;
		font-size: 28rpx;
		border-radius: 8rpx;
		border: none;
		text-align: center;
	}

	.modal-btn.cancel {
		background-color: #f5f5f5;
		color: #666;
	}

	.modal-btn.confirm {
		background-color: #07c160;
		color: #fff;
	}
</style>
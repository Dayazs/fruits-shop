<template>
	<view class="page">
		<!-- ========== 头像卡片 ========== -->
		<view class="setting-card avatar-card">
			<text class="setting-label">头像</text>
			<view class="setting-right">
				<!-- WeChat 原生头像选择器：一步到位，点击头像直接弹出 -->
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseWechatAvatar">
					<image class="setting-avatar"
						:src="userInfo.avatar ? (IMG_BASE + userInfo.avatar) : '/static/logo.png'" mode="aspectFill">
					</image>
				</button>
				<!-- <text class="album-link" @tap.stop="handleAlbumPick">相册</text> -->
				<text class="setting-arrow">&#8250;</text>
			</view>
		</view>

		<!-- ========== 用户名称卡片 ========== -->
		<view class="setting-card account-card" @tap="handleNicknameTap">
			<text class="setting-label">用户名称</text>
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
	</view>
</template>

<script setup>
	import {
		ref,
		reactive
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		userApi,
		IMG_BASE
	} from '@/utils/api.js'

	const userInfo = reactive({
		id: 0,
		username: '',
		avatar: '',
		mobile: ''
	})

	onLoad(() => {
		fetchProfile()
	})

	const fetchProfile = async () => {
		try {
			const res = await userApi.getProfile()
			Object.assign(userInfo, res.data)
		} catch (err) {
			uni.showToast({
				title: '获取用户信息失败',
				icon: 'none'
			})
		}
	}

	// ─── 头像：WeChat chooseAvatar（一步到位） ───
	const onChooseWechatAvatar = async (e) => {
		const tempFilePath = e.detail.avatarUrl
		if (!tempFilePath) return
		uni.showLoading({
			title: '上传中...'
		})
		try {
			const res = await userApi.uploadAvatar(tempFilePath)
			userInfo.avatar = res.data.avatar
			uni.hideLoading()
			uni.showToast({
				title: '头像更新成功',
				icon: 'success'
			})
		} catch (err) {
			uni.hideLoading()
			uni.showToast({
				title: err.msg || '头像更新失败',
				icon: 'none'
			})
		}
	}

	// ─── 头像：从相册选择 ───
	// const handleAlbumPick = () => {
	//   uni.chooseImage({
	//     count: 1,
	//     sourceType: ['album'],
	//     success: async (chooseRes) => {
	//       uni.showLoading({ title: '上传中...' })
	//       try {
	//         const res = await userApi.uploadAvatar(chooseRes.tempFilePaths[0])
	//         userInfo.avatar = res.data.avatar
	//         uni.hideLoading()
	//         uni.showToast({ title: '头像更新成功', icon: 'success' })
	//       } catch (err) {
	//         uni.hideLoading()
	//         uni.showToast({ title: err.msg || '头像更新失败', icon: 'none' })
	//       }
	//     }
	//   })
	// }

	// ─── 用户名称：点击直接弹窗（一步到位） ───
	const handleNicknameTap = () => {
		uni.showModal({
			title: '设置用户名称',
			editable: true,
			placeholderText: userInfo.username || '请输入用户名称',
			success: async (modalRes) => {
				if (modalRes.confirm && modalRes.content) {
					const val = modalRes.content.trim()
					if (!val) {
						uni.showToast({
							title: '用户名称不能为空',
							icon: 'none'
						})
						return
					}
					try {
						const updateRes = await userApi.updateProfile({
							username: val
						})
						userInfo.username = updateRes.data.username
						uni.showToast({
							title: '名称更新成功',
							icon: 'success'
						})
					} catch (err) {
						uni.showToast({
							title: err.msg || '名称更新失败',
							icon: 'none'
						})
					}
				}
			}
		})
	}

	// ─── 地址管理 ───
	const handleAddressTap = () => {
		uni.navigateTo({
			url: '/pages/address/address'
		})
	}

	// ─── 退出登录 ───
	const handleLogout = () => {
		uni.showModal({
			title: '提示',
			content: '确定要退出登录吗？',
			success: (res) => {
				if (res.confirm) {
					uni.removeStorageSync('token')
					uni.showToast({
						title: '已退出登录',
						icon: 'none'
					})
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

	.avatar-btn {
		width: 98rpx;
		height: 98rpx;
		padding: 0;
		margin: 0;
		background: transparent;
		border: none;
		line-height: 1;
	}

	.avatar-btn::after {
		border: none;
	}

	.setting-avatar {
		width: 98rpx;
		height: 98rpx;
		border-radius: 50%;
		background-color: #eee;
		display: block;
	}

	/* .album-link {
  font-size: 22rpx;
  color: #09bb07;
  margin-left: 12rpx;
  padding: 6rpx 14rpx;
  border: 1rpx solid #09bb07;
  border-radius: 6rpx;
} */

	/* ========== 用户名称卡片 ========== */
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
</style>
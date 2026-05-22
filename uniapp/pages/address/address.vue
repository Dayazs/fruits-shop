<template>
	<view class="page">
		<!-- ========== 空状态 ========== -->
		<view v-if="addresses.length === 0 && !loading" class="empty-state">
			<text class="empty-text">还未添加地址</text>
		</view>

		<!-- ========== 地址列表 ========== -->
		<view v-else class="address-list">
			<view class="address-card" v-for="addr in addresses" :key="addr.id" @tap="handleEdit(addr)">
				<view class="card-left">
					<view class="card-header">
						<text class="card-name">{{ addr.receiver_name }}</text>
						<text class="card-mobile">{{ addr.receiver_mobile }}</text>
					</view>
					<text class="card-address">
						{{ addr.province }}-{{ addr.city }}-{{ addr.district }}-{{ addr.detail_address }}
					</text>
					<view v-if="addr.is_default === 1" class="default-tag">
						<text class="default-dot"></text>
						<text class="default-text">默认</text>
					</view>
				</view>
				<view class="card-right" @tap.stop="handleDelete(addr)">
					<text class="delete-btn">删除</text>
				</view>
			</view>
		</view>

		<!-- ========== 新增地址按钮 ========== -->
		<view class="bottom-bar">
			<button class="add-btn" @tap="handleAdd">新增地址</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import {
		onLoad,
		onShow
	} from '@dcloudio/uni-app'
	import {
		userApi
	} from '@/utils/api.js'

	const addresses = ref([])
	const loading = ref(true)

	onLoad(() => {
		fetchAddresses()
	})

	onShow(() => {
		fetchAddresses()
	})

	const fetchAddresses = async () => {
		loading.value = true
		try {
			const res = await userApi.getAddresses()
			addresses.value = res.data || []
		} catch (err) {
			uni.showToast({
				title: '加载地址失败',
				icon: 'none'
			})
		} finally {
			loading.value = false
		}
	}

	const handleAdd = () => {
		uni.navigateTo({
			url: '/pages/address-form/address-form'
		})
	}

	const handleEdit = (addr) => {
		uni.navigateTo({
			url: `/pages/address-form/address-form?id=${addr.id}`
		})
	}

	const handleDelete = (addr) => {
		uni.showModal({
			title: '提示',
			content: '确定要删除该地址吗？',
			success: async (res) => {
				if (res.confirm) {
					try {
						await userApi.deleteAddress(addr.id)
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						})
						fetchAddresses()
					} catch (err) {
						uni.showToast({
							title: err.msg || '删除失败',
							icon: 'none'
						})
					}
				}
			}
		})
	}
</script>

<style>
	.page {
		min-height: 100vh;
		background-color: #f5f5f5;
		padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
	}

	/* ========== 空状态 ========== */
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 300rpx;
	}

	.empty-text {
		font-size: 30rpx;
		color: #ccc;
	}

	/* ========== 地址卡片 ========== */
	.address-list {
		padding: 20rpx;
	}

	.address-card {
		display: flex;
		align-items: center;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 28rpx 24rpx;
		margin-bottom: 16rpx;
	}

	.card-left {
		flex: 1;
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		margin-bottom: 10rpx;
	}

	.card-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-right: 20rpx;
	}

	.card-mobile {
		font-size: 28rpx;
		color: #666;
	}

	.card-address {
		font-size: 26rpx;
		color: #999;
		line-height: 1.5;
	}

	.default-tag {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
	}

	.default-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background-color: #09bb07;
		margin-right: 8rpx;
	}

	.default-text {
		font-size: 22rpx;
		color: #09bb07;
	}

	.card-right {
		width: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.delete-btn {
		font-size: 25rpx;
		color: #e74c3c;
		font-weight: 300;
		line-height: 1;
	}

	/* ========== 底部按钮 ========== */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
		background-color: #fff;
		box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.04);
	}

	.add-btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		background-color: #09bb07;
		color: #fff;
		font-size: 32rpx;
		border-radius: 12rpx;
		border: none;
	}
</style>
<template>
	<view class="page">
		<view v-if="cartList.length > 0" class="stats-bar">
			<view class="select-all" @tap="toggleSelectAll">
				<view class="checkbox" :class="{ checked: isAllSelected }">
					<text v-if="isAllSelected" class="check-mark">&#10003;</text>
				</view>
				<text class="select-all-text">全选</text>
			</view>
			<text class="stats-text">
				共 {{ totalItems }} 件，已选 {{ selectedCount }} 件
			</text>
		</view>

		<view v-if="cartList.length > 0" class="stats-placeholder"></view>

		<view v-if="cartList.length > 0" class="cart-list">
			<view class="cart-item" v-for="item in cartList" :key="item.id">
				<view class="checkbox" :class="{ checked: selectedIds.has(item.id) }" @tap="toggleSelect(item.id)">
					<text v-if="selectedIds.has(item.id)" class="check-mark">&#10003;</text>
				</view>
				<image class="item-image" :src="IMG_BASE + getItemImage(item)" mode="aspectFill"></image>
				<view class="item-info">
					<text class="item-name">{{ item.fruits.name }}</text>
					<text class="item-spec">{{ item.fruit_skus.spec_name }}</text>
					<text class="item-price">&#165;{{ formatPrice(item.fruit_skus.price) }}</text>
				</view>
				<view class="item-actions">
					<view class="qty-row">
						<view class="qty-btn" :class="{ disabled: item.quantity <= 1 }" @tap="handleMinus(item)">
							<text class="qty-text">-</text>
						</view>
						<text class="qty-num">{{ item.quantity }}</text>
						<view class="qty-btn" @tap="handlePlus(item)">
							<text class="qty-text">+</text>
						</view>
					</view>
					<view class="bottom-row">
						<text class="item-subtotal">
							小计 &#165;{{ formatPrice(item.fruit_skus.price * item.quantity) }}
						</text>
						<button class="remove-btn" @tap="handleRemove(item)">删除</button>
					</view>
				</view>
			</view>
		</view>

		<view v-else-if="!loading" class="empty-state">
			<text class="empty-icon">&#128722;</text>
			<text class="empty-text">空空如也，去逛逛吧</text>
			<button class="go-shop-btn" @tap="handleGoShop">继续逛逛</button>
		</view>

		<view v-if="cartList.length > 0" class="settle-bar">
			<view class="settle-left">
				<text class="settle-label">合计：</text>
				<text class="settle-price">&#165;{{ formatPrice(selectedTotal) }}</text>
			</view>
			<button class="settle-btn" :class="{ disabled: selectedCount === 0 }" :disabled="selectedCount === 0"
				@tap="handleCheckout">
				结算
			</button>
		</view>
	</view>
	<CustomTabBar />
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue'
	import {
		onLoad,
		onShow
	} from '@dcloudio/uni-app'
	import CustomTabBar from '@/components/custom-tab-bar.vue'
	import {
		userApi,
		IMG_BASE
	} from '@/utils/api.js'
	import {
		refreshCartCount
	} from '@/stores/cart.js'

	const cartList = ref([])
	const loading = ref(true)
	const selectedIds = ref(new Set())

	const totalItems = computed(() =>
		cartList.value.reduce((sum, i) => sum + i.quantity, 0)
	)
	const selectedCount = computed(() =>
		cartList.value.filter(i => selectedIds.value.has(i.id)).reduce((sum, i) => sum + i.quantity, 0)
	)
	const selectedTotal = computed(() =>
		cartList.value.filter(i => selectedIds.value.has(i.id)).reduce((sum, i) => sum + Number(i.fruit_skus.price) * i
			.quantity, 0)
	)
	const isAllSelected = computed(() =>
		cartList.value.length > 0 && cartList.value.every(i => selectedIds.value.has(i.id))
	)

	onLoad(() => {
		fetchCartList()
	})
	onShow(() => {
		fetchCartList()
	})

	const fetchCartList = async () => {
		try {
			const token = uni.getStorageSync('token')
			if (!token) {
				cartList.value = [];
				loading.value = false;
				return
			}
			const res = await userApi.getCartList()
			cartList.value = res.data || []
			refreshCartCount()
			const validIds = new Set(cartList.value.map(i => i.id))
			for (const id of selectedIds.value) {
				if (!validIds.has(id)) selectedIds.value.delete(id)
			}
		} catch (err) {
			cartList.value = []
		} finally {
			loading.value = false
		}
	}

	function getItemImage(item) {
		return item.fruit_skus.image || item.fruits.main_image || ''
	}

	function formatPrice(val) {
		if (val === null || val === undefined) return '--'
		const num = Number(val)
		return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2)
	}

	function toggleSelect(id) {
		if (selectedIds.value.has(id)) selectedIds.value.delete(id)
		else selectedIds.value.add(id)
		selectedIds.value = new Set(selectedIds.value)
	}

	function toggleSelectAll() {
		if (isAllSelected.value) selectedIds.value = new Set()
		else selectedIds.value = new Set(cartList.value.map(i => i.id))
	}

	const handlePlus = async (item) => {
		const newQty = item.quantity + 1
		try {
			await userApi.updateCartQuantity(item.id, {
				quantity: newQty
			})
			item.quantity = newQty
			refreshCartCount()
		} catch (err) {
			uni.showToast({
				title: err.msg || '更新失败',
				icon: 'none'
			})
		}
	}
	const handleMinus = async (item) => {
		if (item.quantity <= 1) return
		const newQty = item.quantity - 1
		try {
			await userApi.updateCartQuantity(item.id, {
				quantity: newQty
			})
			item.quantity = newQty
			refreshCartCount()
		} catch (err) {
			uni.showToast({
				title: err.msg || '更新失败',
				icon: 'none'
			})
		}
	}
	const handleRemove = (item) => {
		uni.showModal({
			title: '提示',
			content: '确定要移出该商品吗？',
			success: async (res) => {
				if (res.confirm) {
					try {
						await userApi.removeFromCart(item.id)
						selectedIds.value.delete(item.id)
						selectedIds.value = new Set(selectedIds.value)
						cartList.value = cartList.value.filter(c => c.id !== item.id)
						refreshCartCount()
						uni.showToast({
							title: '已移出',
							icon: 'success'
						})
					} catch (err) {
						uni.showToast({
							title: err.msg || '操作失败',
							icon: 'none'
						})
					}
				}
			}
		})
	}
	const handleCheckout = () => {
		uni.showToast({
			title: '功能开发中',
			icon: 'none'
		})
	}
	const handleGoShop = () => {
		uni.switchTab({
			url: '/pages/category/category'
		})
	}
</script>

<style>
	.page {
		min-height: 100vh;
		background-color: #f5f5f5;
		padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
	}

	.stats-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: 20rpx 30rpx;
		background-color: #fff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.stats-placeholder {
		height: 76rpx;
	}

	.select-all {
		display: flex;
		align-items: center;
	}

	.select-all-text {
		font-size: 26rpx;
		color: #333;
		margin-left: 10rpx;
	}

	.stats-text {
		font-size: 26rpx;
		color: #666;
	}

	.cart-list {
		padding: 20rpx;
	}

	.cart-item {
		display: flex;
		align-items: center;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 20rpx;
		margin-bottom: 16rpx;
	}

	.checkbox {
		width: 40rpx;
		height: 40rpx;
		border: 3rpx solid #ccc;
		border-radius: 50%;
		margin-right: 16rpx;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.checkbox.checked {
		background-color: #09bb07;
		border-color: #09bb07;
	}

	.check-mark {
		color: #fff;
		font-size: 22rpx;
		font-weight: bold;
		line-height: 1;
	}

	.item-image {
		width: 160rpx;
		height: 160rpx;
		border-radius: 8rpx;
		flex-shrink: 0;
		background-color: #f5f5f5;
	}

	.item-info {
		flex: 1;
		padding: 0 16rpx;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.item-name {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-bottom: 6rpx;
	}

	.item-spec {
		font-size: 24rpx;
		color: #999;
		margin-bottom: 6rpx;
	}

	.item-price {
		font-size: 28rpx;
		color: #e74c3c;
		font-weight: bold;
	}

	.item-actions {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12rpx;
	}

	.qty-row {
		display: flex;
		align-items: center;
	}

	.qty-btn {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		background-color: #f5f5f5;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.qty-btn.disabled {
		opacity: 0.4;
	}

	.qty-text {
		font-size: 32rpx;
		color: #333;
		line-height: 1;
	}

	.qty-num {
		font-size: 30rpx;
		color: #333;
		font-weight: bold;
		margin: 0 16rpx;
		min-width: 40rpx;
		text-align: center;
	}

	.bottom-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-top: 35rpx;
		gap: 12rpx;
	}

	.item-subtotal {
		font-size: 22rpx;
		color: #e74c3c;
		white-space: nowrap;
	}

	.remove-btn {
		padding: 4rpx 16rpx;
		font-size: 22rpx;
		color: #999;
		background-color: #f5f5f5;
		border: 1rpx solid #e0e0e0;
		border-radius: 8rpx;
		line-height: 1.4;
	}

	.remove-btn::after {
		border: none;
	}

	.settle-bar {
		position: fixed;
		bottom: calc(100rpx + env(safe-area-inset-bottom));
		left: 0;
		right: 0;
		height: 100rpx;
		background-color: #fff;
		display: flex;
		align-items: center;
		padding: 0 30rpx;
		box-sizing: border-box;
		border-top: 1rpx solid #eee;
		z-index: 100;
	}

	.settle-left {
		display: flex;
		align-items: baseline;
	}

	.settle-label {
		font-size: 28rpx;
		color: #333;
	}

	.settle-price {
		font-size: 34rpx;
		font-weight: bold;
		color: #e74c3c;
	}

	.settle-btn {
		width: 180rpx;
		height: 70rpx;
		line-height: 70rpx;
		background-color: #09bb07;
		color: #fff;
		font-size: 30rpx;
		border-radius: 12rpx;
		border: none;
		margin-left: auto;
	}

	.settle-btn.disabled {
		background-color: #a0d9b8;
		margin-right: 20rpx;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 260rpx;
	}

	.empty-icon {
		font-size: 100rpx;
		margin-bottom: 24rpx;
	}

	.empty-text {
		font-size: 30rpx;
		color: #999;
		margin-bottom: 48rpx;
	}

	.go-shop-btn {
		width: 360rpx;
		height: 80rpx;
		line-height: 80rpx;
		background-color: #09bb07;
		color: #fff;
		font-size: 30rpx;
		border-radius: 12rpx;
		border: none;
	}
</style>
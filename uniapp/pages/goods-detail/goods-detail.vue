<template>
	<view class="page" v-if="goods">
		<!-- ========== 顶部轮播图 ========== -->
		<swiper class="banner-swiper" :indicator-dots="imageList.length > 1" :autoplay="false" :circular="true"
			indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#ffffff">
			<swiper-item v-for="(img, idx) in imageList" :key="idx">
				<image :src="IMG_BASE + img" mode="aspectFill" class="banner-image"></image>
			</swiper-item>
		</swiper>

		<!-- ========== 商品信息 ========== -->
		<view class="info-section">
			<view class="info-header">
				<text class="goods-name">{{ goods.name }}</text>
				<view class="price-area">
					<text class="price-current">&#165;{{ formatPrice(selectedSku.price) }}</text>
					<text v-if="selectedSku.original_price" class="price-original">
						&#165;{{ formatPrice(selectedSku.original_price) }}
					</text>
				</view>
			</view>
			<text class="goods-desc" v-if="goods.description">{{ goods.description }}</text>
		</view>

		<!-- ========== SKU 规格 ========== -->
		<view class="sku-section">
			<text class="sku-title">规格</text>
			<view class="sku-list">
				<view class="sku-row" :class="{ active: selectedSku.id === sku.id, disabled: sku.stock === 0 }"
					v-for="sku in visibleSkus" :key="sku.id" @tap="handleSkuChange(sku)">
					<view class="sku-left">
						<text class="sku-spec">{{ sku.spec_name }}</text>
						<text class="sku-stock">库存：{{ sku.stock }}</text>
					</view>
					<view class="sku-right">
						<text class="sku-price">&#165;{{ formatPrice(sku.price) }}</text>
						<text v-if="sku.original_price" class="sku-original">
							&#165;{{ formatPrice(sku.original_price) }}
						</text>
					</view>
				</view>
			</view>
			<view v-if="goods.skus.length > 4" class="more-row" @tap="showAllSkus = !showAllSkus">
				<text class="more-text">{{ showAllSkus ? '收起' : '更多' }}</text>
			</view>
		</view>

		<!-- ========== 底部操作栏 ========== -->
		<view class="bottom-bar">
			<button class="btn-cart" @tap="handleAddToCart">加入购物车</button>
			<button class="btn-buy" @tap="handleBuyNow">立刻购买</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		homeApi,
		userApi,
		IMG_BASE
	} from '@/utils/api.js'

	const goods = ref(null)
	const selectedSku = ref({})
	const showAllSkus = ref(false)

	const imageList = computed(() => {
		if (!goods.value) return []
		let images = []
		try {
			images = goods.value.images ? JSON.parse(goods.value.images) : []
		} catch (_) {
			images = []
		}
		if (images.length === 0 && goods.value.main_image) {
			images = [goods.value.main_image]
		}
		return images
	})

	const visibleSkus = computed(() => {
		if (!goods.value) return []
		if (showAllSkus.value || goods.value.skus.length <= 4) {
			return goods.value.skus
		}
		return goods.value.skus.slice(0, 4)
	})

	onLoad((options) => {
		if (options && options.id) {
			loadDetail(parseInt(options.id))
		}
	})

	const loadDetail = async (id) => {
		try {
			const res = await homeApi.getGoodsDetail(id)
			goods.value = res.data
			if (res.data.skus && res.data.skus.length > 0) {
				// 默认选中第一个有库存的 SKU
				const firstInStock = res.data.skus.find(s => s.stock > 0)
				selectedSku.value = firstInStock || res.data.skus[0]
			}
		} catch (err) {
			uni.showToast({
				title: err.msg || '加载失败',
				icon: 'none'
			})
		}
	}

	function formatPrice(val) {
		if (val === null || val === undefined) return '--'
		const num = Number(val)
		return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2)
	}

	const handleSkuChange = (sku) => {
		if (sku.stock === 0) return
		selectedSku.value = sku
	}

	const handleAddToCart = async () => {
		if (!selectedSku.value.id) {
			uni.showToast({
				title: '请选择规格',
				icon: 'none'
			})
			return
		}
		try {
			await userApi.addToCart({
				fruit_id: goods.value.id,
				sku_id: selectedSku.value.id
			})
			uni.showToast({
				title: '已加入购物车',
				icon: 'success'
			})
		} catch (err) {
			uni.showToast({
				title: err.msg || '添加失败',
				icon: 'none'
			})
		}
	}

	const handleBuyNow = () => {
		uni.showToast({
			title: '功能开发中',
			icon: 'none'
		})
	}
</script>

<style>
	.page {
		min-height: 100vh;
		background-color: #f5f5f5;
		padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
	}

	/* ========== 轮播图 ========== */
	.banner-swiper {
		width: 750rpx;
		height: 440rpx;
	}

	.banner-image {
		width: 750rpx;
		height: 440rpx;
	}

	/* ========== 商品信息 ========== */
	.info-section {
		background-color: #fff;
		padding: 24rpx 30rpx;
		margin-bottom: 16rpx;
	}

	.info-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.goods-name {
		flex: 1;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-right: 20rpx;
	}

	.price-area {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.price-current {
		font-size: 34rpx;
		font-weight: bold;
		color: #e74c3c;
	}

	.price-original {
		font-size: 24rpx;
		color: #999;
		text-decoration: line-through;
		margin-top: 4rpx;
	}

	.goods-desc {
		font-size: 26rpx;
		color: #999;
		margin-top: 16rpx;
		line-height: 1.5;
	}

	/* ========== SKU 规格 ========== */
	.sku-section {
		background-color: #fff;
		padding: 24rpx 30rpx;
		margin-bottom: 16rpx;
	}

	.sku-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		display: block;
	}

	.sku-list {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.sku-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16rpx 20rpx;
		background-color: #f5f5f5;
		border-radius: 8rpx;
		border: 2rpx solid transparent;
		box-sizing: border-box;
	}

	.sku-row.active {
		background-color: rgba(9, 187, 7, 0.08);
		border-color: #09bb07;
	}

	.sku-row.disabled {
		opacity: 0.4;
	}

	.sku-left {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}

	.sku-spec {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
	}

	.sku-row.active .sku-spec {
		color: #09bb07;
		font-weight: bold;
	}

	.sku-stock {
		font-size: 22rpx;
		color: #999;
	}

	.sku-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4rpx;
	}

	.sku-price {
		font-size: 28rpx;
		color: #e74c3c;
		font-weight: bold;
	}

	.sku-original {
		font-size: 22rpx;
		color: #999;
		text-decoration: line-through;
	}

	.more-row {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16rpx 0 0;
	}

	.more-text {
		font-size: 26rpx;
		color: #09bb07;
	}

	/* ========== 底部操作栏 ========== */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 180rpx;
		background-color: #fff;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 0 30rpx;
		gap: 20rpx;
		box-sizing: border-box;
		border-top: 1rpx solid #eee;
		z-index: 100;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.btn-cart {
		width: 200rpx;
		height: 70rpx;
		line-height: 70rpx;
		background-color: #fff;
		color: #09bb07;
		font-size: 28rpx;
		border-radius: 12rpx;
		border: 2rpx solid #09bb07;
	}

	.btn-buy {
		width: 200rpx;
		height: 70rpx;
		line-height: 70rpx;
		background-color: #09bb07;
		color: #fff;
		font-size: 28rpx;
		border-radius: 12rpx;
		border: none;
	}
</style>
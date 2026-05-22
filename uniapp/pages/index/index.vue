<template>
	<view class="page">
		<!-- ========== 轮播图 ========== -->
		<swiper class="banner-swiper" :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500"
			:circular="true" indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#ffffff">
			<swiper-item v-for="banner in banners" :key="banner.id">
				<image :src="IMG_BASE + banner.image_url" mode="aspectFill" class="banner-image"></image>
			</swiper-item>
		</swiper>

		<!-- ========== 分类模块 ========== -->
		<view class="category-section" v-if="categories.length > 0">
			<view class="category-list">
				<view class="category-item" v-for="cat in categories" :key="cat.id" @tap="handleCategoryTap(cat)">
					<view class="category-img-wrapper">
						<view class="category-circle"></view>
						<image :src="IMG_BASE + cat.image" mode="aspectFit" class="category-img"></image>
					</view>
					<text class="category-name">{{ cat.name }}</text>
				</view>
			</view>
		</view>

		<!-- ========== 底部占位提示 ========== -->
		<view class="placeholder">
			<text class="placeholder-text">更多内容即将上线</text>
		</view>
	</view>
	<CustomTabBar />
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import CustomTabBar from '@/components/custom-tab-bar.vue'
	import {
		homeApi,
		IMG_BASE
	} from '@/utils/api.js'

	const banners = ref([])
	const categories = ref([])

	onLoad(async () => {
		try {
			const [bannerRes, cateRes] = await Promise.all([
				homeApi.getBanners(),
				homeApi.getCategories()
			])
			banners.value = bannerRes.data || []
			const rawCategories = cateRes.data || []
			rawCategories.sort((a, b) => a.sort_order - b.sort_order)
			categories.value = rawCategories.slice(0, 4)
		} catch (err) {
			console.error('首页数据加载失败', err)
		}
	})

	const handleCategoryTap = (cat) => {
		uni.showToast({
			title: cat.name,
			icon: 'none'
		})
	}
</script>

<style>
	.page {
		min-height: 100vh;
		background-color: #f5f5f5;
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

	/* ========== 分类模块 ========== */
	.category-section {
		width: 750rpx;
		height: 216rpx;
		background-color: #fff;
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.category-list {
		display: flex;
		width: 750rpx;
		padding: 0 20rpx;
		box-sizing: border-box;
	}

	.category-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.category-img-wrapper {
		position: relative;
		width: 100rpx;
		height: 120rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8rpx;
	}

	.category-circle {
		position: absolute;
		width: 75rpx;
		height: 75rpx;
		border-radius: 50%;
		background-color: #82c77c;
		/* 圆形偏下 */
		top: 20%;
		left: 50%;
		transform: translate(-50%, 10%);
	}

	.category-img {
		position: relative;
		z-index: 1;
		width: 80rpx;
		height: 80rpx;
	}

	.category-name {
		font-size: 24rpx;
		color: #333;
	}

	/* ========== 占位 ========== */
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 60rpx 0;
	}

	.placeholder-text {
		font-size: 26rpx;
		color: #ccc;
	}
</style>
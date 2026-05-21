<template>
	<view class="custom-tab-bar">
		<view v-for="(item, index) in tabList" :key="index" class="tab-item" @tap="handleSwitchTab(index)">
			<image :src="currentIndex === index ? item.activeIcon : item.icon" class="tab-icon" mode="aspectFit">
			</image>
			<text class="tab-text"
				:style="{ color: currentIndex === index ? activeColor : color }">{{ item.text }}</text>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
	} from 'vue'
	import {
		onShow
	} from '@dcloudio/uni-app'

	const currentIndex = ref(0)
	const color = '#999999'
	const activeColor = '#09bb07'

	const tabList = [{
			text: '首页',
			icon: '/static/icons/home_page.svg',
			activeIcon: '/static/icons/home_page_on.svg',
			pagePath: '/pages/index/index'
		},
		{
			text: '分类',
			icon: '/static/icons/class.svg',
			activeIcon: '/static/icons/class_on.svg',
			pagePath: '/pages/category/category'
		},
		{
			text: '购物车',
			icon: '/static/icons/shopping_trolley.svg',
			activeIcon: '/static/icons/shopping_trolley_on.svg',
			pagePath: '/pages/cart/cart'
		},
		{
			text: '我的',
			icon: '/static/icons/me.svg',
			activeIcon: '/static/icons/me_on.svg',
			pagePath: '/pages/mine/mine'
		}
	]

	function updateCurrentIndex() {
		const pages = getCurrentPages()
		if (pages.length > 0) {
			const currentRoute = '/' + pages[pages.length - 1].route
			const idx = tabList.findIndex(item => item.pagePath === currentRoute)
			if (idx !== -1) {
				currentIndex.value = idx
			}
		}
	}

	function handleSwitchTab(index) {
		const target = tabList[index]
		uni.switchTab({
			url: target.pagePath,
			success: () => {
				currentIndex.value = index
			}
		})
	}

	// 页面显示时更新
	onShow(() => {
		updateCurrentIndex()
	})

	// 初始化
	updateCurrentIndex()
</script>

<style>
	.custom-tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 100rpx;
		background-color: #ffffff;
		display: flex;
		justify-content: space-around;
		align-items: center;
		border-top: 1rpx solid #eee;
		padding-bottom: env(safe-area-inset-bottom);
		z-index: 999;
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		height: 100%;
	}

	.tab-icon {
		width: 44rpx;
		height: 44rpx;
		margin-bottom: 4rpx;
	}

	.tab-text {
		font-size: 20rpx;
		line-height: 1;
	}
</style>
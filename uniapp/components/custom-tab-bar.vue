<template>
  <view class="custom-tab-bar">
    <view
      v-for="(item, index) in tabList"
      :key="index"
      class="tab-item"
      @tap="handleSwitchTab(index)"
    >
      <view class="tab-icon-wrap">
        <image
          :src="currentIndex === index ? item.activeIcon : item.icon"
          class="tab-icon"
          mode="aspectFit"
        ></image>
        <view v-if="item.hasBadge && cartCount > 0" class="tab-badge">
          <text class="badge-text">{{ cartCount > 99 ? '99+' : cartCount }}</text>
        </view>
      </view>
      <text
        class="tab-text"
        :style="{ color: currentIndex === index ? activeColor : color }"
      >{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { cartCount, refreshCartCount } from '@/stores/cart.js'

const currentIndex = ref(0)
const color = '#999999'
const activeColor = '#09bb07'

const tabList = [
  {
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
    pagePath: '/pages/cart/cart',
    hasBadge: true
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
  uni.switchTab({ url: target.pagePath })
}

onMounted(() => {
  updateCurrentIndex()
  refreshCartCount()
})

onShow(() => {
  updateCurrentIndex()
})
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

.tab-icon-wrap {
  position: relative;
}

.tab-icon {
  width: 44rpx;
  height: 44rpx;
  margin-bottom: 4rpx;
}

.tab-badge {
  position: absolute;
  top: -10rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #e74c3c;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}

.badge-text {
  font-size: 18rpx;
  color: #fff;
  line-height: 1;
}

.tab-text {
  font-size: 20rpx;
  line-height: 1;
}
</style>

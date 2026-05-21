<template>
  <view class="page">
    <text class="title">分类</text>
    <text class="subtitle">商品分类将在这里展示</text>
  </view>
  <CustomTabBar />
</template>

<script setup>
import CustomTabBar from '@/components/custom-tab-bar.vue'
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}
.subtitle {
  font-size: 28rpx;
  color: #999;
  margin-top: 16rpx;
}
</style>

<template>
  <view class="page">
    <text class="title">水果商城</text>
    <text class="subtitle">新鲜水果，每日直达</text>
  </view>
</template>

<script>
export default {
  name: 'HomePage'
}
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

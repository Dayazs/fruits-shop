<template>
  <view class="page">
    <!-- ========== 购物车列表 ========== -->
    <view v-if="cartList.length > 0" class="cart-list">
      <view class="cart-item" v-for="item in cartList" :key="item.id">
        <!-- 左侧图片 -->
        <image
          class="item-image"
          :src="IMG_BASE + getItemImage(item)"
          mode="aspectFill"
        ></image>

        <!-- 中间信息 -->
        <view class="item-info">
          <text class="item-name">{{ item.fruits.name }}</text>
          <text class="item-spec">{{ item.fruit_skus.spec_name }}</text>
          <text class="item-price">¥{{ formatPrice(item.fruit_skus.price) }}</text>
        </view>

        <!-- 右侧操作 -->
        <view class="item-actions">
          <!-- 数量控制 -->
          <view class="qty-row">
            <view
              class="qty-btn"
              :class="{ disabled: item.quantity <= 1 }"
              @tap="handleMinus(item)"
            >
              <text class="qty-text">−</text>
            </view>
            <text class="qty-num">{{ item.quantity }}</text>
            <view class="qty-btn" @tap="handlePlus(item)">
              <text class="qty-text">+</text>
            </view>
          </view>
          <!-- 小计 -->
          <text class="item-subtotal">
            小计 ¥{{ formatPrice(item.fruit_skus.price * item.quantity) }}
          </text>
          <!-- 删除 -->
          <view class="delete-btn" @tap="handleRemove(item)">
            <text class="delete-text">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 空状态 ========== -->
    <view v-else-if="!loading" class="empty-state">
      <text class="empty-icon">&#128722;</text>
      <text class="empty-text">空空如也，去逛逛吧</text>
      <button class="go-shop-btn" @tap="handleGoShop">继续逛逛</button>
    </view>
  </view>
  <CustomTabBar />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CustomTabBar from '@/components/custom-tab-bar.vue'
import { userApi, IMG_BASE } from '@/utils/api.js'

const cartList = ref([])
const loading = ref(true)

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
      cartList.value = []
      loading.value = false
      return
    }
    const res = await userApi.getCartList()
    cartList.value = res.data || []
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

// ─── 加号：传入当前数量 + 1 ───
const handlePlus = async (item) => {
  const newQty = item.quantity + 1
  try {
    await userApi.updateCartQuantity(item.id, { quantity: newQty })
    item.quantity = newQty
  } catch (err) {
    uni.showToast({ title: err.msg || '更新失败', icon: 'none' })
  }
}

// ─── 减号：传入当前数量 - 1（最少为 1） ───
const handleMinus = async (item) => {
  if (item.quantity <= 1) return
  const newQty = item.quantity - 1
  try {
    await userApi.updateCartQuantity(item.id, { quantity: newQty })
    item.quantity = newQty
  } catch (err) {
    uni.showToast({ title: err.msg || '更新失败', icon: 'none' })
  }
}

// ─── 删除 ───
const handleRemove = (item) => {
  uni.showModal({
    title: '提示',
    content: '确定要移出该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await userApi.removeFromCart(item.id)
          cartList.value = cartList.value.filter(c => c.id !== item.id)
          uni.showToast({ title: '已移出', icon: 'success' })
        } catch (err) {
          uni.showToast({ title: err.msg || '操作失败', icon: 'none' })
        }
      }
    }
  })
}

const handleGoShop = () => {
  uni.switchTab({ url: '/pages/category/category' })
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
}

/* ========== 购物车列表 ========== */
.cart-list {
  padding: 20rpx;
}
.cart-item {
  display: flex;
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
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

/* ========== 右侧操作区 ========== */
.item-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
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
.item-subtotal {
  font-size: 24rpx;
  color: #e74c3c;
  margin-top: 8rpx;
}
.delete-btn {
  margin-top: 8rpx;
}
.delete-text {
  font-size: 22rpx;
  color: #999;
}

/* ========== 空状态 ========== */
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

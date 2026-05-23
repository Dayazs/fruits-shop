<template>
  <view class="page">
    <!-- ========== 收货地址 ========== -->
    <view class="section">
      <text class="section-title">收货地址</text>
      <view v-if="selectedAddress" class="address-card" @tap="handleSelectAddress">
        <view class="addr-top">
          <text class="addr-name">{{ selectedAddress.receiver_name }}</text>
          <text class="addr-mobile">{{ selectedAddress.receiver_mobile }}</text>
          <text v-if="selectedAddress.is_default === 1" class="addr-default">默认</text>
        </view>
        <text class="addr-detail">
          {{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail_address }}
        </text>
      </view>
      <view v-else class="no-address" @tap="handleAddAddress">
        <text class="no-addr-text">请选择收货地址</text>
        <text class="no-addr-arrow">&#8250;</text>
      </view>
    </view>

    <!-- ========== 订单商品 ========== -->
    <view class="section">
      <text class="section-title">订单商品</text>
      <view class="goods-item" v-for="item in orderItems" :key="item.id">
        <image :src="IMG_BASE + getItemImage(item)" mode="aspectFill" class="goods-img"></image>
        <view class="goods-info">
          <text class="goods-name">{{ item.fruits.name }}</text>
          <text class="goods-spec">{{ item.fruit_skus.spec_name }}</text>
          <view class="goods-bottom">
            <text class="goods-price">&#165;{{ formatPrice(item.fruit_skus.price) }}</text>
            <text class="goods-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 提交/支付 ========== -->
    <view class="bottom-bar">
      <view class="bar-summary">
        <text class="summary-label">合计：</text>
        <text class="summary-price">&#165;{{ formatPrice(totalPrice) }}</text>
      </view>
      <button v-if="!orderCreated" class="submit-btn" @tap="handleSubmit">提交订单</button>
      <button v-else class="pay-btn" @tap="handlePay">立即支付</button>
    </view>

    <!-- ========== 地址选择器弹窗 ========== -->
    <view v-if="showAddressPicker" class="picker-mask" @tap="showAddressPicker = false">
      <view class="picker-panel" @tap.stop>
        <text class="picker-title">选择收货地址</text>
        <scroll-view class="picker-list" scroll-y>
          <view
            class="picker-item"
            :class="{ active: selectedAddress?.id === addr.id }"
            v-for="addr in addresses"
            :key="addr.id"
            @tap="handlePickAddress(addr)"
          >
            <view class="pick-top">
              <text class="pick-name">{{ addr.receiver_name }}</text>
              <text class="pick-mobile">{{ addr.receiver_mobile }}</text>
            </view>
            <text class="pick-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail_address }}</text>
            <view v-if="addr.id === selectedAddress?.id" class="pick-check">&#10003;</view>
          </view>
        </scroll-view>
        <button class="add-addr-btn" @tap="handleAddAddress">新增地址</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { userApi, orderApi, IMG_BASE } from '@/utils/api.js'
import { refreshCartCount } from '@/stores/cart.js'

const cartIds = ref([])
const orderItems = ref([])
const addresses = ref([])
const selectedAddress = ref(null)
const showAddressPicker = ref(false)
const orderCreated = ref(false)
const orderId = ref(null)

const totalPrice = computed(() =>
  orderItems.value.reduce((s, i) => s + Number(i.fruit_skus.price) * i.quantity, 0)
)

onLoad(async (options) => {
  if (options && options.ids) {
    cartIds.value = options.ids.split(',').map(Number)
    await loadData()
  }
})

onShow(async () => {
  // 从新增地址页返回时刷新地址列表
  if (cartIds.value.length > 0) {
    const addrRes = await userApi.getAddresses()
    const list = addrRes.data || []
    addresses.value = list
    if (!selectedAddress.value && list.length > 0) {
      selectedAddress.value = list.find(a => a.is_default === 1) || list[0]
    } else if (selectedAddress.value) {
      const updated = list.find(a => a.id === selectedAddress.value.id)
      selectedAddress.value = updated || list.find(a => a.is_default === 1) || list[0] || null
    }
  }
})

const loadData = async () => {
  uni.showLoading({ title: '加载中...' })
  try {
    const [cartRes, addrRes] = await Promise.all([
      userApi.getCartList(),
      userApi.getAddresses()
    ])
    const allCart = cartRes.data || []
    orderItems.value = allCart.filter(i => cartIds.value.includes(i.id))
    addresses.value = addrRes.data || []
    if (addresses.value.length > 0) {
      selectedAddress.value = addresses.value.find(a => a.is_default === 1) || addresses.value[0]
    }
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
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

const handleSelectAddress = () => {
  showAddressPicker.value = true
}

const handlePickAddress = (addr) => {
  selectedAddress.value = addr
  showAddressPicker.value = false
}

const handleAddAddress = () => {
  showAddressPicker.value = false
  uni.navigateTo({ url: '/pages/address-form/address-form' })
}

const handleSubmit = async () => {
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    const res = await orderApi.createOrder({
      cart_ids: cartIds.value,
      address_id: selectedAddress.value.id
    })
    orderId.value = res.data.id
    orderCreated.value = true
    refreshCartCount()
    uni.hideLoading()
    uni.showToast({ title: '订单已创建', icon: 'success' })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: err.msg || '提交失败', icon: 'none' })
  }
}

const handlePay = async () => {
  uni.showLoading({ title: '支付中...' })
  try {
    // 获取 openid
    const profileRes = await userApi.getProfile()
    const openid = profileRes.data.openid
    if (!openid) {
      uni.hideLoading()
      uni.showToast({ title: '获取openid失败', icon: 'none' })
      return
    }
    // 获取支付参数
    const payRes = await orderApi.payOrder({ order_id: orderId.value, openid })
    const payData = payRes.data
    uni.hideLoading()

    // 拉起微信支付
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payData.timeStamp,
      nonceStr: payData.nonceStr,
      package: payData.package,
      signType: payData.signType || 'RSA',
      paySign: payData.paySign,
      success: () => {
        uni.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/order-list/order-list?status=1' })
        }, 1000)
      },
      fail: (err) => {
        // 开发环境模拟支付结果
        if (err.errMsg.includes('cancel')) {
          uni.showToast({ title: '支付已取消', icon: 'none' })
        } else {
          uni.showModal({
            title: '模拟支付',
            content: '开发环境模拟：支付成功？',
            confirmText: '成功',
            cancelText: '失败',
            success: (r) => {
              if (r.confirm) {
                uni.showToast({ title: '支付成功', icon: 'success' })
                setTimeout(() => {
                  uni.redirectTo({ url: '/pages/order-list/order-list?status=1' })
                }, 1000)
              } else {
                uni.showToast({ title: '支付失败', icon: 'none' })
              }
            }
          })
        }
      }
    })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: err.msg || '支付失败', icon: 'none' })
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #f5f5f5; padding-bottom: calc(120rpx + env(safe-area-inset-bottom)); }

.section { background-color: #fff; margin-bottom: 16rpx; padding: 24rpx 30rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; display: block; }

/* 地址卡片 */
.address-card { background-color: #f9f9f9; border-radius: 8rpx; padding: 20rpx; }
.addr-top { display: flex; align-items: center; margin-bottom: 8rpx; }
.addr-name { font-size: 30rpx; font-weight: bold; color: #333; margin-right: 16rpx; }
.addr-mobile { font-size: 28rpx; color: #666; flex: 1; }
.addr-default { font-size: 20rpx; color: #09bb07; border: 1rpx solid #09bb07; border-radius: 4rpx; padding: 2rpx 8rpx; }
.addr-detail { font-size: 26rpx; color: #666; line-height: 1.4; }
.no-address { display: flex; align-items: center; justify-content: space-between; background-color: #f9f9f9; border-radius: 8rpx; padding: 30rpx 20rpx; }
.no-addr-text { font-size: 28rpx; color: #999; }
.no-addr-arrow { font-size: 32rpx; color: #ccc; }

/* 商品 */
.goods-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.goods-item:last-child { border-bottom: none; }
.goods-img { width: 120rpx; height: 120rpx; border-radius: 8rpx; flex-shrink: 0; background-color: #f5f5f5; }
.goods-info { flex: 1; margin-left: 16rpx; }
.goods-name { font-size: 28rpx; font-weight: bold; color: #333; display: block; margin-bottom: 4rpx; }
.goods-spec { font-size: 24rpx; color: #999; display: block; margin-bottom: 4rpx; }
.goods-bottom { display: flex; align-items: center; justify-content: space-between; }
.goods-price { font-size: 28rpx; color: #e74c3c; font-weight: bold; }
.goods-qty { font-size: 26rpx; color: #999; }

/* 底部栏 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 100rpx; background-color: #fff; display: flex; align-items: center; justify-content: flex-end; padding: 0 30rpx; gap: 16rpx; box-sizing: border-box; border-top: 1rpx solid #eee; z-index: 100; padding-bottom: env(safe-area-inset-bottom); }
.bar-summary { display: flex; align-items: baseline; }
.summary-label { font-size: 28rpx; color: #333; }
.summary-price { font-size: 34rpx; font-weight: bold; color: #e74c3c; margin-right: auto; }
.submit-btn { width: 200rpx; height: 70rpx; line-height: 70rpx; background-color: #09bb07; color: #fff; font-size: 28rpx; border-radius: 12rpx; border: none; }
.pay-btn { width: 200rpx; height: 70rpx; line-height: 70rpx; background-color: #e74c3c; color: #fff; font-size: 28rpx; border-radius: 12rpx; border: none; }

/* 地址选择弹窗 */
.picker-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: flex-end; }
.picker-panel { width: 750rpx; max-height: 70vh; background-color: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; display: flex; flex-direction: column; }
.picker-title { font-size: 32rpx; font-weight: bold; color: #333; text-align: center; margin-bottom: 20rpx; }
.picker-list { flex: 1; max-height: 400rpx; }
.picker-item { position: relative; padding: 24rpx 20rpx; border-bottom: 1rpx solid #f0f0f0; }
.picker-item.active { background-color: rgba(9,187,7,0.05); }
.pick-top { display: flex; align-items: center; margin-bottom: 6rpx; }
.pick-name { font-size: 30rpx; font-weight: bold; color: #333; margin-right: 16rpx; }
.pick-mobile { font-size: 26rpx; color: #666; }
.pick-detail { font-size: 24rpx; color: #999; }
.pick-check { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #09bb07; font-weight: bold; }
.add-addr-btn { width: 100%; height: 80rpx; line-height: 80rpx; background-color: #09bb07; color: #fff; font-size: 28rpx; border-radius: 12rpx; border: none; margin-top: 20rpx; }
</style>

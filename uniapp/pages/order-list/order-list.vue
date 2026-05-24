<template>
  <view class="page">
    <view v-if="orders.length > 0" class="order-list">
      <view class="order-card" v-for="order in orders" :key="order.id">
        <view class="card-header">
          <text class="order-no">{{ order.order_no }}</text>
          <view class="status-badge" :style="{ backgroundColor: statusColor(order.status) }">
            <text class="status-label">{{ statusText(order.status) }}</text>
          </view>
        </view>

        <view class="card-address" v-if="order.addresses">
          <text class="addr-icon">&#127968;</text>
          <view class="addr-info">
            <text class="addr-contact">{{ order.addresses.receiver_name }} {{ order.addresses.receiver_mobile }}</text>
            <text class="addr-full">{{ order.addresses.province }} {{ order.addresses.city }} {{ order.addresses.district }} {{ order.addresses.detail_address }}</text>
          </view>
        </view>

        <view class="card-goods">
          <view class="goods-row" v-for="item in order.order_items" :key="item.id">
            <image :src="IMG_BASE + (item.main_image || '')" mode="aspectFill" class="goods-img"></image>
            <view class="goods-info">
              <text class="goods-name">{{ item.fruit_name }}</text>
              <text class="goods-spec">{{ item.spec_name }}</text>
              <view class="goods-price-row">
                <text class="goods-price">&#165;{{ formatPrice(item.price) }}</text>
                <text class="goods-qty">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="card-footer">
          <text class="footer-total">
            共 {{ order.order_items?.length || 0 }} 件 合计
            <text class="footer-price">&#165;{{ formatPrice(order.total_amount) }}</text>
          </text>
          <view class="footer-actions">
            <button v-if="order.status === 0" class="action-btn cancel" @tap="handleCancel(order)">取消订单</button>
            <button v-if="order.status === 0" class="action-btn pay" @tap="handlePayOrder(order)">立即支付</button>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-icon">&#128230;</text>
      <text class="empty-text">暂无相关订单</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi, userApi, IMG_BASE } from '@/utils/api.js'

const orders = ref([])
const loading = ref(true)
const filterStatus = ref(null)

const statusMap = { 0: '待付款', 1: '待发货', 2: '已发货', 3: '已完成', 4: '已取消' }
const statusColors = { 0: '#e67e22', 1: '#3498db', 2: '#09bb07', 3: '#999', 4: '#ccc' }

onLoad((options) => {
  if (options && options.status !== undefined) filterStatus.value = parseInt(options.status)
  const titles = { 0: '待付款', 1: '待发货', 2: '已发货', 3: '已完成', 4: '已取消' }
  if (filterStatus.value !== null && titles[filterStatus.value]) {
    uni.setNavigationBarTitle({ title: titles[filterStatus.value] })
  }
  fetchOrders()
})

function statusText(s) { return statusMap[s] || '未知' }
function statusColor(s) { return statusColors[s] || '#999' }
function formatPrice(val) {
  if (val === null || val === undefined) return '--'
  const num = Number(val)
  return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2)
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value !== null) params.status = filterStatus.value
    const res = await orderApi.getOrders(params)
    orders.value = res.data?.list || []
  } catch (err) { orders.value = [] }
  finally { loading.value = false }
}

const handleCancel = (order) => {
  uni.showModal({
    title: '提示', content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.cancelOrder(order.id)
          uni.showToast({ title: '订单已取消', icon: 'success' })
          fetchOrders()
        } catch (err) {
          uni.showToast({ title: err.msg || '取消失败', icon: 'none' })
        }
      }
    }
  })
}

const handlePayOrder = async (order) => {
  uni.showLoading({ title: '支付中...' })
  try {
    const profileRes = await userApi.getProfile()
    const openid = profileRes.data.openid
    if (!openid) { uni.hideLoading(); uni.showToast({ title: '获取openid失败', icon: 'none' }); return }
    const payRes = await orderApi.payOrder({ order_id: order.id, openid })
    const payData = payRes.data
    uni.hideLoading()
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payData.timeStamp, nonceStr: payData.nonceStr,
      package: payData.package, signType: payData.signType || 'RSA', paySign: payData.paySign,
      success: async () => {
        try { await orderApi.paySuccess(order.id) } catch (_) { }
        uni.showToast({ title: '支付成功', icon: 'success' })
        fetchOrders()
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) {
          uni.showToast({ title: '支付已取消', icon: 'none' })
        } else {
          uni.showModal({
            title: '模拟支付', content: '开发环境模拟：支付成功？',
            confirmText: '成功', cancelText: '失败',
            success: async (r) => {
              if (r.confirm) {
                try { await orderApi.paySuccess(order.id) } catch (_) { }
                uni.showToast({ title: '支付成功', icon: 'success' })
                fetchOrders()
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
.page { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 40rpx; }
.order-list { padding: 20rpx; }
.order-card {
  background-color: #fff; border-radius: 16rpx; margin-bottom: 20rpx;
  overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 24rpx; border-bottom: 1rpx solid #f5f5f5;
}
.order-no { font-size: 24rpx; color: #999; }
.status-badge { padding: 6rpx 18rpx; border-radius: 6rpx; }
.status-label { font-size: 24rpx; color: #fff; font-weight: 500; }

.card-address {
  display: flex; padding: 20rpx 24rpx; background-color: #fafafa;
  border-bottom: 1rpx solid #f0f0f0;
}
.addr-icon { font-size: 32rpx; margin-right: 12rpx; line-height: 1.2; }
.addr-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.addr-contact { font-size: 26rpx; color: #333; font-weight: 500; }
.addr-full { font-size: 24rpx; color: #999; line-height: 1.4; }

.card-goods { padding: 0 24rpx; }
.goods-row {
  display: flex; align-items: center; padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.goods-row:last-child { border-bottom: none; }
.goods-img {
  width: 110rpx; height: 110rpx; border-radius: 8rpx;
  flex-shrink: 0; background-color: #f5f5f5;
}
.goods-info { flex: 1; margin-left: 16rpx; }
.goods-name { font-size: 28rpx; color: #333; font-weight: 500; display: block; margin-bottom: 4rpx; }
.goods-spec { font-size: 23rpx; color: #999; display: block; margin-bottom: 6rpx; }
.goods-price-row { display: flex; align-items: baseline; gap: 12rpx; }
.goods-price { font-size: 28rpx; color: #e74c3c; font-weight: bold; }
.goods-qty { font-size: 24rpx; color: #999; }

.card-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 24rpx; border-top: 1rpx solid #f0f0f0;
}
.footer-total { font-size: 26rpx; color: #333; }
.footer-price { font-size: 30rpx; font-weight: bold; color: #e74c3c; margin-left: 4rpx; }
.footer-actions { display: flex; gap: 16rpx; }
.action-btn { padding: 10rpx 28rpx; font-size: 24rpx; border-radius: 8rpx; line-height: 1.4; }
.action-btn.cancel { color: #999; background-color: #f5f5f5; border: 1rpx solid #e0e0e0; }
.action-btn.cancel::after { border: none; }
.action-btn.pay { color: #fff; background-color: #e74c3c; border: none; }
.action-btn.pay::after { border: none; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 300rpx; }
.empty-icon { font-size: 100rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 30rpx; color: #ccc; }
</style>

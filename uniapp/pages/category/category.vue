<template>
  <view class="page">
    <view class="search-bar">
      <view class="search-box">
        <input class="search-input" v-model="searchKeyword" placeholder="新鲜水果等你来..." confirm-type="search"
          @confirm="handleSearch" />
        <view class="search-btn" @tap="handleSearch">
          <text class="search-btn-text">搜索</text>
        </view>
      </view>
    </view>

    <view class="main-body">
      <scroll-view class="left-sidebar" scroll-y>
        <view v-for="cat in categories" :key="cat.id" class="sidebar-item"
          :class="{ active: activeCatId === cat.id }" @tap="handleCatChange(cat)">
          <view v-if="activeCatId === cat.id" class="active-bar"></view>
          <text class="sidebar-text">{{ cat.name }}</text>
        </view>
      </scroll-view>

      <scroll-view class="right-goods" scroll-y>
        <view v-if="goodsList.length > 0" class="goods-grid">
          <view class="goods-card" v-for="goods in goodsList" :key="goods.id" @tap="handleGoodsTap(goods)">
            <image :src="IMG_BASE + goods.main_image" mode="aspectFill" class="goods-image"></image>
            <view class="goods-info">
              <text class="goods-title">{{ goods.name }}</text>
              <view class="goods-bottom">
                <view class="price-area">
                  <text class="price-current">&#165;{{ formatPrice(goods.first_sku_price) }}</text>
                  <text v-if="goods.first_sku_original_price"
                    class="price-original">&#165;{{ formatPrice(goods.first_sku_original_price) }}</text>
                </view>
                <view class="cart-btn" @tap.stop="handleAddToCart(goods)">
                  <image src="/static/icons/shopping_trolley_item.svg" class="cart-icon" mode="aspectFit"></image>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-text">暂无商品</text>
        </view>
      </scroll-view>
    </view>
  </view>
  <CustomTabBar />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomTabBar from '@/components/custom-tab-bar.vue'
import { homeApi, userApi, IMG_BASE } from '@/utils/api.js'
import { refreshCartCount } from '@/stores/cart.js'

const categories = ref([])
const activeCatId = ref(null)
const goodsList = ref([])
const searchKeyword = ref('')

onLoad(async () => {
  try {
    const res = await homeApi.getCategories()
    const list = (res.data || []).slice()
    list.sort((a, b) => b.sort_order - a.sort_order)
    categories.value = list
    if (list.length > 0) {
      activeCatId.value = list[0].id
      await loadGoods(list[0].id)
    }
  } catch (err) {
    console.error('分类页数据加载失败', err)
  }
})

async function loadGoods(categoryId, keyword) {
  try {
    const params = { categoryId, pageSize: 50 }
    if (keyword) params.name = keyword
    const res = await homeApi.getGoods(params)
    goodsList.value = res.data?.list || []
  } catch (err) {
    goodsList.value = []
  }
}

async function handleCatChange(cat) {
  if (activeCatId.value === cat.id) return
  activeCatId.value = cat.id
  searchKeyword.value = ''
  await loadGoods(cat.id)
}

async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!activeCatId.value) return
  await loadGoods(activeCatId.value, keyword || undefined)
  searchKeyword.value = ''
}

function formatPrice(val) {
  if (val === null || val === undefined) return '--'
  const num = Number(val)
  return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2)
}

const handleGoodsTap = (goods) => {
  uni.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${goods.id}` })
}

const handleAddToCart = async (goods) => {
  if (!goods.first_sku_id) return
  try {
    await userApi.addToCart({ fruit_id: goods.id, sku_id: goods.first_sku_id })
    await refreshCartCount()
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: err.msg || '添加失败', icon: 'none' })
  }
}
</script>

<style>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f5f5;
}

.search-bar {
  width: 750rpx; height: 122rpx; display: flex; align-items: center;
  justify-content: center; background-color: #fff; flex-shrink: 0;
}
.search-box {
  width: 706rpx; height: 74rpx; display: flex; align-items: center;
  border: 2rpx solid #09bb07; border-radius: 40rpx; overflow: hidden;
}
.search-input { flex: 1; height: 74rpx; padding: 0 20rpx; font-size: 26rpx; color: #333; }
.search-btn {
  width: 125rpx; height: 74rpx; background-color: #09bb07;
  display: flex; align-items: center; justify-content: center;
  border-radius: 40rpx;
}
.search-btn-text { color: #fff; font-size: 30rpx; }

.main-body { flex: 1; display: flex; overflow: hidden; }

.left-sidebar { width: 172rpx; background-color: #f8f8f8; flex-shrink: 0; }
.sidebar-item {
  width: 172rpx; height: 90rpx; display: flex; align-items: center;
  justify-content: center; position: relative; background-color: #f8f8f8;
}
.sidebar-item.active { background-color: #fff; }
.active-bar {
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 6rpx; height: 40rpx; background-color: #09bb07; border-radius: 0 3rpx 3rpx 0;
}
.sidebar-text { font-size: 26rpx; color: #333; }

.right-goods {
  flex: 1; background-color: #fff;
  padding: 16rpx 16rpx calc(100rpx + env(safe-area-inset-bottom));
}
.goods-card {
  width: 536rpx; height: 196rpx; display: flex; align-items: center;
  padding: 12rpx; background-color: #fff; border-radius: 12rpx;
  margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); box-sizing: border-box;
}
.goods-image { width: 172rpx; height: 172rpx; border-radius: 8rpx; flex-shrink: 0; }
.goods-info {
  flex: 1; height: 172rpx; display: flex; flex-direction: column;
  justify-content: space-between; padding-left: 16rpx; overflow: hidden;
}
.goods-title {
  font-size: 28rpx; color: #333; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.goods-bottom { display: flex; align-items: flex-end; justify-content: space-between; }
.price-area { display: flex; align-items: baseline; gap: 8rpx; }
.price-current { font-size: 28rpx; font-weight: bold; color: #e74c3c; }
.price-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
.cart-btn {
  width: 48rpx; height: 48rpx; border-radius: 50%; background-color: #09bb07;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cart-icon { width: 28rpx; height: 28rpx; }

.empty-state { display: flex; align-items: center; justify-content: center; padding-top: 200rpx; }
.empty-text { font-size: 28rpx; color: #ccc; }
</style>

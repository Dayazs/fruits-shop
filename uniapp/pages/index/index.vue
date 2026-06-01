<template>
  <!-- ===== 骨架屏 ===== -->
  <view v-if="loading" class="page">
    <view class="skeleton banner-skeleton"></view>
    <view class="category-section">
      <view class="category-list">
        <view class="category-item" v-for="i in 4" :key="i">
          <view class="sku-circle"></view>
          <view class="sku-line sku-line-sm"></view>
        </view>
      </view>
    </view>
    <view v-for="i in 2" :key="i" class="special-section">
      <view class="sku-block sku-banner"></view>
      <view class="goods-grid">
        <view class="goods-card" v-for="j in 4" :key="j">
          <view class="sku-block sku-goods-img"></view>
          <view class="sku-line" style="margin: 12rpx 16rpx 0;"></view>
          <view class="sku-line sku-line-sm" style="margin: 8rpx 16rpx 0; width: 60%;"></view>
        </view>
      </view>
    </view>
    <CustomTabBar />
  </view>

  <!-- ===== 真实内容 ===== -->
  <view v-else class="page">
    <swiper class="banner-swiper" :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500"
      :circular="true" indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#ffffff">
      <swiper-item v-for="banner in banners" :key="banner.id" @tap="handleBannerTap(banner)">
        <image :src="IMG_BASE + banner.image_url" mode="aspectFill" class="banner-image"></image>
      </swiper-item>
    </swiper>

    <view class="category-section" v-if="topCategories.length > 0">
      <view class="category-list">
        <view class="category-item" v-for="cat in topCategories" :key="cat.id" @tap="handleCategoryTap(cat)">
          <view class="category-img-wrapper">
            <view class="category-circle"></view>
            <image :src="IMG_BASE + cat.image" mode="aspectFit" class="category-img"></image>
          </view>
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <view v-for="cat in specialCategories" :key="cat.id" class="special-section">
      <image :src="IMG_BASE + cat.image" mode="aspectFill" class="special-banner"></image>
      <view class="goods-grid" v-if="cat.products && cat.products.length > 0">
        <view class="goods-card" v-for="goods in cat.products" :key="goods.id" @tap="handleGoodsTap(goods)">
          <image :src="IMG_BASE + goods.main_image" mode="aspectFill" class="goods-img"></image>
          <text class="goods-name">{{ goods.name }}</text>
          <view class="goods-price-row">
            <view class="price-left">
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

    <view class="placeholder" v-if="!loading && specialCategories.length === 0">
      <text class="placeholder-text">更多内容即将上线</text>
    </view>
  </view>
  <CustomTabBar v-if="!loading" />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import CustomTabBar from '@/components/custom-tab-bar.vue'
import { homeApi, userApi, IMG_BASE } from '@/utils/api.js'
import { refreshCartCount, requireLogin } from '@/stores/cart.js'

const loading = ref(true)
const banners = ref([])
const topCategories = ref([])
const specialCategories = ref([])

onShareAppMessage(() => ({
  title: '水果商城 - 新鲜水果直达',
  path: '/pages/index/index',
}))

onLoad(async () => {
  try {
    const [bannerRes, cateRes] = await Promise.all([
      homeApi.getBanners(),
      homeApi.getCategories()
    ])
    banners.value = bannerRes.data || []

    const all = (cateRes.data || []).slice()
    all.sort((a, b) => a.sort_order - b.sort_order)

    topCategories.value = all.filter(c => c.sort_order < 100).slice(0, 4)

    const specialList = all.filter(c => c.sort_order >= 100)
    specialCategories.value = specialList

    if (specialList.length > 0) {
      const goodsResults = await Promise.all(
        specialList.map(cat =>
          homeApi.getGoods({ categoryId: cat.id, pageSize: 4 })
        )
      )
      specialCategories.value = specialList.map((cat, i) => ({
        ...cat,
        products: goodsResults[i]?.data?.list || []
      }))
    }
  } catch (err) {
    console.error('首页数据加载失败', err)
  } finally {
    loading.value = false
  }
})

function formatPrice(val) {
  if (val === null || val === undefined) return '--'
  const num = Number(val)
  return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2)
}

const handleBannerTap = (banner) => {
  if (banner.fruit_id) {
    uni.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${banner.fruit_id}` })
  }
}

const handleCategoryTap = (cat) => {
  if (!requireLogin()) return
  console.log('[首页] 点击分类 ->', { id: cat.id, name: cat.name })
  uni.setStorageSync('targetCategoryId', cat.id)
  uni.switchTab({ url: '/pages/category/category' })
}

const handleGoodsTap = (goods) => {
  uni.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${goods.id}` })
}

const handleAddToCart = async (goods) => {
  if (!requireLogin()) return
  try {
    await userApi.addToCart({ fruit_id: goods.id })
    await refreshCartCount()
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: err.msg || '添加失败', icon: 'none' })
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
}
.banner-swiper { width: 750rpx; height: 440rpx; }
.banner-image { width: 750rpx; height: 440rpx; }

.category-section {
  width: 750rpx; height: 216rpx; background-color: #fff;
  display: flex; align-items: center; margin-bottom: 16rpx;
}
.category-list { display: flex; width: 750rpx; padding: 0 20rpx; box-sizing: border-box; }
.category-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.category-img-wrapper {
  position: relative; width: 100rpx; height: 120rpx;
  display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx;
}
.category-circle {
  position: absolute; width: 75rpx; height: 75rpx; border-radius: 50%;
  background-color: #82c77c; top: 20%; left: 50%; transform: translate(-50%, 10%);
}
.category-img { position: relative; z-index: 1; width: 80rpx; height: 80rpx; }
.category-name { font-size: 24rpx; color: #333; }

.special-section { margin-bottom: 16rpx; background-color: #fff; }
.special-banner { width: 750rpx; height: 258rpx; display: block; }

.goods-grid { display: flex; flex-wrap: wrap; padding: 20rpx; justify-content: space-between; }
.goods-card {
  width: 335rpx; height: 500rpx; background-color: #fff;
  border-radius: 12rpx; overflow: hidden; margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.goods-img { width: 335rpx; height: 335rpx; display: block; }
.goods-name {
  display: block; height: 68rpx; line-height: 68rpx; font-size: 26rpx;
  color: #333; padding: 0 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.goods-price-row {
  height: 84rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 16rpx;
}
.price-left { display: flex; align-items: baseline; gap: 10rpx; }
.price-current { font-size: 28rpx; font-weight: bold; color: #e74c3c; }
.price-original { font-size: 22rpx; color: #999; text-decoration: line-through; }
.cart-btn {
  width: 56rpx; height: 56rpx; border-radius: 50%; background-color: #09bb07;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cart-icon { width: 39rpx; height: 39rpx; }

.placeholder { display: flex; align-items: center; justify-content: center; padding: 100rpx 0; }
.placeholder-text { font-size: 26rpx; color: #ccc; }

/* ========== 骨架屏 ========== */
.skeleton { position: relative; overflow: hidden; }
.banner-skeleton { width: 750rpx; height: 440rpx; background-color: #e8e8e8; }
.sku-circle {
  width: 75rpx; height: 75rpx; border-radius: 50%;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.sku-line {
  height: 26rpx; background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4rpx;
}
.sku-line-sm { height: 20rpx; width: 80%; }
.sku-block {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8rpx;
}
.sku-banner { width: 750rpx; height: 258rpx; }
.sku-goods-img { width: 335rpx; height: 335rpx; }

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>

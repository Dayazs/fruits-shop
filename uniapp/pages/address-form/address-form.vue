<template>
  <view class="page">
    <view class="form-section">
      <!-- 收货人 -->
      <view class="form-item">
        <text class="form-label">收货人</text>
        <input
          class="form-input"
          v-model="form.receiver_name"
          placeholder="请输入收货人姓名"
          maxlength="15"
        />
      </view>

      <!-- 收货电话 -->
      <view class="form-item">
        <text class="form-label">收货电话</text>
        <input
          class="form-input"
          v-model="form.receiver_mobile"
          type="number"
          placeholder="请输入收货电话"
          maxlength="11"
        />
      </view>

      <!-- 省市区滑动选择 -->
      <view class="form-item">
        <text class="form-label">省市区</text>
        <picker
          mode="region"
          :value="regionIndex"
          @change="handleRegionChange"
        >
          <view class="form-picker" :class="{ placeholder: !form.province }">
            <text v-if="form.province">
              {{ form.province }} {{ form.city }} {{ form.district }}
            </text>
            <text v-else class="placeholder-text">请选择省市区</text>
          </view>
        </picker>
      </view>

      <!-- 详细地址 -->
      <view class="form-item">
        <text class="form-label">详细地址</text>
        <input
          class="form-input"
          v-model="form.detail_address"
          placeholder="请输入详细地址（如街道、门牌号）"
          maxlength="100"
        />
      </view>

      <!-- 是否默认 -->
      <view class="form-item">
        <text class="form-label">设为默认地址</text>
        <switch
          class="form-switch"
          :checked="form.is_default === 1"
          color="#09bb07"
          @change="handleSwitchChange"
        />
      </view>
    </view>

    <!-- ========== 确认按钮 ========== -->
    <view class="confirm-section">
      <button class="confirm-btn" @tap="handleSubmit">确定</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { userApi } from '@/utils/api.js'

const isEdit = ref(false)
const editId = ref(null)
const regionIndex = ref([0, 0, 0])

const form = reactive({
  receiver_name: '',
  receiver_mobile: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  is_default: 0
})

onLoad((options) => {
  if (options && options.id) {
    isEdit.value = true
    editId.value = parseInt(options.id)
    loadAddress(editId.value)
  }
})

const loadAddress = async (id) => {
  try {
    const res = await userApi.getAddresses()
    const addr = (res.data || []).find(a => a.id === id)
    if (addr) {
      form.receiver_name = addr.receiver_name
      form.receiver_mobile = addr.receiver_mobile
      form.province = addr.province
      form.city = addr.city
      form.district = addr.district
      form.detail_address = addr.detail_address
      form.is_default = addr.is_default
    }
  } catch (err) {
    uni.showToast({ title: '加载地址失败', icon: 'none' })
  }
}

const handleRegionChange = (e) => {
  const val = e.detail.value
  form.province = val[0]
  form.city = val[1]
  form.district = val[2]
}

const handleSwitchChange = (e) => {
  form.is_default = e.detail.value ? 1 : 0
}

const validate = () => {
  if (!form.receiver_name.trim()) {
    uni.showToast({ title: '请输入收货人', icon: 'none' })
    return false
  }
  if (!form.receiver_mobile.trim()) {
    uni.showToast({ title: '请输入收货电话', icon: 'none' })
    return false
  }
  if (!/^1\d{10}$/.test(form.receiver_mobile.trim())) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return false
  }
  if (!form.province) {
    uni.showToast({ title: '请选择省市区', icon: 'none' })
    return false
  }
  if (!form.detail_address.trim()) {
    uni.showToast({ title: '请输入详细地址', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  const data = {
    receiver_name: form.receiver_name.trim(),
    receiver_mobile: form.receiver_mobile.trim(),
    province: form.province,
    city: form.city,
    district: form.district,
    detail_address: form.detail_address.trim(),
    is_default: form.is_default
  }

  try {
    if (isEdit.value) {
      await userApi.updateAddress(editId.value, data)
    } else {
      await userApi.createAddress(data)
    }
    uni.showToast({ title: isEdit.value ? '修改成功' : '添加成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (err) {
    uni.showToast({ title: err.msg || '保存失败', icon: 'none' })
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* ========== 表单 ========== */
.form-section {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 0 30rpx;
}
.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  min-height: 56rpx;
}
.form-item:last-child {
  border-bottom: none;
}
.form-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}
.form-input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #333;
}
.form-picker {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #333;
}
.form-picker.placeholder {
  color: #ccc;
}
.placeholder-text {
  color: #ccc;
}
.form-switch {
  flex-shrink: 0;
}

/* ========== 确认按钮 ========== */
.confirm-section {
  padding: 40rpx 20rpx;
}
.confirm-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #09bb07;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
  border: none;
}
</style>

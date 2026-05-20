<template>
  <div class="goods-container">
    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="商品名称">
          <el-input
            v-model="query.name"
            placeholder="请输入商品名称"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="query.categoryId"
            placeholder="请选择分类"
            clearable
            @change="handleSearch"
            style="width: 140px"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="请选择状态"
            clearable
            @change="handleSearch"
            style="width: 120px"
          >
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏与表格 -->
    <el-card class="table-card">
      <div class="table-header">
        <el-button type="primary" :icon="Plus" @click="handleAdd"
          >添加商品</el-button
        >
        <el-button :icon="Delete" plain @click="$router.push('/goods/recycle')"
          >回收站</el-button
        >
      </div>

      <el-table
        :data="list"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{
            (pager.page - 1) * pager.pageSize + $index + 1
          }}</template>
        </el-table-column>
        <el-table-column prop="id" label="商品ID" width="80" align="center" />
        <el-table-column label="主图" width="100" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.main_image"
              :src="row.main_image"
              style="width: 60px; height: 60px; border-radius: 4px"
              fit="cover"
              preview-teleported
              :preview-src-list="[row.main_image]"
            />
            <span v-else class="no-image">暂无</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="商品名称"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column label="分类" width="100" align="center">
          <template #default="{ row }">{{ row.categories?.name }}</template>
        </el-table-column>
        <el-table-column label="价格" width="100" align="center">
          <template #default="{ row }"
            >¥{{ Number(row.first_sku_price || 0).toFixed(2) }}</template
          >
        </el-table-column>
        <el-table-column label="库存" width="80" align="center">
          <template #default="{ row }">{{ row.total_stock }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)"
              >编辑</el-button
            >
            <el-button
              size="small"
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="pager.page"
          v-model:page-size="pager.pageSize"
          :total="pager.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 添加/编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '添加商品' : '编辑商品'"
      width="860px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <!-- 基本信息 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category_id">
              <el-select
                v-model="form.category_id"
                placeholder="请选择分类"
                style="width: 100%"
              >
                <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述"
          />
        </el-form-item>

        <el-form-item label="商品状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 主图：auto-upload=false，暂存 File，本地预览 -->
        <el-form-item label="主图">
          <div class="upload-wrapper">
            <el-upload
              class="avatar-uploader"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onMainImageChange"
            >
              <img
                v-if="mainImagePreview"
                :src="mainImagePreview"
                class="uploaded-avatar"
              />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>
            <span class="upload-tip">建议尺寸 400×400，大小不超过 2MB</span>
          </div>
        </el-form-item>

        <!-- 副图 -->
        <el-form-item label="副图">
          <div class="sub-images-section">
            <div
              v-if="subImageListForUpload.length > 3"
              class="scroll-arrow scroll-arrow-left"
              @click="scrollSubImages(-1)"
            >
              <el-icon><ArrowLeft /></el-icon>
            </div>
            <div class="sub-images-scroll" ref="subImageScrollRef">
              <el-upload
                :auto-upload="false"
                list-type="picture-card"
                :file-list="subImageListForUpload"
                accept="image/*"
                multiple
                :on-change="onSubImageChange"
                :on-remove="onSubImageRemove"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </div>
            <div
              v-if="subImageListForUpload.length > 3"
              class="scroll-arrow scroll-arrow-right"
              @click="scrollSubImages(1)"
            >
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
          <span class="upload-tip">可上传多张副图，建议尺寸 400×400</span>
        </el-form-item>

        <!-- SKU 配置 -->
        <el-divider content-position="left">SKU 配置</el-divider>
        <div class="sku-section">
          <div v-for="(sku, i) in form.skus" :key="i" class="sku-row">
            <el-row :gutter="10" align="middle">
              <el-col :span="5">
                <el-input v-model="sku.spec_name" placeholder="规格名" />
              </el-col>
              <el-col :span="2">
                <el-input v-model="sku.weight" placeholder="重量" />
              </el-col>
              <el-col :span="4">
                <el-input-number
                  v-model="sku.price"
                  :min="0"
                  :max="99999"
                  :precision="2"
                  placeholder="售价"
                  style="width: 100%"
                />
              </el-col>
              <el-col :span="4">
                <el-input-number
                  v-model="sku.original_price"
                  :min="0"
                  :max="99999"
                  :precision="2"
                  placeholder="原价"
                  style="width: 100%"
                />
              </el-col>
              <el-col :span="4">
                <el-input-number
                  v-model="sku.stock"
                  :min="0"
                  placeholder="库存"
                  style="width: 100%"
                />
              </el-col>
              <el-col :span="3">
                <el-upload
                  class="sku-upload"
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/*"
                  :on-change="(f: any) => onSkuImageChange(f, i)"
                >
                  <el-button
                    v-if="!getSkuPreview(i)"
                    size="small"
                    :icon="Upload"
                    >图片</el-button
                  >
                  <img
                    v-else
                    :src="getSkuPreview(i)"
                    class="sku-image-preview"
                  />
                </el-upload>
              </el-col>
              <el-col :span="2">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  plain
                  :disabled="form.skus.length <= 1"
                  @click="removeSku(i)"
                />
              </el-col>
            </el-row>
          </div>
          <el-button
            type="primary"
            :icon="Plus"
            plain
            size="small"
            @click="addSku"
            >新增 SKU</el-button
          >
          <p class="sku-hint">
            售价取第一个 SKU 的价格，库存为所有 SKU 库存之和；至少保留一个 SKU
          </p>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed } from 'vue'
import {
  Search,
  Refresh,
  Plus,
  Delete,
  Edit,
  Upload,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  getGoodsList,
  getGoodsSkus,
  createGoods,
  updateGoods,
  toggleGoodsStatus,
  deleteGoods,
  getCategories,
  parseImages,
  normalizeSku,
  type GoodsItem,
  type GoodsForm,
  type GoodsSku,
  type GoodsQuery,
  type Category,
} from '@/api/goods'

// ========== 分类 ==========
const categories = ref<Category[]>([])

const fetchCategories = async () => {
  try {
    categories.value = (await getCategories()) ?? []
  } catch {
    categories.value = []
  }
}

// ========== 搜索 ==========
const query = reactive<GoodsQuery>({
  name: '',
  categoryId: undefined,
  status: undefined,
})

const handleSearch = () => {
  pager.page = 1
  fetchList()
}

const handleReset = () => {
  query.name = ''
  query.categoryId = undefined
  query.status = undefined
  pager.page = 1
  fetchList()
}

// ========== 列表 ==========
const loading = ref(false)
const list = ref<GoodsItem[]>([])
const pager = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getGoodsList({
      name: query.name || undefined,
      categoryId: query.categoryId,
      status: query.status,
      page: pager.page,
      pageSize: pager.pageSize,
    })
    console.log(res)
    list.value = res.list ?? []
    pager.total = res.total ?? 0
  } catch {
    list.value = []
    pager.total = 0
  } finally {
    loading.value = false
  }
}

// ========== 切换状态 ==========
const handleToggleStatus = async (row: GoodsItem) => {
  try {
    await toggleGoodsStatus(row.id)
    ElMessage.success(row.status === 1 ? '已下架' : '已上架')
    fetchList()
  } catch {
    // ignore
  }
}

// ========== 软删除 ==========
const handleDelete = async (row: GoodsItem) => {
  try {
    await ElMessageBox.confirm('确定要删除吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteGoods(row.id)
    ElMessage.success('已移入回收站')
    fetchList()
  } catch {
    // ignore
  }
}

// ========== 图片暂存（auto-upload=false，本地缓存 File，提交时拼入 FormData） ==========
const mainImageFile = ref<File | null>(null)
const mainImagePreview = ref('')

// 副图：{ file, uid, url } file 为新增的原始 File，url 为预览地址
interface SubImageEntry {
  file: File | null
  uid: number
  url: string
}
const subImageEntries = ref<SubImageEntry[]>([])
let subImageUid = 0

// SKU 图片：与 form.skus 索引对齐
const skuImageFiles = ref<(File | null)[]>([])
const skuImagePreviews = ref<string[]>([])

const subImageListForUpload = computed(() =>
  subImageEntries.value.map((e) => ({
    name: e.file?.name ?? e.url,
    url: e.url,
    uid: e.uid,
  })),
)

/** 校验图片文件 */
const validateImageFile = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

// -- 主图 --
const onMainImageChange = (uploadFile: any) => {
  const file = uploadFile.raw as File
  console.log(file)

  if (!validateImageFile(file)) return
  revokeUrl(mainImagePreview.value)
  mainImageFile.value = file
  mainImagePreview.value = URL.createObjectURL(file)
}

// -- 副图 --
const onSubImageChange = (uploadFile: any) => {
  const file = uploadFile.raw as File
  if (!validateImageFile(file)) return
  subImageEntries.value.push({
    file,
    uid: ++subImageUid,
    url: URL.createObjectURL(file),
  })
}

const onSubImageRemove = (uploadFile: any) => {
  const idx = subImageEntries.value.findIndex((e) => e.uid === uploadFile.uid)
  if (idx !== -1) {
    const entry = subImageEntries.value[idx]!
    if (entry.file) revokeUrl(entry.url)
    subImageEntries.value.splice(idx, 1)
  }
}

// -- SKU 图 --
const onSkuImageChange = (uploadFile: any, index: number) => {
  const file = uploadFile.raw as File
  if (!validateImageFile(file)) return
  revokeUrl(skuImagePreviews.value[index] ?? '')
  skuImageFiles.value[index] = file
  skuImagePreviews.value[index] = URL.createObjectURL(file)
}

const getSkuPreview = (index: number): string => {
  return skuImagePreviews.value[index] ?? form.skus[index]?.image ?? ''
}

/** 释放本地预览 URL */
const revokeUrl = (url: string) => {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

const cleanupImageState = () => {
  revokeUrl(mainImagePreview.value)
  mainImageFile.value = null
  mainImagePreview.value = ''

  for (const entry of subImageEntries.value) {
    if (entry.file) revokeUrl(entry.url)
  }
  subImageEntries.value = []
  subImageUid = 0

  for (const url of skuImagePreviews.value) {
    revokeUrl(url)
  }
  skuImageFiles.value = []
  skuImagePreviews.value = []
}

// ========== 副图滚动 ==========
const subImageScrollRef = ref<HTMLElement | null>(null)
const scrollSubImages = (direction: number) => {
  subImageScrollRef.value?.scrollBy({
    left: direction * 200,
    behavior: 'smooth',
  })
}

// ========== 弹框 ==========
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const defaultSku = (): GoodsSku => ({
  spec_name: '',
  weight: '',
  price: 0,
  original_price: 0,
  stock: 0,
  image: '',
})

const defaultForm = (): GoodsForm => ({
  name: '',
  category_id: 1,
  description: '',
  main_image: '',
  images: '',
  status: 1,
  skus: [defaultSku()],
})

const form = reactive<GoodsForm>(defaultForm())

const hasChinese = (v: string) => /[一-龥]/.test(v)

const formRules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    {
      validator: (_r: any, v: string, cb: any) => {
        if (!v) return cb()
        if (!hasChinese(v)) cb(new Error('商品名称不能为纯数字或纯英文字母'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
  description: [
    {
      validator: (_r: any, v: string, cb: any) => {
        if (!v) return cb()
        if (!hasChinese(v)) cb(new Error('商品描述不能为纯数字或纯英文字母'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

const handleAdd = () => {
  dialogMode.value = 'add'
  editingId.value = null
  Object.assign(form, defaultForm())
  form.skus = [defaultSku()]
  cleanupImageState()
  dialogVisible.value = true
}

const handleEdit = async (row: GoodsItem) => {
  dialogMode.value = 'edit'
  editingId.value = row.id

  // 先用列表数据回填基本信息
  form.name = row.name
  form.category_id = row.category_id
  form.description = row.description ?? ''
  form.main_image = row.main_image ?? ''
  form.status = row.status
  form.skus = [defaultSku()]

  const existingUrls = parseImages(row)
  subImageEntries.value = existingUrls.map((url) => ({
    file: null,
    uid: ++subImageUid,
    url,
  }))

  mainImageFile.value = null
  mainImagePreview.value = row.main_image ?? ''

  syncSkuImageState()
  dialogVisible.value = true

  // 异步拉取 SKU 接口，回填 SKU 列表
  try {
    const res = await getGoodsSkus(row.id)
    if (res?.skus?.length) {
      form.skus = res.skus.map((s) => normalizeSku(s as any))
      syncSkuImageState()
    }
  } catch {
    // 列表数据兜底
  }
}

/** 讓 SKU 圖片的暫存與 form.skus 保持對齊 */
const syncSkuImageState = () => {
  for (const url of skuImagePreviews.value) revokeUrl(url)
  skuImageFiles.value = form.skus.map(() => null)
  skuImagePreviews.value = form.skus.map((s) => s.image ?? '')
}

const handleDialogClosed = () => {
  formRef.value?.resetFields()
  cleanupImageState()
}

const addSku = () => {
  form.skus.push(defaultSku())
  skuImageFiles.value.push(null)
  skuImagePreviews.value.push('')
}

const removeSku = (index: number) => {
  if (form.skus.length <= 1) {
    ElMessage.warning('至少保留一个 SKU')
    return
  }
  form.skus.splice(index, 1)
  revokeUrl(skuImagePreviews.value[index] ?? '')
  skuImageFiles.value.splice(index, 1)
  skuImagePreviews.value.splice(index, 1)
}

// ========== 构建 FormData ==========
const buildFormData = (): FormData => {
  const fd = new FormData()
  fd.append('name', form.name)
  fd.append('category_id', String(form.category_id))
  fd.append('description', form.description)
  fd.append('status', String(form.status))
  fd.append('sort_order', '0')

  // SKU JSON
  fd.append('skus', JSON.stringify(form.skus))

  // 主图
  if (mainImageFile.value) {
    fd.append('main_image', mainImageFile.value)
  }

  // 保留的旧图
  const keepImages = subImageEntries.value
    .filter((e) => !e.file)
    .map((e) => e.url)
  fd.append('keep_images', JSON.stringify(keepImages))

  // 新上传的副图
  for (const entry of subImageEntries.value) {
    if (entry.file) {
      fd.append('images', entry.file)
    }
  }

  // SKU 图片，按索引命名
  for (let i = 0; i < skuImageFiles.value.length; i++) {
    const f = skuImageFiles.value[i]
    if (f) {
      fd.append(`sku_image_${i}`, f)
    }
  }

  return fd
}

// ========== 提交 ==========
const validateSkus = (): boolean => {
  if (form.skus.length === 0) {
    ElMessage.warning('请至少配置一个 SKU')
    return false
  }

  for (let i = 0; i < form.skus.length; i++) {
    const s = form.skus[i]!
    const idx = form.skus.length > 1 ? `第 ${i + 1} 个 SKU：` : ''

    if (!s.spec_name || !s.spec_name.trim()) {
      ElMessage.warning(`${idx}请输入规格名称`)
      return false
    }
    if (!hasChinese(s.spec_name)) {
      ElMessage.warning(`${idx}规格名称不能为纯数字或纯英文字母`)
      return false
    }
    if (!s.weight || !s.weight.trim()) {
      ElMessage.warning(`${idx}请输入重量`)
      return false
    }
    if (!s.price || Number(s.price) <= 0) {
      ElMessage.warning(`${idx}价格必须大于 0`)
      return false
    }
    if (Number(s.price) > 99999) {
      ElMessage.warning(`${idx}价格不能超过 99999`)
      return false
    }
    if (!s.original_price || Number(s.original_price) <= 0) {
      ElMessage.warning(`${idx}原价必须大于 0`)
      return false
    }
    if (Number(s.original_price) > 99999) {
      ElMessage.warning(`${idx}原价不能超过 99999`)
      return false
    }
    if (Number(s.original_price) <= Number(s.price)) {
      ElMessage.warning(`${idx}原价必须大于价格`)
      return false
    }
  }

  return true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (!validateSkus()) return

  submitLoading.value = true
  try {
    if (dialogMode.value === 'add') {
      await createGoods(buildFormData())
      ElMessage.success('添加成功')
    } else {
      await updateGoods(editingId.value!, buildFormData())
      ElMessage.success('编辑成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // ignore
  } finally {
    submitLoading.value = false
  }
}

// ========== 初始化 ==========
fetchCategories()
fetchList()
</script>

<style scoped>
.goods-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card :deep(.el-card__body) {
  padding-bottom: 0;
}

.table-card :deep(.el-card__body) {
  padding: 16px;
}

.table-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.no-image {
  color: #c0c4cc;
  font-size: 12px;
}

/* 上传 */
.upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.uploaded-avatar {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

/* 副图 */
.sub-images-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sub-images-scroll {
  overflow-x: auto;
  scroll-behavior: smooth;
}

.sub-images-scroll::-webkit-scrollbar {
  display: none;
}

.scroll-arrow {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: box-shadow 0.3s;
}

.scroll-arrow:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.scroll-arrow .el-icon {
  font-size: 14px;
  color: #606266;
}

/* SKU */
.sku-section {
  padding: 0 12px;
}

.sku-row {
  padding: 12px 0;
  border-bottom: 1px dashed #ebeef5;
}

.sku-row:first-child {
  padding-top: 0;
}

.sku-upload :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
}

.sku-upload :deep(.el-upload:hover) {
  border-color: #409eff;
}

.sku-image-preview {
  width: 60px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}

.sku-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}
</style>

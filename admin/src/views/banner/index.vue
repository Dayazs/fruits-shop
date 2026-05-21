<template>
  <div class="banner-container">
    <el-card>
      <div class="page-header">
        <div class="header-left">
          <span class="page-title">轮播图管理</span>
          <span class="enabled-count">已启用 {{ enabledCount }} / 4</span>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加轮播图
        </el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" border stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column label="图片" width="140" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.image_url"
              :src="row.image_url"
              style="width: 120px; height: 42px; border-radius: 4px"
              fit="cover"
              preview-teleported
              :preview-src-list="[row.image_url]"
            />
            <span v-else class="no-image">暂无</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column label="关联商品" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.fruits?.name ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="70" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="(v: boolean) => handleToggleStatus(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '添加轮播图' : '编辑轮播图'"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入轮播图标题" />
        </el-form-item>

        <el-form-item label="图片" :required="dialogMode === 'add'">
          <div class="upload-wrapper">
            <el-upload
              class="banner-uploader"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onImageChange"
            >
              <img v-if="imagePreview" :src="imagePreview" class="banner-preview" />
              <div v-else class="banner-uploader-placeholder">
                <el-icon :size="28"><Plus /></el-icon>
              </div>
            </el-upload>
            <span class="upload-tip">建议尺寸 1200×420，大小不超过 2MB</span>
          </div>
        </el-form-item>

        <el-form-item label="关联商品" prop="fruit_id">
          <el-select
            v-model="form.fruit_id"
            filterable
            remote
            reserve-keyword
            :remote-method="searchGoods"
            :loading="goodsLoading"
            placeholder="请搜索并选择关联商品"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="g in goodsOptions"
              :key="g.id"
              :label="`#${g.id} ${g.name}`"
              :value="g.id"
            >
              <div class="goods-option">
                <span class="goods-option-id">#{{ g.id }}</span>
                <span class="goods-option-name">{{ g.name }}</span>
                <el-tag size="small" type="info" class="goods-option-cat">{{ g.categories?.name }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="form.sort_order" :min="0" placeholder="请输入排序值" style="width: 100%" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-switch
            :model-value="form.status === 1"
            @change="onDialogStatusChange"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type BannerItem,
} from '@/api/banner'
import { getGoodsList, type GoodsItem } from '@/api/goods'

// ========== 列表 ==========
const loading = ref(false)
const list = ref<BannerItem[]>([])

const fetchList = async () => {
  loading.value = true
  try {
    list.value = (await getBanners()) ?? []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

const enabledCount = computed(() => list.value.filter((b) => b.status === 1).length)

// ========== 切换状态 ==========
const handleToggleStatus = async (row: BannerItem, v: boolean) => {
  if (v && enabledCount.value >= 4) {
    ElMessage.warning('最多启用 4 个轮播图')
    return
  }
  try {
    await updateBanner(row.id, buildFormData({ status: v ? 1 : 0 }))
    row.status = v ? 1 : 0
    ElMessage.success(v ? '已上架' : '已下架')
  } catch {
    // ignore
  }
}

// ========== 删除 ==========
const handleDelete = async (row: BannerItem) => {
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
    await deleteBanner(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {
    // ignore
  }
}

// ========== 商品选择器 ==========
const goodsLoading = ref(false)
const goodsOptions = ref<GoodsItem[]>([])

const searchGoods = async (keyword: string) => {
  goodsLoading.value = true
  try {
    const res = await getGoodsList({ name: keyword || undefined, pageSize: 20 })
    goodsOptions.value = res?.list ?? []
  } catch {
    goodsOptions.value = []
  } finally {
    goodsLoading.value = false
  }
}

// ========== 图片暂存 ==========
const imageFile = ref<File | null>(null)
const imagePreview = ref('')

const onImageChange = (uploadFile: any) => {
  const file = uploadFile.raw as File
  if (!file.type.startsWith('image/')) { ElMessage.error('只能上传图片文件'); return }
  if (file.size / 1024 / 1024 > 2) { ElMessage.error('图片大小不能超过 2MB'); return }
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

const cleanupImage = () => {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = ''
}

// ========== 弹框 ==========
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  title: '',
  fruit_id: undefined as number | undefined,
  sort_order: 0,
  status: 1,
})

const formRules = computed(() =>
  dialogMode.value === 'add'
    ? {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        fruit_id: [{ required: true, message: '请选择关联商品', trigger: 'change' }],
      }
    : {},
)

const otherEnabledCount = computed(() => {
  if (dialogMode.value === 'edit' && editingId.value) {
    return list.value.filter((b) => b.status === 1 && b.id !== editingId.value).length
  }
  return enabledCount.value
})

const onDialogStatusChange = (v: boolean) => {
  if (v && otherEnabledCount.value >= 4) {
    ElMessage.warning('最多启用 4 个轮播图')
    return
  }
  form.status = v ? 1 : 0
}

const handleAdd = () => {
  dialogMode.value = 'add'
  editingId.value = null
  form.title = ''
  form.fruit_id = undefined
  form.sort_order = 0
  form.status = enabledCount.value >= 4 ? 0 : 1
  goodsOptions.value = []
  cleanupImage()
  dialogVisible.value = true
}

const handleEdit = (row: BannerItem) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.title = row.title
  form.fruit_id = row.fruit_id
  form.sort_order = row.sort_order
  form.status = row.status
  // 回显已有图片及商品
  goodsOptions.value = row.fruits ? [{ id: row.fruit_id, name: row.fruits.name } as GoodsItem] : []
  cleanupImage()
  imagePreview.value = row.image_url ?? ''
  dialogVisible.value = true
}

const handleDialogClosed = () => {
  formRef.value?.resetFields()
  cleanupImage()
}

// ========== 构建 FormData ==========
const buildFormData = (overrides: Record<string, any> = {}): FormData => {
  const fd = new FormData()
  const data = { ...form, ...overrides }

  if (data.title) fd.append('title', data.title)
  if (data.fruit_id != null) fd.append('fruit_id', String(data.fruit_id))
  if (data.sort_order != null) fd.append('sort_order', String(data.sort_order))
  if (data.status != null) fd.append('status', String(data.status))
  if (imageFile.value) fd.append('image', imageFile.value)

  return fd
}

// ========== 提交 ==========
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (dialogMode.value === 'add' || !editingId.value) {
    if (!imageFile.value) { ElMessage.warning('请上传图片'); return }
  }

  submitLoading.value = true
  try {
    const fd = buildFormData()
    if (dialogMode.value === 'add') {
      await createBanner(fd)
      ElMessage.success('添加成功')
    } else {
      await updateBanner(editingId.value!, fd)
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

fetchList()
</script>

<style scoped>
.banner-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.enabled-count {
  font-size: 13px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 10px;
  border-radius: 10px;
}

.table-card :deep(.el-card__body) {
  padding: 16px;
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

.banner-uploader :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}

.banner-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.banner-uploader-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c939d;
}

.banner-preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

/* 商品选项 */
.goods-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.goods-option-id {
  color: #909399;
  font-size: 12px;
}

.goods-option-name {
  flex: 1;
}

.goods-option-cat {
  flex-shrink: 0;
}
</style>

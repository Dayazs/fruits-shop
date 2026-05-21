<template>
  <div class="category-container">
    <el-card>
      <div class="page-header">
        <span class="page-title">商品分类</span>
        <el-button type="primary" :icon="Plus" @click="handleAdd">添加分类</el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" border stripe v-loading="loading" style="width: 100%">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="id" label="分类ID" width="80" align="center" />
        <el-table-column label="图片" width="90" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              style="width: 50px; height: 50px; border-radius: 4px"
              fit="cover"
              preview-teleported
              :preview-src-list="[row.image]"
            />
            <span v-else class="no-image">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" min-width="140" />
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column label="前台显示" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_show === 1"
              size="small"
              @change="(v: boolean) => handleToggleShow(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
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
      :title="dialogMode === 'add' ? '添加分类' : '编辑分类'"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类图片">
          <div class="upload-wrapper">
            <el-upload
              class="category-uploader"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onImageChange"
            >
              <img v-if="imagePreview" :src="imagePreview" class="uploaded-img" />
              <div v-else class="upload-placeholder">
                <el-icon :size="22"><Plus /></el-icon>
              </div>
            </el-upload>
            <span class="upload-tip">建议尺寸 100×100，大小不超过 2MB</span>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" placeholder="请输入排序值" style="width: 100%" />
        </el-form-item>
        <el-form-item label="前台显示">
          <el-radio-group v-model="form.is_show">
            <el-radio :value="1">显示</el-radio>
            <el-radio :value="0">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="父分类">
          <el-select v-model="form.parent_id" placeholder="无（顶级分类）" clearable style="width: 100%">
            <el-option v-for="cat in parentOptions" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
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
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/api/goods'

const loading = ref(false)
const list = ref<Category[]>([])

const fetchList = async () => {
  loading.value = true
  try {
    const data = (await getCategories()) ?? []
    list.value = [...data].sort((a, b) => a.sort_order - b.sort_order)
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

// ========== 行内切换前台显示 ==========
const handleToggleShow = async (row: Category, v: boolean) => {
  const fd = new FormData()
  fd.append('is_show', v ? '1' : '0')
  try {
    await updateCategory(row.id, fd)
    row.is_show = v ? 1 : 0
    ElMessage.success(v ? '已显示' : '已隐藏')
  } catch {
    // ignore
  }
}

// ========== 删除 ==========
const handleDelete = async (row: Category) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类「${row.name}」吗？如果分类下存在未删除的商品将无法删除。`,
      '提示',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {
    // ignore
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
  name: '',
  parent_id: undefined as number | undefined,
  sort_order: 0,
  is_show: 1,
})

const parentOptions = computed(() =>
  list.value.filter((c) => c.id !== editingId.value),
)

const handleAdd = () => {
  dialogMode.value = 'add'
  editingId.value = null
  form.name = ''
  form.sort_order = 0
  form.is_show = 1
  form.parent_id = undefined
  cleanupImage()
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.name = row.name
  form.sort_order = row.sort_order
  form.is_show = row.is_show
  form.parent_id = row.parent_id || undefined
  cleanupImage()
  imagePreview.value = row.image ?? ''
  dialogVisible.value = true
}

const handleDialogClosed = () => {
  formRef.value?.resetFields()
  cleanupImage()
}

// ========== 构建 FormData ==========
const buildFormData = (): FormData => {
  const fd = new FormData()
  if (form.name) fd.append('name', form.name)
  if (form.parent_id != null) fd.append('parent_id', String(form.parent_id))
  if (form.sort_order != null) fd.append('sort_order', String(form.sort_order))
  if (form.is_show != null) fd.append('is_show', String(form.is_show))
  if (imageFile.value) fd.append('image', imageFile.value)
  return fd
}

// ========== 提交 ==========
const handleSubmit = async () => {
  if (dialogMode.value === 'add' && (!form.name || !form.name.trim())) {
    ElMessage.warning('请输入分类名称')
    return
  }

  submitLoading.value = true
  try {
    const fd = buildFormData()
    if (dialogMode.value === 'add') {
      await createCategory(fd)
      ElMessage.success('添加成功')
    } else {
      await updateCategory(editingId.value!, fd)
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
.category-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
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

.category-uploader :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}

.category-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.upload-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c939d;
}

.uploaded-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}
</style>

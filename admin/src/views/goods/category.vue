<template>
  <div class="category-container">
    <el-card>
      <div class="page-header">
        <span class="page-title">商品分类</span>
        <el-button type="primary" :icon="Plus" @click="handleAdd">添加分类</el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table
        :data="list"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="id" label="分类ID" width="80" align="center" />
        <el-table-column prop="name" label="分类名称" min-width="140" />
        <el-table-column
          prop="sort_order"
          label="排序"
          width="80"
          align="center"
        />
        <el-table-column label="前台显示" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_show === 1 ? 'success' : 'info'" size="small">
              {{ row.is_show === 1 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)"
              >编辑</el-button
            >
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
    </el-card>

    <!-- 编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '添加分类' : '编辑分类'"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="分类名称">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sort_order"
            :min="0"
            placeholder="请输入排序值"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="前台显示">
          <el-radio-group v-model="form.is_show">
            <el-radio :value="1">显示</el-radio>
            <el-radio :value="0">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="父分类">
          <el-select
            v-model="form.parent_id"
            placeholder="无（顶级分类）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="cat in parentOptions"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
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
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryForm,
} from '@/api/goods'

const loading = ref(false)
const list = ref<Category[]>([])
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<CategoryForm>({
  name: '',
  parent_id: undefined,
  sort_order: 0,
  is_show: 1,
})

const parentOptions = computed(() =>
  list.value.filter((c) => c.id !== editingId.value),
)

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

const handleAdd = () => {
  dialogMode.value = 'add'
  editingId.value = null
  form.name = ''
  form.sort_order = 0
  form.is_show = 1
  form.parent_id = undefined
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.name = row.name
  form.sort_order = row.sort_order
  form.is_show = row.is_show
  form.parent_id = row.parent_id || undefined
  dialogVisible.value = true
}

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
    const data = await deleteCategory(row.id)
    if (data) ElMessage.success('删除成功')

    fetchList()
  } catch {
    // 拦截器提示
  }
}

const handleSubmit = async () => {
  if (dialogMode.value === 'add' && (!form.name || !form.name.trim())) {
    ElMessage.warning('请输入分类名称')
    return
  }

  submitLoading.value = true
  try {
    if (dialogMode.value === 'add') {
      const data = await createCategory({
        name: form.name!,
        parent_id: form.parent_id ?? 0,
        sort_order: form.sort_order ?? 0,
        is_show: form.is_show ?? 1,
      })
      if(data) ElMessage.success('添加成功')
      
    } else {
      if (!editingId.value) return
      const payload: CategoryForm = {}
      if (form.name) payload.name = form.name
      if (form.sort_order != null) payload.sort_order = form.sort_order
      if (form.is_show != null) payload.is_show = form.is_show
      payload.parent_id = form.parent_id ?? undefined

      await updateCategory(editingId.value, payload)
      ElMessage.success('编辑成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 拦截器提示
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
</style>

<template>
  <div class="admin-page">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="用户名">
          <el-input v-model="filterForm.username" clearable placeholder="搜索用户名"
            style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" @click="openCreate">新增管理员</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="角色" width="180">
          <template #default="{ row }">
            <el-tag v-if="row.roles" type="success" size="small">{{ row.roles.name }}</el-tag>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该管理员吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="pagination.page" :page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? undefined : 'password'">
          <el-input v-model="form.password" type="password" show-password
            :placeholder="isEdit ? '留空则不修改' : '至少6位'" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role_id" placeholder="请选择角色" clearable style="width: 100%">
            <el-option v-for="r in roleList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

interface AdminItem {
  id: number; username: string; avatar: string | null
  role_id: number | null; created_at: string; updated_at: string
  roles: { id: number; name: string } | null
}
interface RoleItem { id: number; name: string; permissions: string }

const loading = ref(false)
const tableData = ref<AdminItem[]>([])
const roleList = ref<RoleItem[]>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const filterForm = reactive({ username: '' })

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const isEdit = ref(false)
const editId = ref(0)
const form = reactive({ username: '', password: '', role_id: null as number | null })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
}
const dialogTitle = computed(() => isEdit.value ? '编辑管理员' : '新增管理员')

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }

async function fetchRoles() {
  try { const res: any = await request.get('/api/admin/roles'); roleList.value = res || [] } catch { /* */ }
}
async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: pagination.page, pageSize: pagination.pageSize }
    if (filterForm.username) params.username = filterForm.username
    const res: any = await request.get('/api/admin/admins', { params })
    tableData.value = res.list || []; pagination.total = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { pagination.page = 1; fetchList() }
function handleReset() { filterForm.username = ''; pagination.page = 1; fetchList() }
function handlePageChange(p: number) { pagination.page = p; fetchList() }
function handleSizeChange(s: number) { pagination.pageSize = s; pagination.page = 1; fetchList() }

function openCreate() {
  isEdit.value = false; editId.value = 0
  form.username = ''; form.password = ''; form.role_id = null
  dialogVisible.value = true
}
function openEdit(row: AdminItem) {
  isEdit.value = true; editId.value = row.id
  form.username = row.username; form.password = ''; form.role_id = row.role_id
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const body: any = { username: form.username, role_id: form.role_id }
    if (form.password) body.password = form.password
    if (isEdit.value) {
      await request.patch(`/api/admin/admins/${editId.value}`, body)
      ElMessage.success('更新成功')
      useAuthStore().refresh() // 角色变更后刷新权限
    } else {
      await request.post('/api/admin/admins', { ...body, password: form.password })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false; fetchList()
  } catch (err: any) { ElMessage.error(err.response?.data?.msg || '操作失败') }
  finally { submitting.value = false }
}

async function handleDelete(row: AdminItem) {
  try {
    await request.delete(`/api/admin/admins/${row.id}`)
    ElMessage.success('删除成功'); fetchList()
  } catch (err: any) { ElMessage.error(err.response?.data?.msg || '删除失败') }
}

onMounted(() => { fetchRoles(); fetchList() })
</script>

<style scoped>
.admin-page { display: flex; flex-direction: column; gap: 16px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>

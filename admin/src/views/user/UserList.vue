<template>
  <div class="user-page">
    <!-- ===== 筛选栏 ===== -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="用户名">
          <el-input v-model="filterForm.username" placeholder="输入用户名搜索" clearable
            style="width: 180px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册时间">
          <el-date-picker v-model="filterForm.dateRange" type="daterange"
            range-separator="至" start-placeholder="开始" end-placeholder="结束"
            value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Download" @click="handleExport">导出Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ===== 数据表格 ===== -->
    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="160">
          <template #default="{ row }">{{ row.email || '-' }}</template>
        </el-table-column>
        <el-table-column prop="mobile" label="手机号" width="130">
          <template #default="{ row }">{{ row.mobile || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单数" width="80" align="center">
          <template #default="{ row }">{{ row._count?.orders ?? 0 }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="270" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              :type="row.status === 1 ? 'danger' : 'success'"
              size="small"
              @click="handleToggleStatus(row)"
            >{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
            <el-button type="primary" size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button type="warning" size="small" :icon="Key" @click="openResetPwd(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="pagination.page" :page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <!-- ===== 编辑弹窗 ===== -->
    <el-dialog v-model="editVisible" title="编辑用户" width="480px" :close-on-click-modal="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="editForm.mobile" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- ===== 重置密码弹窗 ===== -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="420px" :close-on-click-modal="false">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
        <el-form-item label="新密码" prop="password">
          <el-input v-model="pwdForm.password" type="password" placeholder="至少6位" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="handlePwdSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft, Download, Edit, Key } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import axios from 'axios'
import request from '@/utils/request'

interface UserItem {
  id: number
  username: string
  email: string | null
  mobile: string | null
  avatar: string | null
  openid: string | null
  status: number
  created_at: string
  updated_at: string
  _count: { orders: number; addresses: number }
}

const loading = ref(false)
const tableData = ref<UserItem[]>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const filterForm = reactive({
  username: '',
  status: null as number | null,
  dateRange: null as [string, string] | null,
})

// ===== 编辑 =====
const editVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({ id: 0, username: '', email: '', mobile: '' })
const editRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
}

// ===== 重置密码 =====
const pwdVisible = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ id: 0, password: '' })
const pwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filterForm.username) params.username = filterForm.username
    if (filterForm.status !== null && filterForm.status !== undefined) params.status = filterForm.status
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    const res: any = await request.get('/api/admin/users', { params })
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchUsers()
}

function handleReset() {
  filterForm.username = ''
  filterForm.status = null
  filterForm.dateRange = null
  pagination.page = 1
  fetchUsers()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchUsers()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchUsers()
}

// ===== 编辑 =====
function openEdit(row: UserItem) {
  editForm.id = row.id
  editForm.username = row.username
  editForm.email = row.email || ''
  editForm.mobile = row.mobile || ''
  editVisible.value = true
}

async function handleEditSubmit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  editLoading.value = true
  try {
    await request.patch(`/api/admin/users/${editForm.id}`, {
      username: editForm.username,
      email: editForm.email || null,
      mobile: editForm.mobile || null,
    })
    ElMessage.success('更新成功')
    editVisible.value = false
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.msg || err.message || '更新失败')
  } finally {
    editLoading.value = false
  }
}

// ===== 启用/禁用 =====
async function handleToggleStatus(row: UserItem) {
  try {
    const action = row.status === 1 ? '禁用' : '启用'
    await ElMessageBox.confirm(
      `确定要${action}用户「${row.username}」吗？${row.status === 1 ? '禁用后该用户将无法登录。' : '启用后该用户可正常登录。'}`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    )
    await request.patch(`/api/admin/users/${row.id}/status`)
    ElMessage.success(`已${action}`)
    fetchUsers()
  } catch {
    // 用户取消或请求失败
  }
}

// ===== 重置密码 =====
function openResetPwd(row: UserItem) {
  pwdForm.id = row.id
  pwdForm.password = ''
  pwdVisible.value = true
}

async function handlePwdSubmit() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    await request.patch(`/api/admin/users/${pwdForm.id}/reset-password`, {
      password: pwdForm.password,
    })
    ElMessage.success('密码重置成功')
    pwdVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.response?.data?.msg || err.message || '操作失败')
  } finally {
    pwdLoading.value = false
  }
}

// ===== 导出 =====
async function handleExport() {
  const params: Record<string, any> = {}
  if (filterForm.username) params.username = filterForm.username
  if (filterForm.status !== null && filterForm.status !== undefined) params.status = filterForm.status
  if (filterForm.dateRange) {
    params.startDate = filterForm.dateRange[0]
    params.endDate = filterForm.dateRange[1]
  }
  try {
    const base = import.meta.env.VITE_API_BASE_URL || ''
    const token = localStorage.getItem('token')
    const res = await axios.get(`${base}/api/admin/users/export`, {
      params,
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card .el-form-item {
  margin-bottom: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

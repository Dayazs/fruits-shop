<template>
  <div class="role-page">
    <el-card class="filter-card">
      <el-button type="success" :icon="Plus" @click="openCreate">新增角色</el-button>
    </el-card>

    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="角色名称" width="140" />
        <el-table-column label="权限" min-width="360">
          <template #default="{ row }">
            <template v-if="row.permissions">
              <el-tag v-if="parsePermissions(row.permissions).includes('*')" type="danger" size="small">全部权限</el-tag>
              <el-tag v-else v-for="p in parsePermissions(row.permissions)" :key="p"
                size="small" style="margin-right: 4px; margin-bottom: 4px">
                {{ permLabelMap[p] || p }}
              </el-tag>
            </template>
            <span v-else style="color: #999">无权限</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
              <el-popconfirm title="确定删除该角色吗？" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ===== 新增/编辑弹窗 ===== -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色名" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" style="width: 260px" />
        </el-form-item>
        <el-form-item label="权限" class="perm-form-item">
          <div class="perm-grid">
            <template v-for="group in permGroups" :key="group.parent">
              <div class="perm-group">
                <div class="perm-group-title" @click="group.children.length > 0 && toggleGroup(group.parent)">
                  <el-icon v-if="group.children.length > 0" class="toggle-arrow" :class="{ expanded: expandedGroups.has(group.parent) }">
                    <ArrowRight />
                  </el-icon>
                  <span v-else class="toggle-arrow toggle-placeholder"></span>
                  <el-checkbox
                    :model-value="isParentChecked(group.parent, group.children)"
                    :indeterminate="isParentIndeterminate(group.parent, group.children)"
                    @change="(val: any) => onParentChange(group.parent, group.children, val)"
                  >
                    {{ permLabelMap[group.parent] || group.parent }}
                  </el-checkbox>
                </div>
                <div v-show="expandedGroups.has(group.parent) && group.children.length > 0" class="perm-children">
                  <el-checkbox
                    v-for="child in group.children" :key="child.value"
                    :model-value="form.permissions.includes(child.value)"
                    @change="(val: any) => onChildChange(child.value, val)"
                  >
                    {{ child.name }}
                  </el-checkbox>
                </div>
              </div>
            </template>
          </div>
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
import { Plus, Edit, Delete, ArrowRight } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

interface RoleItem { id: number; name: string; permissions: string; created_at: string }
interface PermItem { id: number; name: string; value: string; parent_value: string | null; description: string | null }

const loading = ref(false)
const tableData = ref<RoleItem[]>([])
const allPerms = ref<PermItem[]>([])

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const isEdit = ref(false)
const editId = ref(0)
const form = reactive({ name: '', permissions: [] as string[] })
const rules = { name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }] }
const dialogTitle = computed(() => isEdit.value ? '编辑角色' : '新增角色')
const expandedGroups = ref(new Set<string>())

function toggleGroup(value: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  expandedGroups.value = next
}

// ─── 父子复选框联动 ───

function isParentChecked(parent: string, children: PermItem[]): boolean {
  if (!children.length) return form.permissions.includes(parent)
  return children.every(c => form.permissions.includes(c.value))
}

function isParentIndeterminate(parent: string, children: PermItem[]): boolean {
  if (!children.length) return false
  const some = children.some(c => form.permissions.includes(c.value))
  const all = children.every(c => form.permissions.includes(c.value))
  return some && !all
}

function onParentChange(parent: string, children: PermItem[], checked: boolean) {
  if (checked) {
    // 勾选父 → 添加父和所有子
    const toAdd = [parent, ...children.map(c => c.value)]
    form.permissions = [...new Set([...form.permissions, ...toAdd])]
  } else {
    // 取消父 → 移除父和所有子
    const toRemove = new Set([parent, ...children.map(c => c.value)])
    form.permissions = form.permissions.filter(p => !toRemove.has(p))
  }
}

function onChildChange(value: string, checked: boolean) {
  if (checked) {
    form.permissions = [...new Set([...form.permissions, value])]
  } else {
    form.permissions = form.permissions.filter(p => p !== value)
  }
}

// ─── 编辑/创建 ───

function openEdit(row: RoleItem) {
  isEdit.value = true; editId.value = row.id
  form.name = row.name
  const perms = parsePermissions(row.permissions)
  form.permissions = perms
  const toExpand = new Set<string>()
  for (const group of permGroups.value) {
    if (group.children.length > 0 && (perms.includes(group.parent) || group.children.some(c => perms.includes(c.value)))) {
      toExpand.add(group.parent)
    }
  }
  expandedGroups.value = toExpand
  dialogVisible.value = true
}

function openCreate() {
  isEdit.value = false; editId.value = 0
  form.name = ''; form.permissions = []
  expandedGroups.value = new Set()
  dialogVisible.value = true
}

// ─── 数据获取 ───

const permLabelMap = computed(() => {
  const map: Record<string, string> = {}
  for (const p of allPerms.value) map[p.value] = p.name
  return map
})

const permGroups = computed(() => {
  const parents = allPerms.value.filter(p => !p.parent_value)
  return parents.map(parent => ({
    parent: parent.value,
    children: allPerms.value.filter(c => c.parent_value === parent.value),
  }))
})

function parsePermissions(p: string): string[] {
  if (!p) return []
  try { return JSON.parse(p) } catch { return [] }
}

async function fetchPerms() {
  try { const res: any = await request.get('/api/admin/permissions'); allPerms.value = res || [] } catch { /* */ }
}
async function fetchList() {
  loading.value = true
  try { const res: any = await request.get('/api/admin/roles'); tableData.value = res || [] } finally { loading.value = false }
}

// ─── CRUD ───

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) {
      await request.patch(`/api/admin/roles/${editId.value}`, { name: form.name, permissions: form.permissions })
      ElMessage.success('更新成功')
      useAuthStore().refresh()
    } else {
      await request.post('/api/admin/roles', { name: form.name, permissions: form.permissions })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false; fetchList()
  } catch (err: any) { ElMessage.error(err.response?.data?.msg || '操作失败') }
  finally { submitting.value = false }
}

async function handleDelete(row: RoleItem) {
  try { await request.delete(`/api/admin/roles/${row.id}`); ElMessage.success('删除成功'); fetchList() }
  catch (err: any) { ElMessage.error(err.response?.data?.msg || '删除失败') }
}

onMounted(() => { fetchPerms(); fetchList() })
</script>

<style scoped>
.role-page { display: flex; flex-direction: column; gap: 16px; }
.action-btns { display: flex; align-items: center; gap: 8px; justify-content: center; }

.perm-form-item { max-height: 420px; overflow-y: auto; }
.perm-grid { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.perm-group {
  padding: 10px 12px; background: #fafafa;
  border-radius: 8px; border: 1px solid #eee;
}

.perm-group-title {
  display: flex; align-items: center; gap: 4px;
  padding-bottom: 8px; border-bottom: 1px solid #eee;
  cursor: pointer; user-select: none;
}

.toggle-arrow { font-size: 14px; transition: transform 0.2s; color: #909399; flex-shrink: 0; }
.toggle-arrow.expanded { transform: rotate(90deg); }
.toggle-placeholder { width: 14px; }

.perm-group-title .el-checkbox { font-weight: 600; }

.perm-children {
  display: flex; flex-wrap: wrap; gap: 6px 20px;
  padding: 8px 0 0 22px;
}
</style>

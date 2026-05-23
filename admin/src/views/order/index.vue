<template>
  <div class="order-container">
    <el-card class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="订单号 / 用户名称" clearable style="width: 200px"
            @clear="handleSearch" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px" @change="handleSearch">
            <el-option v-for="o in ORDER_STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" border stripe v-loading="loading" style="width: 100%">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ (pager.page - 1) * pager.pageSize + $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="order_no" label="订单号" width="230" show-overflow-tooltip />
        <el-table-column label="用户" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.users?.username ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.order_items?.length" class="goods-summary">
              <span v-for="(item, i) in row.order_items.slice(0, 2)" :key="i" class="goods-item">
                {{ item.fruit_name }}（{{ item.spec_name }}）×{{ item.quantity }}
              </span>
              <el-tag v-if="row.order_items.length > 2" size="small" type="info">+{{ row.order_items.length - 2 }}件</el-tag>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110" align="center">
          <template #default="{ row }">¥{{ Number(row.total_amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="收货人" width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.addresses?.receiver_name ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="收货地址" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="row.addresses">
              {{ row.addresses.province }}{{ row.addresses.city }}{{ row.addresses.district }}
              {{ row.addresses.detail_address }}
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.addresses?.receiver_mobile ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ ORDER_STATUS_MAP[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170" align="center">
          <template #default="{ row }">{{ row.created_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status !== 4" size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === 1"
              size="small"
              type="success"
              :icon="Van"
              @click="handleShip(row)"
            >
              发货
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="pager.page" v-model:page-size="pager.pageSize" :total="pager.total"
          :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" background
          @current-change="fetchList" @size-change="fetchList" />
      </div>
    </el-card>

    <!-- 编辑弹框 -->
    <el-dialog v-model="dialogVisible" title="编辑订单" width="500px" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="订单号">{{ editingOrder?.order_no }}</el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="订单备注" />
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
import { Search, Refresh, Edit, Van } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminOrderList,
  adminUpdateOrder,
  shipOrder,
  ORDER_STATUS_MAP,
  ORDER_STATUS_OPTIONS,
  getAvailableStatuses,
  type OrderItem,
  type OrderListQuery,
} from '@/api/order'

const loading = ref(false)
const list = ref<OrderItem[]>([])
const pager = reactive({ page: 1, pageSize: 10, total: 0 })

const query = reactive<OrderListQuery>({ keyword: '', status: undefined })

const statusTagType = (status: number) => {
  const map: Record<number, string> = { 0: 'warning', 1: 'primary', 2: 'info', 3: 'success', 4: 'danger' }
  return map[status] ?? 'info'
}

const handleSearch = () => { pager.page = 1; fetchList() }
const handleReset = () => { query.keyword = ''; query.status = undefined; pager.page = 1; fetchList() }

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAdminOrderList({ keyword: query.keyword || undefined, status: query.status, page: pager.page, pageSize: pager.pageSize })
    list.value = res.list ?? []
    pager.total = res.total ?? 0
  } catch { list.value = []; pager.total = 0 } finally { loading.value = false }
}

// ========== 编辑 ==========
const dialogVisible = ref(false)
const editingOrder = ref<OrderItem | null>(null)
const submitLoading = ref(false)
const form = reactive({ status: 0, remark: '' })

const statusOptions = computed(() => editingOrder.value ? getAvailableStatuses(editingOrder.value.status) : [])

const handleEdit = (row: OrderItem) => {
  editingOrder.value = row
  form.status = row.status
  form.remark = row.remark ?? ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!editingOrder.value) return
  submitLoading.value = true
  try {
    await adminUpdateOrder(editingOrder.value.id, { status: form.status, remark: form.remark })
    ElMessage.success('编辑成功')
    dialogVisible.value = false
    fetchList()
  } catch { /* ignore */ } finally { submitLoading.value = false }
}

// ========== 发货 ==========
const handleShip = async (row: OrderItem) => {
  try {
    await ElMessageBox.confirm(`确定对订单「${row.order_no}」执行发货操作吗？`, '提示', {
      type: 'info', confirmButtonText: '确定发货', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await shipOrder(row.id)
    ElMessage.success('发货成功')
    fetchList()
  } catch { /* ignore */ }
}

fetchList()
</script>

<style scoped>
.order-container { display: flex; flex-direction: column; gap: 16px; }
.search-card :deep(.el-card__body) { padding-bottom: 0; }
.table-card :deep(.el-card__body) { padding: 16px; }
.table-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
.goods-summary { display: flex; flex-direction: column; gap: 2px; }
.goods-item { font-size: 12px; color: #606266; }
.address-contact { font-size: 12px; color: #909399; }
</style>

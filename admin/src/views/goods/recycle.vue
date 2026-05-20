<template>
  <div class="recycle-container">
    <el-card>
      <div class="page-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" @click="$router.push('/goods')">返回商品列表</el-button>
          <span class="page-title">回收站</span>
        </div>
        <el-input
          v-model="query.name"
          placeholder="搜索商品名称"
          clearable
          style="width: 240px"
          @clear="fetchList"
          @keyup.enter="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" border stripe v-loading="loading" style="width: 100%">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ (pager.page - 1) * pager.pageSize + $index + 1 }}</template>
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
        <el-table-column prop="name" label="商品名称" min-width="150" show-overflow-tooltip />
        <el-table-column label="价格" width="100" align="center">
          <template #default="{ row }">¥{{ Number(row.first_sku_price || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="center" />
        <el-table-column label="分类" width="100" align="center">
          <template #default="{ row }">{{ row.category_name }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" :icon="RefreshLeft" @click="handleRestore(row)"
              >恢复</el-button
            >
            <el-button size="small" type="danger" :icon="Delete" @click="handleForceDelete(row)"
              >彻底删除</el-button
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
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { ArrowLeft, Search, RefreshLeft, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRecycleList, forceDeleteGoods, restoreGoods, type GoodsItem } from '@/api/goods'

const loading = ref(false)
const list = ref<GoodsItem[]>([])
const pager = reactive({ page: 1, pageSize: 10, total: 0 })
const query = reactive({ name: '' })

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getRecycleList({
      keyword: query.name || undefined,
      page: pager.page,
      pageSize: pager.pageSize,
    })
    list.value = res.list ?? []
    pager.total = res.total ?? 0
  } catch {
    list.value = []
    pager.total = 0
  } finally {
    loading.value = false
  }
}

const handleRestore = async (row: GoodsItem) => {
  try {
    await ElMessageBox.confirm(`确定要恢复商品「${row.name}」吗？`, '提示', {
      type: 'info',
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await restoreGoods(row.id)
    ElMessage.success('已恢复')
    fetchList()
  } catch {
    // 已由拦截器提示
  }
}

const handleForceDelete = async (row: GoodsItem) => {
  try {
    await ElMessageBox.confirm('此操作将永久删除该商品，不可恢复，确定继续？', '警告', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }

  try {
    await forceDeleteGoods(row.id)
    ElMessage.success('已永久删除')
    fetchList()
  } catch {
    // 已由拦截器提示
  }
}

fetchList()
</script>

<style scoped>
.recycle-container {
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
  gap: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-card :deep(.el-card__body) {
  padding: 16px;
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
</style>

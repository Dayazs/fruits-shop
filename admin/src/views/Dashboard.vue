<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="border-left-color: #409EFF">
          <div class="stat-body">
            <div class="stat-value">{{ stats.todayOrders }}</div>
            <div class="stat-label">今日订单</div>
          </div>
          <el-icon :size="48" color="#409EFF20"><tickets /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left-color: #67C23A">
          <div class="stat-body">
            <div class="stat-value">&yen;{{ formatMoney(stats.todaySales) }}</div>
            <div class="stat-label">今日销售总额</div>
          </div>
          <el-icon :size="48" color="#67C23A20"><money /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left-color: #E6A23C">
          <div class="stat-body">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">用户总数</div>
          </div>
          <el-icon :size="48" color="#E6A23C20"><user /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left-color: #F56C6C">
          <div class="stat-body">
            <div class="stat-value">{{ stats.pendingOrders }}</div>
            <div class="stat-label">待处理订单</div>
          </div>
          <el-icon :size="48" color="#F56C6C20"><document /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区：每行两个 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">最近一周每日订单量</div>
          <div ref="ordersChartRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">最近一周每日销售总额</div>
          <div ref="salesChartRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">最近一周每日已完成订单</div>
          <div ref="completedChartRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">最近一周新增用户</div>
          <div ref="usersChartRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Tickets, Money, User, Document } from '@element-plus/icons-vue'
import { getDashboardStats, type DashboardStats, type WeeklyItem } from '@/api/dashboard'

const stats = ref<DashboardStats>({
  todayOrders: 0,
  todaySales: 0,
  totalUsers: 0,
  pendingOrders: 0,
})
const weekly = ref<WeeklyItem[]>([])

const ordersChartRef = ref<HTMLDivElement>()
const salesChartRef = ref<HTMLDivElement>()
const completedChartRef = ref<HTMLDivElement>()
const usersChartRef = ref<HTMLDivElement>()

function formatMoney(val: number) {
  return val.toFixed(2)
}

function makeLineOption(data: number[], color: string) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category' as const,
      data: weekly.value.map((d) => d.date.slice(5)),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed' as const } },
    },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color },
        areaStyle: { color: `${color}1a` },
      },
    ],
  }
}

function initCharts() {
  if (!ordersChartRef.value || !salesChartRef.value || !completedChartRef.value || !usersChartRef.value) return

  const ordersChart = echarts.init(ordersChartRef.value)
  const salesChart = echarts.init(salesChartRef.value)
  const completedChart = echarts.init(completedChartRef.value)
  const usersChart = echarts.init(usersChartRef.value)

  ordersChart.setOption(makeLineOption(weekly.value.map((d) => d.orders), '#409EFF'))
  salesChart.setOption(makeLineOption(weekly.value.map((d) => d.sales), '#67C23A'))
  completedChart.setOption(makeLineOption(weekly.value.map((d) => d.completed), '#E6A23C'))
  usersChart.setOption(makeLineOption(weekly.value.map((d) => d.users), '#9b59b6'))

  const allCharts = [ordersChart, salesChart, completedChart, usersChart]
  window.addEventListener('resize', () => {
    allCharts.forEach((c) => c.resize())
  })
}

onMounted(async () => {
  try {
    const data = await getDashboardStats()
    stats.value = data.stats
    weekly.value = data.weekly
    await nextTick()
    initCharts()
  } catch {
    // error handled in interceptor
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-left: 4px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.chart-box {
  width: 100%;
  height: 320px;
}
</style>

import request from '@/utils/request'

export interface DashboardStats {
  todayOrders: number
  todaySales: number
  totalUsers: number
  pendingOrders: number
}

export interface WeeklyItem {
  date: string
  orders: number
  sales: number
  completed: number
  users: number
}

export interface DashboardData {
  stats: DashboardStats
  weekly: WeeklyItem[]
}

export const getDashboardStats = () =>
  request.get('/api/dashboard/stats') as Promise<DashboardData>

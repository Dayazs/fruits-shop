import prisma from '../lib/prisma'

export const dashboardService = {
  async getStats() {
    // 今日统计：销售额仅统计已支付订单 (status 1/2/3)，排除待付款(0)和已取消(4)
    const [todayOrders, todaySales, totalUsers, pendingOrders] = await Promise.all([
      prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURDATE()`,
      ),
      prisma.$queryRawUnsafe<[{ total: number }]>(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE DATE(created_at) = CURDATE() AND status NOT IN (0, 4)`,
      ),
      prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(*) as cnt FROM users`,
      ),
      prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(*) as cnt FROM orders WHERE status = 0`,
      ),
    ])

    return {
      todayOrders: Number(todayOrders[0].cnt),
      todaySales: Number(todaySales[0].total),
      totalUsers: Number(totalUsers[0].cnt),
      pendingOrders: Number(pendingOrders[0].cnt),
    }
  },

  async getWeeklyStats() {
    const [orderRows, userRows] = await Promise.all([
      prisma.$queryRawUnsafe<
        Array<{ date: string; orders: bigint; sales: number; completed: bigint }>
      >(
        `SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') as date,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN status NOT IN (0, 4) THEN total_amount ELSE 0 END), 0) as sales,
          SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as completed
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC`,
      ),
      prisma.$queryRawUnsafe<
        Array<{ date: string; users: bigint }>
      >(
        `SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') as date,
          COUNT(*) as users
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC`,
      ),
    ])

    // 填充缺失日期
    const result: Array<{
      date: string
      orders: number
      sales: number
      completed: number
      users: number
    }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const orderFound = orderRows.find((r) => r.date === dateStr)
      const userFound = userRows.find((r) => r.date === dateStr)
      result.push({
        date: dateStr,
        orders: orderFound ? Number(orderFound.orders) : 0,
        sales: orderFound ? Number(orderFound.sales) : 0,
        completed: orderFound ? Number(orderFound.completed) : 0,
        users: userFound ? Number(userFound.users) : 0,
      })
    }

    return result
  },
}

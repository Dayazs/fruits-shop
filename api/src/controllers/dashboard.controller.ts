import { Request, Response } from 'express'
import { dashboardService } from '../service/dashboard.service'

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [stats, weekly] = await Promise.all([
      dashboardService.getStats(),
      dashboardService.getWeeklyStats(),
    ])
    res.status(200).json({ code: 200, msg: '获取成功', data: { stats, weekly } })
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message })
  }
}

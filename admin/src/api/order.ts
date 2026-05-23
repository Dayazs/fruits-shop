import request from '@/utils/request'

export interface OrderAddress {
  id: number
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district: string
  detail_address: string
}

export interface OrderUser {
  id: number
  username: string
  mobile: string | null
}

export interface OrderItemEntry {
  id: number
  fruit_id: number
  sku_id: number
  fruit_name: string
  spec_name: string
  price: string
  quantity: number
  total_price: string
  main_image: string
}

export interface OrderItem {
  id: number
  order_no: string
  user_id: number
  total_amount: string
  status: number
  address_id: number
  remark: string | null
  pay_time: string | null
  ship_time: string | null
  finish_time: string | null
  created_at: string
  updated_at: string
  users?: OrderUser
  addresses?: OrderAddress
  order_items?: OrderItemEntry[]
}

export interface OrderListQuery {
  page?: number
  pageSize?: number
  status?: number
  keyword?: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export const ORDER_STATUS_MAP: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '待收货',
  3: '已完成',
  4: '已取消',
}

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_MAP).map(
  ([value, label]) => ({ value: Number(value), label }),
)

/** 根据当前状态返回可切换的目标状态（始终包含当前状态以便显示） */
export function getAvailableStatuses(current: number): { value: number; label: string }[] {
  if (current === 4) return [ORDER_STATUS_OPTIONS.find((o) => o.value === 4)!]
  if (current === 1) return ORDER_STATUS_OPTIONS.filter((o) => o.value === 1 || o.value === 2 || o.value === 4)
  return ORDER_STATUS_OPTIONS.filter((o) => o.value === current || o.value === 4)
}

export function getAdminOrderList(params: OrderListQuery) {
  return request.get<unknown, PageResult<OrderItem>>('/api/order/admin/list', { params })
}

export function getAdminOrderDetail(orderId: number) {
  return request.get<unknown, OrderItem>(`/api/order/admin/${orderId}`)
}

export function adminUpdateOrder(orderId: number, data: { address_id?: number; remark?: string; status?: number }) {
  return request.patch(`/api/order/admin/${orderId}`, data)
}

export function shipOrder(orderId: number) {
  return request.patch(`/api/order/admin/${orderId}/ship`)
}

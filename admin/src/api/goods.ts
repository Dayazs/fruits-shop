import request from '@/utils/request'

// ========== 类型：匹配后端 snake_case 格式 ==========

export interface GoodsSku {
  id?: number
  fruit_id?: number
  spec_name: string
  weight: string
  price: number
  original_price: number
  stock: number
  sku_code?: string
  sales?: number
  image: string
}

/** 后端 SKU 返回的 price/original_price 为字符串，统一转为 number */
export function normalizeSku(raw: Record<string, any>): GoodsSku {
  return {
    id: raw.id,
    fruit_id: raw.fruit_id,
    spec_name: raw.spec_name ?? '',
    weight: String(raw.weight ?? ''),
    price: Number(raw.price) || 0,
    original_price: Number(raw.original_price) || 0,
    stock: Number(raw.stock) || 0,
    sku_code: raw.sku_code,
    sales: raw.sales,
    image: raw.image ?? '',
  }
}

export interface GoodsItem {
  id: number
  name: string
  category_id: number
  categories?: { id: number; name: string }
  description: string
  main_image: string
  images: string
  status: number
  sort_order: number
  first_sku_price: number | string
  total_stock: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface GoodsForm {
  name: string
  category_id: number
  description: string
  main_image: string
  images: string
  status: number
  skus: GoodsSku[]
}

export interface GoodsQuery {
  name?: string
  categoryId?: number
  status?: number
  page?: number
  pageSize?: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface Category {
  id: number
  name: string
  parent_id: number
  sort_order: number
  image: string | null
  is_show: number
  created_at: string
  updated_at: string
}

export interface GoodsSkusResult {
  goodsId: number
  goodsName: string
  skus: GoodsSku[]
}

// ========== 工具函数 ==========

export function parseImages(item: GoodsItem): string[] {
  if (!item.images) return []
  try {
    return JSON.parse(item.images) as string[]
  } catch {
    return []
  }
}

export function getSkuPrice(item: GoodsItem): number {
  return Number(item.first_sku_price) || 0
}

export function getSkuTotalStock(item: GoodsItem): number {
  return item.total_stock ?? 0
}

// ========== API ==========

export function getGoodsList(params: GoodsQuery) {
  return request.get<unknown, PageResult<GoodsItem>>('/api/goods/admin/list', { params })
}

export function getGoodsSkus(id: number) {
  return request.get<unknown, GoodsSkusResult>(`/api/goods/admin/${id}/skus`)
}

export function createGoods(formData: FormData) {
  return request.post('/api/goods/admin/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateGoods(id: number, formData: FormData) {
  return request.patch(`/api/goods/admin/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function toggleGoodsStatus(id: number) {
  return request.patch(`/api/goods/admin/${id}/status`)
}

export function deleteGoods(id: number) {
  return request.delete(`/api/goods/admin/${id}`)
}

export function restoreGoods(id: number) {
  return request.patch(`/api/goods/admin/${id}/restoregoods`)
}

export function getRecycleList(params: { page?: number; pageSize?: number; keyword?: string }) {
  return request.get<unknown, PageResult<GoodsItem>>('/api/goods/admin/recycle', { params })
}

export function forceDeleteGoods(id: number) {
  return request.delete(`/api/goods/admin/${id}/hard`)
}

export interface CategoryForm {
  name?: string
  parent_id?: number
  sort_order?: number
  is_show?: number
}

export function createCategory(data: CategoryForm) {
  return request.post('/api/goods/admin/categories', data)
}

export function getCategories() {
  return request.get<unknown, Category[]>('/api/goods/admin/categories')
}

export function updateCategory(id: number, data: CategoryForm) {
  return request.patch(`/api/goods/admin/categories/${id}`, data)
}

export function deleteCategory(id: number) {
  return request.delete(`/api/goods/admin/categories/${id}`)
}

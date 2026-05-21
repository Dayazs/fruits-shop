import request from '@/utils/request'

export interface BannerItem {
  id: number
  title: string
  image_url: string
  fruit_id: number
  link_url: string | null
  sort_order: number
  status: number
  created_at: string
  updated_at: string
  fruits?: { id: number; name: string }
}

export interface BannerForm {
  title?: string
  fruit_id?: number
  link_url?: string
  sort_order?: number
  status?: number
}

export function getBanners() {
  return request.get<unknown, BannerItem[]>('/api/banners')
}

export function createBanner(formData: FormData) {
  return request.post('/api/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateBanner(id: number, formData: FormData) {
  return request.patch(`/api/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteBanner(id: number) {
  return request.delete(`/api/banners/${id}`)
}

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import request from '@/utils/request'

interface AdminInfo {
  id: number
  username: string
  avatar: string | null
  role: string
  permissions: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<AdminInfo>(
    JSON.parse(localStorage.getItem('userInfo') || '{}') as AdminInfo,
  )
  const permissions = ref<string[]>(
    JSON.parse(localStorage.getItem('permissions') || '[]'),
  )

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '管理员')
  const avatar = computed(() => userInfo.value?.avatar || '')
  const roleName = computed(() => userInfo.value?.role || '')
  const hasPermission = (perm: string) => {
    if (permissions.value.includes('*')) return true
    return permissions.value.includes(perm)
  }

  async function login(username: string, password: string) {
    const data = await request.post('/api/admin/login', { username, password }) as any
    const info: AdminInfo = {
      id: data.id,
      username: data.username,
      avatar: data.avatar,
      role: data.role,
      permissions: data.permissions,
    }
    token.value = data.token
    userInfo.value = info
    permissions.value = data.permissions

    localStorage.setItem('token', data.token)
    localStorage.setItem('userInfo', JSON.stringify(info))
    localStorage.setItem('permissions', JSON.stringify(data.permissions))
  }

  function logout() {
    token.value = ''
    userInfo.value = {} as AdminInfo
    permissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('permissions')
    window.location.replace('/login')
  }

  async function refresh() {
    try {
      const data = await request.get('/api/admin/me') as any
      const info: AdminInfo = {
        id: data.id,
        username: data.username,
        avatar: data.avatar,
        role: data.role,
        permissions: data.permissions,
      }
      userInfo.value = info
      permissions.value = data.permissions
      localStorage.setItem('userInfo', JSON.stringify(info))
      localStorage.setItem('permissions', JSON.stringify(data.permissions))
    } catch {
      // 刷新失败不影响当前操作
    }
  }

  return {
    token,
    userInfo,
    permissions,
    isLoggedIn,
    username,
    avatar,
    roleName,
    hasPermission,
    login,
    logout,
    refresh,
  }
})

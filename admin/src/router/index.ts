import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', requiresAuth: true, permission: 'dashboard' },
      },
      {
        path: 'banner',
        name: 'Banner',
        component: () => import('@/views/banner/index.vue'),
        meta: { title: '轮播图管理', requiresAuth: true, permission: 'dashboard' },
      },
      {
        path: 'goods',
        name: 'Goods',
        component: () => import('@/views/goods/index.vue'),
        meta: { title: '商品页', requiresAuth: true, permission: 'goods' },
      },
      {
        path: 'goods/category',
        name: 'GoodsCategory',
        component: () => import('@/views/goods/category.vue'),
        meta: { title: '商品分类', requiresAuth: true, permission: 'goods' },
      },
      {
        path: 'goods/recycle',
        name: 'GoodsRecycle',
        component: () => import('@/views/goods/recycle.vue'),
        meta: { title: '回收站', requiresAuth: true, permission: 'goods' },
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/views/order/index.vue'),
        meta: { title: '订单列表', requiresAuth: true, permission: 'order' },
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/admin/index.vue'),
        meta: { title: '管理员页', requiresAuth: true, permission: 'admin' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
})

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')

  // 访问登录页直接放行
  if (to.path === '/login') {
    if (token) {
      return '/'
    } else {
      return true
    }
  }

  // 需要登录的页面
  if (!token) {
    return '/login'
  }

  // 对于已登录的用户访问除登录页时，进行权限检查
  const requiredPermission = to.meta?.permission
  if (requiredPermission === 'dashboard') {
    return true
  }

  try {
    const permissionsStr = localStorage.getItem('permissions')

    // 没有权限或者为空数组先放行
    if (!permissionsStr || permissionsStr === '[]') {
      return true
    }

    const permission = JSON.parse(permissionsStr)

    // 超级管理员有所有权限
    if (Array.isArray(permission) && permission.includes('*')) {
      return true
    }

    // 检查路由权限
    if (
      !requiredPermission ||
      (Array.isArray(permission) && permission.includes(requiredPermission))
    ) {
      return true
    } else {
      return '/dashboard'
    }
  } catch (err) {}
})

export default router

<template>
  <div class="layout-container">
    <el-container class="layout-inner">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
        <div class="logo" @click="toggleCollapse">
          <el-icon :size="24"><apple /></el-icon>
          <span v-show="!isCollapse" class="logo-text">水果商城后台</span>
        </div>

        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><home-filled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>

          <el-menu-item index="/banner">
            <el-icon><picture-filled /></el-icon>
            <template #title>轮播图管理</template>
          </el-menu-item>

          <el-sub-menu index="goods">
            <template #title>
              <el-icon><goods /></el-icon>
              <span>商品管理</span>
            </template>
            <el-menu-item index="/goods">
              <el-icon><list /></el-icon>
              <span>商品列表</span>
            </el-menu-item>
            <el-menu-item index="/goods/category">
              <el-icon><collection-tag /></el-icon>
              <span>商品分类</span>
            </el-menu-item>
            <el-menu-item index="/goods/recycle">
              <el-icon><delete /></el-icon>
              <span>回收站</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="order">
            <template #title>
              <el-icon><tickets /></el-icon>
              <span>订单管理</span>
            </template>
            <el-menu-item index="/order">
              <el-icon><document /></el-icon>
              <span>订单列表</span>
            </el-menu-item>
            <el-menu-item index="order-refund">
              <el-icon><money /></el-icon>
              <span>退款管理</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="user">
            <template #title>
              <el-icon><user /></el-icon>
              <span>用户管理</span>
            </template>
            <el-menu-item index="user-list">
              <el-icon><avatar /></el-icon>
              <span>用户列表</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- <el-sub-menu index="marketing">
            <template #title>
              <el-icon><present /></el-icon>
              <span>营销管理</span>
            </template>
            <el-menu-item index="coupon">
              <el-icon><discount /></el-icon>
              <span>优惠券</span>
            </el-menu-item>
            <el-menu-item index="/banner">
              <el-icon><picture-filled /></el-icon>
              <span>轮播图</span>
            </el-menu-item>
          </el-sub-menu> -->

          <el-sub-menu index="system">
            <template #title>
              <el-icon><setting /></el-icon>
              <span>系统设置</span>
            </template>
            <el-menu-item index="admin-list">
              <el-icon><user-filled /></el-icon>
              <span>管理员列表</span>
            </el-menu-item>
            <el-menu-item index="role">
              <el-icon><lock /></el-icon>
              <span>角色管理</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-container class="layout-main">
        <el-header class="layout-header">
          <div class="header-left">
            <el-icon
              class="collapse-btn"
              :size="22"
              @click="toggleCollapse"
            >
              <fold v-if="!isCollapse" />
              <expand v-else />
            </el-icon>
            <el-breadcrumb separator="/">
              <!-- <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item> -->
              <el-breadcrumb-item v-if="breadcrumbTitle">{{ breadcrumbTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown trigger="click" @command="handleCommand">
              <div class="user-info">
                <el-avatar :size="32" icon="UserFilled" />
                <span class="username">{{ authStore.username }}</span>
                <el-icon><arrow-down /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="layout-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  Apple,
  HomeFilled,
  Goods,
  List,
  CollectionTag,
  Tickets,
  Document,
  Money,
  User,
  Avatar,
  Present,
  Discount,
  PictureFilled,
  Setting,
  UserFilled,
  Lock,
  Fold,
  Expand,
  ArrowDown,
  Delete,
} from '@element-plus/icons-vue'

const route = useRoute()
const authStore = useAuthStore()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)

const breadcrumbTitle = computed(() => route.meta.title as string | undefined)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      authStore.logout()
    } catch {
      // 用户取消
    }
  }
}
</script>

<style scoped>
.layout-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.layout-inner {
  height: 100%;
}

.layout-aside {
  background-color: #304156;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.3s;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  color: #fff;
  cursor: pointer;
  user-select: none;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.el-menu {
  border-right: none;
}

.layout-main {
  flex-direction: column;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  cursor: pointer;
  color: #666;
}

.collapse-btn:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #333;
}

.username {
  font-size: 14px;
}

.layout-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>

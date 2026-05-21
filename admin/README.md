# 水果商城后台管理系统

基于 Vue 3 + Element Plus 的单页应用（SPA）后台管理系统。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.5 (Composition API + `<script setup>`) |
| 语言 | TypeScript 6.0 |
| UI 库 | Element Plus 2.14 |
| 路由 | Vue Router 5 |
| 状态管理 | Pinia 3 |
| HTTP | Axios |
| 构建 | Vite 8 |

## 目录结构

```
src/
├── api/              # API 模块
│   ├── banner.ts     # 轮播图接口
│   └── goods.ts      # 商品、分类接口
├── layout/           # 布局
│   └── index.vue     # 主布局（侧栏 + 顶栏 + 内容区）
├── router/           # 路由配置
│   └── index.ts
├── utils/            # 工具
│   └── request.ts    # Axios 实例（拦截器、鉴权）
├── views/            # 页面
│   ├── Login.vue     # 登录页
│   ├── Dashboard.vue # 控制台
│   ├── banner/       # 轮播图管理
│   │   └── index.vue
│   ├── goods/        # 商品管理
│   │   ├── index.vue     # 商品列表
│   │   ├── category.vue  # 商品分类
│   │   └── recycle.vue   # 回收站
│   └── admin/        # 管理员页
│       └── index.vue
├── App.vue
└── main.ts
```

## 页面功能

### 登录
- 用户名/密码登录
- 登录后 token 存入 localStorage，请求拦截器自动携带

### 控制台
- 预留框架，待实现数据统计面板

### 轮播图管理
- 列表展示（ID、图片缩略图、标题、关联商品、排序、状态）
- 行内状态切换（启用上限 4 个）
- 添加/编辑弹框（标题、图片上传、关联商品远程搜索选择）
- 删除（确认弹框）

### 商品管理
- **商品列表**：搜索筛选（名称/分类/状态）、分页、上架/下架切换、软删除
- **添加商品**：form-data 提交，主图/副图/SKU 图本地暂存后统一上传，SKU 动态增删（含规格名/重量/售价/原价/库存），表单校验
- **编辑商品**：回填所有字段和 SKU，切换为新 SKU 接口获取完整数据
- **商品分类**：分类列表（图片/名称/排序），行内状态切换，添加/编辑弹框（图片上传、父分类选择）
- **回收站**：已删除商品列表，支持恢复和物理删除

### 校验规则
- 商品名称/描述/规格名称：不能为纯数字或纯英文字母
- SKU 售价 > 0，原价 > 售价，上限 99999
- 至少保留一个 SKU

## 开发命令

```sh
pnpm dev          # 启动开发服务器 (localhost:10041)
pnpm build        # 生产构建 + 类型检查
pnpm type-check   # 仅类型检查
```

## 代理配置

开发服务器代理至后端 `localhost:10040`：
- `/api` → `http://localhost:10040`
- `/uploads` → `http://localhost:10040`

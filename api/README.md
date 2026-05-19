## 项目结构

```
src
├─ main.ts                     // 项目启动入口
├─ app.ts                      // express 配置中心
├─ lib/                        // 公共库
│  └─ prisma.ts                // Prisma 客户端单例
├─ routes/                     // 路由层
│  ├─ index.ts                 // 路由汇总
│  ├─ user.route.ts            // 用户路由
│  ├─ admin.route.ts           // 管理员路由
│  └─ goods.route.ts           // 商品路由
├─ controllers/                // 控制器层
│  ├─ user.controller.ts       // 用户控制器
│  ├─ admin.controller.ts      // 管理员控制器
│  └─ goods.controller.ts      // 商品控制器
├─ service/                    // 业务层
│  ├─ user.service.ts          // 用户业务
│  ├─ admin.service.ts         // 管理员业务
│  └─ goods.service.ts         // 商品业务
├─ middleware/                  // 中间件
│  ├─ auth.ts                  // 认证 + 管理员权限
│  └─ upload.ts                // 文件上传
├─ utils/                      // 工具函数
│  ├─ token.ts                 // JWT 生成与校验
│  └─ file.ts                  // 文件操作（目录创建、移动、清理）
└─ scripts/                    // 脚本
   └─ init-admin.ts            // 初始化管理员
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `PORT` | 服务端口，默认 10040 |
| `DATABASE_URL` | MySQL 连接字符串 |
| `JWT_SECRET` | access_token 签名密钥 |
| `REFRESH_TOKEN_SECRET` | refresh_token 签名密钥 |

## 启动

```bash
pnpm install
npx prisma generate
pnpm start
```

## API 接口

### 通用说明

- 基础路径：`/api`
- 认证方式：请求头 `Authorization: Bearer <token>`
- 响应格式：`{ code: number, msg: string, data?: any }`

---

### 用户接口 `/api/user`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/getUser` | 测试接口 | 否 |
| POST | `/login` | 用户登录 | 否 |
| POST | `/register` | 用户注册 | 否 |
| POST | `/logout` | 用户登出 | 是 |

---

### 管理员接口 `/api/admin`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/login` | 管理员登录 | 否 |

---

### 商品接口 `/api/goods`

#### 添加商品

```
POST /api/goods/admin/create
Content-Type: multipart/form-data
```

认证：管理员（Bearer Token）

##### 上传字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 商品名称 |
| category_id | string | 是 | 分类 ID |
| description | string | 否 | 商品描述 |
| status | string | 否 | 状态：0-下架 1-上架，默认 1 |
| sort_order | string | 否 | 排序，默认 0 |
| skus | string | 是 | SKU 列表（JSON 字符串） |
| main_image | file | 否 | 主图（1 张） |
| images | file[] | 否 | 副图（多张） |
| sku_image | file[] | 否 | SKU 图片，按顺序对应 skus 数组 |

##### SKU JSON 结构（skus 字段）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| spec_name | string | 是 | 规格名称，如"5斤装" |
| weight | number | 否 | 重量（斤） |
| price | number | 是 | 售价 |
| original_price | number | 否 | 原价 |
| stock | number | 是 | 库存 |

`sku_code` 由后端自动生成。

##### 图片上传与回滚机制

1. 文件先上传到 `uploads/temp/{随机ID}/` 临时目录
2. 参数校验通过后，将临时文件移动到 `uploads/goods/{随机名}/` 正式目录
3. 数据库事务写入成功后返回响应
4. **失败回滚**：
   - 参数校验失败 → 清理临时目录
   - 数据库写入失败 → 清理临时目录 + 已迁移的正式目录
   - 认证/鉴权失败 → `autoCleanupTemp` 中间件自动清理临时目录
5. 请求结束后，临时目录由中间件兜底清理，确保不留残留文件

##### 上传限制

- 仅允许图片格式（`image/*`）
- 单文件最大 5MB

##### 请求示例（curl）

```bash
curl -X POST http://localhost:10040/api/goods/admin/create \
  -H "Authorization: Bearer <admin_token>" \
  -F "name=山东红富士苹果" \
  -F "category_id=1" \
  -F "description=脆甜多汁的山东红富士" \
  -F "status=1" \
  -F "sort_order=1" \
  -F 'skus=[{"spec_name":"5斤装","weight":5,"price":29.9,"original_price":39.9,"stock":100},{"spec_name":"10斤装","weight":10,"price":49.9,"original_price":69.9,"stock":50}]' \
  -F "main_image=@/path/to/main.jpg" \
  -F "images=@/path/to/detail1.jpg" \
  -F "images=@/path/to/detail2.jpg" \
  -F "sku_image=@/path/to/sku1.jpg" \
  -F "sku_image=@/path/to/sku2.jpg"
```

##### 响应示例

```json
{
  "code": 200,
  "msg": "添加商品成功",
  "data": {
    "fruit": {
      "id": 1,
      "name": "山东红富士苹果",
      "category_id": 1,
      "status": 1,
      "sort_order": 1
    },
    "skus": [
      {
        "id": 1,
        "fruit_id": 1,
        "spec_name": "5斤装",
        "sku_code": "SKUMK4XG2C8AB3XY",
        "price": "29.9",
        "stock": 100
      }
    ]
  }
}
```

---

#### 后台商品列表

```
GET /api/goods/admin/list
```

认证：管理员（Bearer Token）

查询参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |
| keyword | string | 否 | 搜索关键词（模糊匹配商品名称） |
| categoryId | number | 否 | 分类 ID 筛选 |
| status | number | 否 | 状态筛选：0-下架 1-上架 |

请求示例：

```
GET /api/goods/admin/list?page=1&pageSize=10&keyword=苹果&categoryId=1&status=1
```

响应示例：

```json
{
  "code": 200,
  "msg": "获取商品列表成功",
  "data": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "list": [
      {
        "id": 1,
        "name": "山东红富士苹果",
        "category_id": 1,
        "description": "脆甜多汁",
        "main_image": "/uploads/apple.jpg",
        "images": "[\"/uploads/apple1.jpg\"]",
        "status": 1,
        "sort_order": 1,
        "created_at": "2026-05-19T12:00:00.000Z",
        "updated_at": "2026-05-19T12:00:00.000Z",
        "fruit_skus": [
          {
            "id": 1,
            "fruit_id": 1,
            "spec_name": "5斤装",
            "weight": "5.00",
            "price": "29.90",
            "original_price": "39.90",
            "stock": 100,
            "sku_code": "SKUMK4XG2C8AB3XY",
            "sales": 0,
            "image": "/uploads/apple-5.jpg"
          }
        ],
        "categories": {
          "id": 1,
          "name": "国产水果"
        }
      }
    ]
  }
}
```

## 技术栈

- **运行时**：Node.js + Express 5
- **语言**：TypeScript
- **ORM**：Prisma 5
- **数据库**：MySQL 8.0
- **认证**：JWT（jsonwebtoken）
- **文件上传**：multer + fs-extra
- **密码加密**：bcryptjs

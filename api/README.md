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
│  ├─ goods.route.ts           // 商品路由
│  ├─ banner.route.ts          // 轮播图路由
│  ├─ home.route.ts            // C 端首页路由
│  └─ order.route.ts           // 订单路由
├─ controllers/                // 控制器层
│  ├─ user.controller.ts       // 用户控制器
│  ├─ admin.controller.ts      // 管理员控制器
│  ├─ goods.controller.ts      // 商品控制器
│  ├─ banner.controller.ts     // 轮播图控制器
│  ├─ home.controller.ts       // 首页控制器
│  └─ order.controller.ts      // 订单控制器
├─ service/                    // 业务层
│  ├─ user.service.ts          // 用户业务
│  ├─ admin.service.ts         // 管理员业务
│  ├─ goods.service.ts         // 商品业务
│  ├─ banner.service.ts        // 轮播图业务
│  ├─ order.service.ts         // 订单业务
│  ├─ pay.service.ts           // 支付业务
│  └─ cart.service.ts          // 购物车业务
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
| `APPID` | 微信小程序 AppID |
| `APP_SECRET` | 微信小程序 AppSecret |
| `MCH_ID` | 微信支付商户号 |
| `PAY_API_V3_KEY` | 微信支付 V3 API 密钥（32 位） |
| `PAY_SERIAL_NO` | 商户证书序列号 |
| `PAY_KEY_PATH` | 商户私钥路径（如 `./certs/apiclient_key.pem`） |
| `PAY_CERT_PATH` | 商户证书路径（如 `./certs/apiclient_cert.pem`） |
| `PAY_NOTIFY_URL` | 微信支付回调地址（需外网可达） |

### 微信支付证书

使用微信支付 V3 需将商户证书放入 `certs/` 目录：

```
api/certs/
├── apiclient_key.pem    # 商户私钥
└── apiclient_cert.pem   # 商户证书
```

然后在 `.env` 中填入 `PAY_API_V3_KEY`（32 位密钥）和 `PAY_SERIAL_NO`（证书序列号）。

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
| POST | `/login` | 用户登录（账号密码） | 否 |
| POST | `/wx-login` | 微信一键登录 | 否 |
| POST | `/register` | 用户注册 | 否 |
| GET | `/profile` | 获取用户信息 | 是 |
| PATCH | `/profile` | 更新用户信息 | 是 |
| POST | `/logout` | 用户登出 | 是 |
| POST | `/addresses` | 添加收货地址 | 是 |
| GET | `/addresses` | 获取收货地址列表 | 是 |
| PATCH | `/addresses/:addressId` | 编辑收货地址 | 是 |
| DELETE | `/addresses/:addressId` | 删除收货地址 | 是 |
| GET | `/cart` | 获取购物车列表 | 是 |
| POST | `/cart` | 加入购物车 | 是 |
| PATCH | `/cart/:cartId` | 更新购物车数量 | 是 |
| DELETE | `/cart/:cartId` | 移出购物车 | 是 |

#### 微信一键登录

```
POST /api/user/wx-login
Content-Type: application/json
```

无需认证。

##### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 调用 `wx.login()` 获取的临时凭证 |
| nickname | string | 否 | 微信昵称（首次登录时作为用户名） |
| avatar | string | 否 | 微信头像 URL |

##### 登录流程

1. 前端调用 `wx.login()` 获取 `code`
2. 后端用 `code` 调用微信 `jscode2session` 接口换取 `openid`
3. 根据 `openid` 查找用户：
   - 已存在 → 直接登录，返回 JWT
   - 不存在 → 自动创建账号（用户名：`微信用户_xxxxxx`），返回 JWT
4. `password` 字段为空（微信登录不需要密码）

##### 请求示例

```json
{
  "code": "0b1DnOll2e3YR54d0Lml2xO3FH0DnOlN",
  "nickname": "小明",
  "avatar": "https://thirdwx.qlogo.cn/xxx/132"
}
```

##### 响应示例

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "id": 1,
    "username": "小明",
    "avatar": "https://thirdwx.qlogo.cn/xxx/132",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### 获取用户信息

```
GET /api/user/profile
```

认证：是（Bearer Token）

响应示例：

```json
{
  "code": 200,
  "msg": "获取用户信息成功",
  "data": { "id": 1, "username": "小明", "avatar": "/uploads/goods/user/avatar/img.jpg", "mobile": "18029384792" }
}
```

---

#### 更新用户信息

```
PATCH /api/user/profile
Content-Type: multipart/form-data
```

认证：是（Bearer Token）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| avatar | file | 否 | 头像文件（上传新文件后自动删除旧头像） |
| username | string | 否 | 用户名称 |
| mobile | string | 否 | 手机号码 |

响应示例（获取/更新）：

```json
{
  "code": 200,
  "msg": "获取用户信息成功",
  "data": {
    "id": 1,
    "username": "小明",
    "avatar": "https://thirdwx.qlogo.cn/xxx/132",
    "mobile": "18029384792"
  }
}
```

---

#### 收货地址

##### 添加收货地址

```
POST /api/user/addresses
```

认证：是（Bearer Token）

请求体（JSON）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| receiver_name | string | 是 | 收货人 |
| receiver_mobile | string | 是 | 收货电话 |
| province | string | 是 | 省 |
| city | string | 是 | 市 |
| district | string | 是 | 区 |
| detail_address | string | 是 | 详细地址 |
| is_default | number | 否 | 是否默认：0-否 1-是。首个地址自动为 1，其余为 0 |

设为默认时自动取消其他默认地址。若为用户的第一个地址，自动设为默认。

##### 获取收货地址列表

```
GET /api/user/addresses
```

认证：是（Bearer Token）

返回当前用户所有地址，按 `is_default desc, id desc` 排序。

##### 编辑收货地址

```
PATCH /api/user/addresses/{addressId}
```

认证：是（Bearer Token）

所有字段可选。设为默认时自动取消其他默认地址。

##### 删除收货地址

```
DELETE /api/user/addresses/{addressId}
```

认证：是（Bearer Token）

物理删除，直接从数据库移除。

---

#### 购物车

##### 获取购物车列表

```
GET /api/user/cart
```

认证：是（Bearer Token）

返回当前用户所有购物车记录，含商品信息和 SKU 详情。

##### 加入购物车

```
POST /api/user/cart
Content-Type: application/json
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fruit_id | number | 是 | 商品 ID |
| sku_id | number | 否 | SKU ID（不传则自动选第一个 SKU） |
| quantity | number | 否 | 数量，默认 1 |

##### 地址响应示例：

```json
{
  "code": 200,
  "msg": "获取地址列表成功",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "receiver_name": "张三",
      "receiver_mobile": "13800138000",
      "province": "广东省",
      "city": "深圳市",
      "district": "南山区",
      "detail_address": "科技园路1号",
      "is_default": 1,
      "created_at": "2026-05-20T10:00:00.000Z",
      "updated_at": "2026-05-20T10:00:00.000Z"
    }
  ]
}
```

---

---

#### 购物车

##### 获取购物车列表

```
GET /api/user/cart
```

认证：是（Bearer Token）

##### 加入购物车

```
POST /api/user/cart
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fruit_id | number | 是 | 商品 ID |
| sku_id | number | 否 | SKU ID（不传自动选第一个 SKU） |
| quantity | number | 否 | 数量，默认 1 |

同 fruit_id + sku_id 重复加入时 quantity 累加，自动扣减库存（事务保证）。

##### 更新购物车数量

```
PATCH /api/user/cart/{cartId}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| quantity | number | 是 | 新数量（最小 1） |

增加检查库存，减少恢复库存，事务保证。

##### 移出购物车

```
DELETE /api/user/cart/{cartId}
```

认证：是（Bearer Token）

删除记录并恢复 SKU 库存。

响应示例：

```json
{
  "code": 200,
  "msg": "获取购物车成功",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "fruit_id": 1,
      "sku_id": 1,
      "quantity": 2,
      "fruits": { "id": 1, "name": "山东红富士苹果", "main_image": "/uploads/goods/xxx/main.jpg" },
      "fruit_skus": { "id": 1, "spec_name": "5斤装", "price": "29.90", "stock": 98 }
    }
  ]
}
```

---

### 订单接口 `/api/order`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/` | 创建订单（从购物车结算） | 是 |
| GET | `/` | 订单列表（支持状态筛选） | 是 |
| GET | `/{orderId}` | 订单详情 | 是 |
| PATCH | `/{orderId}/cancel` | 取消订单 | 是 |
| POST | `/pay` | 发起支付 | 是 |
| PATCH | `/{orderId}/pay-success` | 支付成功确认 | 是 |
| POST | `/pay-callback` | 微信支付回调 | 否 |
| GET | `/admin/list` | 管理端：订单列表（分页+筛选） | 管理员 |
| GET | `/admin/{orderId}` | 管理端：订单详情 | 管理员 |
| PATCH | `/admin/{orderId}` | 管理端：编辑订单 | 管理员 |
| PATCH | `/admin/{orderId}/ship` | 管理端：发货 | 管理员 |

#### 订单状态码

| 值 | 状态 | 说明 |
|----|------|------|
| 0 | 待付款 | 刚下单 |
| 1 | 待发货 | 已支付 |
| 2 | 待收货 | 已发货 |
| 3 | 已完成 | 交易完成 |
| 4 | 已取消 | 用户取消 |

#### 创建订单

```
POST /api/order
Content-Type: application/json
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cart_ids | number[] | 是 | 要结算的购物车记录 ID 数组 |
| address_id | number | 是 | 收货地址 ID |
| remark | string | 否 | 订单备注 |

订单创建流程：
1. 校验购物车记录归属和库存
2. 一个订单包含多个 order_items（按 cart_ids）
3. total_amount = 所有 order_item.total_price 之和
4. 清空已结算的购物车记录
5. 库存已在加入购物车时扣减，结算时做防御性二次校验

#### 发起支付

```
POST /api/order/pay
Content-Type: application/json
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | number | 是 | 订单 ID |
| openid | string | 是 | 用户微信 openid |

返回小程序 `wx.requestPayment` 所需的参数（appId/timeStamp/nonceStr/package/paySign），签名方式为 RSA（V3 二次签名）。

#### 支付回调

```
POST /api/order/pay-callback
Content-Type: application/json
```

微信支付 V3 回调。微信使用 JSON 格式推送支付结果，`resource` 字段需 AES-256-GCM 解密。验证签名和金额后自动将订单状态更新为「待发货」。

#### 库存策略

**下单时预占库存**：用户加入购物车即刻扣减库存，结算时做防御性二次校验，支付成功后不再扣减。取消订单时恢复库存。

```
加购 → 扣库存 → 结算 → 创建订单 → 支付 → 待发货
                                │
                          取消订单 → 恢复库存
```

#### 管理端接口

##### 订单列表

```
GET /api/order/admin/list?page=1&pageSize=10&status=0&keyword=NO26
```

| 参数 | 说明 |
|------|------|
| page | 页码 |
| pageSize | 每页数量 |
| status | 订单状态筛选 |
| keyword | 搜索订单号或用户名 |

##### 编辑订单

```
PATCH /api/order/admin/{orderId}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| address_id | number | 否 | 修改收货地址 |
| remark | string | 否 | 修改备注 |
| status | number | 否 | 手动变更状态（取消时自动恢复库存） |

##### 发货

```
PATCH /api/order/admin/{orderId}/ship
```

仅「待发货」状态可发货，自动设定 ship_time。

---

### 管理员接口 `/api/admin`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/login` | 管理员登录 | 否 |

---

### 轮播图接口 `/api/banners`

管理员专属接口。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取轮播图列表 |
| POST | `/` | 添加轮播图（multipart） |
| PATCH | `/{bannerId}` | 编辑轮播图（multipart） |
| DELETE | `/{bannerId}` | 删除轮播图 |

#### 添加轮播图

```
POST /api/banners
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题 |
| image | file | 是 | 轮播图图片 |
| fruit_id | string | 是 | 关联商品 ID |
| sort_order | string | 是 | 排序 |
| status | string | 是 | 状态：0-不显示 1-显示 |
| link_url | string | 否 | 外链 URL |

#### 编辑轮播图

```
PATCH /api/banners/{bannerId}
Content-Type: multipart/form-data
```

所有字段可选。上传新图片时会自动删除旧文件。

#### 响应示例

```json
{
  "code": 200,
  "msg": "获取轮播图列表成功",
  "data": [
    {
      "id": 1,
      "title": "夏日水果特惠",
      "image_url": "/uploads/goods/banners/img.jpg",
      "fruit_id": 1,
      "link_url": null,
      "sort_order": 1,
      "status": 1,
      "fruits": { "id": 1, "name": "山东红富士苹果" }
    }
  ]
}
```

---

### 商品接口 `/api/goods`

#### 获取商品分类

```
GET /api/goods/admin/categories
```

认证：管理员（Bearer Token）

返回所有商品分类列表。

响应示例：

```json
{
  "code": 200,
  "msg": "获取商品分类成功",
  "data": [
    { "id": 1, "name": "国产水果", "parent_id": 0, "sort_order": 1, "is_show": 1 },
    { "id": 2, "name": "进口水果", "parent_id": 0, "sort_order": 2, "is_show": 1 }
  ]
}
```

#### 添加商品分类

```
POST /api/goods/admin/categories
Content-Type: application/json
```

认证：管理员（Bearer Token）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 分类名称 |
| parent_id | number | 否 | 父分类 ID，默认 0（一级分类） |
| sort_order | number | 否 | 排序，默认 0 |
| is_show | number | 否 | 是否显示：0-不显示 1-显示，默认 1 |

若 `parent_id` 不为 0，会校验目标父分类是否存在。

请求示例：

```json
{
  "name": "时令水果",
  "parent_id": 1,
  "sort_order": 3,
  "is_show": 1
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "添加分类成功",
  "data": { "id": 6, "name": "时令水果", "parent_id": 1, "sort_order": 3, "is_show": 1 }
}
```

---

#### 编辑商品分类

```
PATCH /api/goods/admin/categories/{categoryId}
Content-Type: application/json
```

认证：管理员（Bearer Token）

所有字段均为可选，仅更新传入的字段。`parent_id` 若传入，会校验目标父分类是否存在。

请求体（JSON）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 分类名称 |
| sort_order | number | 否 | 排序 |
| is_show | number | 否 | 是否显示：0-不显示 1-显示 |
| parent_id | number | 否 | 父分类 ID |

请求示例：

```json
{
  "name": "时令水果",
  "sort_order": 3,
  "is_show": 1,
  "parent_id": 1
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "编辑分类成功",
  "data": { "id": 3, "name": "时令水果", "parent_id": 1, "sort_order": 3, "is_show": 1 }
}
```

---

#### 删除商品分类

```
DELETE /api/goods/admin/categories/{categoryId}
```

认证：管理员（Bearer Token）

前置条件：分类下没有未删除的商品，否则返回错误。

响应示例：

```json
{ "code": 200, "msg": "删除分类成功", "data": { "id": 5, "name": "待删除分类" } }
```

---

#### 获取商品 SKU 列表

```
GET /api/goods/admin/{goodsId}/skus
```

认证：管理员（Bearer Token）

根据商品 ID 返回该商品下所有 SKU 的完整信息，用于编辑弹框中的 SKU 配置。

响应示例：

```json
{
  "code": 200,
  "msg": "获取 SKU 列表成功",
  "data": {
    "goodsId": 1,
    "goodsName": "山东红富士苹果",
    "skus": [
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
        "image": "/uploads/goods/xxx/sku1.jpg",
        "created_at": "2026-05-19T12:00:00.000Z",
        "updated_at": "2026-05-19T12:00:00.000Z"
      },
      {
        "id": 2,
        "fruit_id": 1,
        "spec_name": "10斤装",
        "weight": "10.00",
        "price": "49.90",
        "original_price": "69.90",
        "stock": 50,
        "sku_code": "SKUMK4XG2C8YZ1234",
        "sales": 5,
        "image": "/uploads/goods/xxx/sku2.jpg",
        "created_at": "2026-05-19T12:00:00.000Z",
        "updated_at": "2026-05-19T12:00:00.000Z"
      }
    ]
  }
}
```

---

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
| sku_image_0 | file | 否 | 第 1 个 SKU 的规格图片 |
| sku_image_1 | file | 否 | 第 2 个 SKU 的规格图片 |
| ... | file | 否 | 以此类推，索引与 skus 数组对应 |

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
  -F "sku_image_0=@/path/to/sku1.jpg" \
  -F "sku_image_1=@/path/to/sku2.jpg"
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
| name | string | 否 | 搜索关键词（模糊匹配商品名称） |
| categoryId | number | 否 | 分类 ID 筛选 |
| status | number | 否 | 状态筛选：0-下架 1-上架 |

请求示例：

```
GET /api/goods/admin/list?page=1&pageSize=10&name=苹果&categoryId=1&status=1
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
        "first_sku_price": "29.90",
        "total_stock": 150,
        "categories": {
          "id": 1,
          "name": "国产水果"
        }
      }
    ]
  }
}
```

---

#### 编辑商品信息

```
PATCH /api/goods/admin/{goodsId}
Content-Type: multipart/form-data
```

认证：管理员（Bearer Token）

所有字段均为可选，仅更新传入的字段。

##### 上传字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 商品名称 |
| category_id | string | 否 | 分类 ID |
| description | string | 否 | 商品描述 |
| status | string | 否 | 0-下架 1-上架 |
| sort_order | string | 否 | 排序 |
| skus | string | 否 | SKU 列表（JSON 字符串） |
| main_image | file | 否 | 新主图（替换旧图） |
| images | file[] | 否 | 新增的副图 |
| keep_images | string | 否 | 保留的旧副图 URL（JSON 数组），不在该数组中的旧副图将被删除 |
| sku_image_0 | file | 否 | 第 1 个 SKU 的新图片 |
| sku_image_1 | file | 否 | 第 2 个 SKU 的新图片 |

##### SKU JSON 结构（skus 字段）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 否 | SKU ID（更新现有 SKU 时必填，不传则新建） |
| spec_name | string | 否 | 规格名称 |
| weight | number | 否 | 重量（斤） |
| price | number | 否 | 售价 |
| original_price | number | 否 | 原价 |
| stock | number | 否 | 库存 |

未传入 id 的 SKU 视为新建，已存在但不在列表中的 SKU 将被删除。

##### 图片更新逻辑

- **主图**：上传新主图 → 旧文件在 DB 成功后自动删除
- **副图**：前端传 `keep_images`（要保留的旧图 URL） + `images`（新文件），最终合并为新的副图列表；不在 `keep_images` 中的旧副图文件会被删除
- **SKU 图片**：使用 `sku_image_{索引}` 字段名，索引对应 skus 数组位置。若某 SKU 被整条删除，其图片文件同步清理

##### 原子性保证

1. 新文件先迁移到正式目录
2. 执行数据库事务（商品 + SKU 更新）
3. DB 成功 → 删除被替换的旧文件
4. DB 失败 → 回滚已迁移的新文件，旧文件完整保留

##### 请求示例（curl）

```bash
curl -X PATCH http://localhost:10040/api/goods/admin/1 \
  -H "Authorization: Bearer <admin_token>" \
  -F "name=山东红富士苹果（升级版）" \
  -F "status=0" \
  -F "main_image=@/path/to/new-main.jpg" \
  -F "images=@/path/to/new-detail.jpg" \
  -F 'keep_images=["/uploads/goods/xxx/old-detail.jpg"]' \
  -F 'skus=[{"id":99,"spec_name":"5斤装","price":35.9,"stock":200},{"spec_name":"15斤装","price":79.9,"stock":30}]' \
  -F "sku_image_1=@/path/to/new-sku2.jpg"
```

##### 响应示例

```json
{
  "code": 200,
  "msg": "编辑商品成功",
  "data": {
    "id": 1,
    "name": "山东红富士苹果（升级版）",
    "main_image": "/uploads/goods/xxx/new-main.jpg",
    "images": "[\"/uploads/goods/xxx/old-detail.jpg\",\"/uploads/goods/xxx/new-detail.jpg\"]",
    "status": 0,
    "updated_at": "2026-05-20T08:00:00.000Z",
    "fruit_skus": [
      { "id": 99, "spec_name": "5斤装", "price": "35.90", "stock": 200 },
      { "id": 101, "spec_name": "15斤装", "price": "79.90", "stock": 30 }
    ],
    "categories": { "id": 1, "name": "国产水果" }
  }
}
```

---

#### 商品上/下架

```
PATCH /api/goods/admin/{goodsId}/status
```

认证：管理员（Bearer Token）

无需请求体，自动切换当前状态（上架 → 下架，下架 → 上架）。

响应示例：

```json
{
  "code": 200,
  "msg": "更改成功",
  "data": { "id": 1, "status": 0 }
}
```

---

#### 软删除商品（移入回收站）

```
DELETE /api/goods/admin/{goodsId}
```

认证：管理员（Bearer Token）

设置 `deleted_at` 字段为当前时间。已软删除的商品不会出现在商品列表中。

响应示例：

```json
{
  "code": 200,
  "msg": "已移入回收站",
  "data": { "id": 1, "deleted_at": "2026-05-20T10:00:00.000Z" }
}
```

---

#### 恢复商品（撤销软删除）

```
PATCH /api/goods/admin/{goodsId}/restoregoods
```

认证：管理员（Bearer Token）

将 `deleted_at` 字段置为 `null`，商品重新出现在商品列表中。

响应示例：

```json
{
  "code": 200,
  "msg": "已恢复",
  "data": { "id": 1, "deleted_at": null }
}
```

---

#### 彻底删除商品（物理删除）

```
DELETE /api/goods/admin/{goodsId}/hard
```

认证：管理员（Bearer Token）

**前置条件**：商品必须先执行软删除，否则返回错误。

执行逻辑：
1. 数据库事务中物理删除 fruit 记录（级联删除关联 SKU）
2. 收集所有关联图片路径（主图 + 副图 + SKU 图片）
3. 事务成功后删除对应的磁盘文件

若商品有关联订单（order_items）、购物车（carts）等数据，受外键约束保护，无法彻底删除。

响应示例：

```json
{ "code": 200, "msg": "已彻底删除" }
```

---

#### 回收站列表

```
GET /api/goods/admin/recycle
```

认证：管理员（Bearer Token）

查询参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |
| keyword | string | 否 | 搜索关键词 |

请求示例：

```
GET /api/goods/admin/recycle?page=1&pageSize=10&keyword=苹果
```

响应示例：

```json
{
  "code": 200,
  "msg": "获取回收站列表成功",
  "data": {
    "total": 3,
    "page": 1,
    "pageSize": 10,
    "list": [
      {
        "id": 5,
        "name": "已删除的苹果",
        "deleted_at": "2026-05-20T10:00:00.000Z",
        "main_image": "/uploads/goods/xxx/main.jpg",
        "status": 0,
        "fruit_skus": [ { "id": 10, "spec_name": "5斤装" } ],
        "categories": { "id": 1, "name": "国产水果" }
      }
    ]
  }
}
```

---

## 技术栈

- **运行时**：Node.js + Express 5
- **语言**：TypeScript
- **ORM**：Prisma 5
- **数据库**：MySQL 8.0
- **认证**：JWT（jsonwebtoken）
- **文件上传**：multer + fs-extra
- **密码加密**：bcryptjs

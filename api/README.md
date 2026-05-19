## 项目结构

```
src
├─ main.ts                 // 项目启动入口
├─ app.ts                  // express配置中心

├─ config                  // 配置
│  ├─ env.ts
│  └─ index.ts

├─ routes                  // 路由层
│  └─ index.ts

├─ controllers             // 控制器层
│  └─ user.controller.ts

├─ services                // 业务层
│  └─ user.service.ts

├─ prisma                  // prisma
│  └─ index.ts

├─ middlewares             // 中间件
│  ├─ error.middleware.ts
│  └─ auth.middleware.ts

├─ utils                   // 工具函数
│  └─ response.ts

└─ types                   // 类型
   └─ express.d.ts
```


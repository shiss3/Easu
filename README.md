# Easu 智能酒店预订平台 — 用户端项目说明文档

## 1. 项目概括

Easu-用户端 是一个面向 C 端用户的智能酒店预订平台，核心定位为：**结合 agent 能力的现代化移动端酒店预订应用**。用户可以通过传统的表单筛选搜索酒店，也可以通过自然语言与 AI 助手"小宿"对话，获得个性化的酒店推荐。

| 姓名   | 电话        | 邮箱                       | 分工            |
| ------ | ----------- | -------------------------- | --------------- |
| 史世爽 | 18733905521 | 488514663@qq.com           | c端全线业务开发 |
| 张雨姗 | 18176877098 | 211503026@smail.nju.edu.cn | b端全线业务开发 |

备注：为了减少该文件体积大小，文件内图片均已 URL 形式上传。

### 1.1 技术选型

C端前端：React 19、TypeScript、Vite、React Router DOM、 TailwindCSS,、Zustand 、React Query 

B端前端：React 19、TypeScript、Ant Design 6（antd）、Redux Toolkit、React Router 7、Axios

后端：Node.js、Express、阿里云 OSS

数据库：PostgreSQL + Prisma ORM。

AI：OpenAI SDK + Function Calling + SSE + GUI

### 1.2 项目整体结构

#### Monorepo 架构

项目采用 **pnpm Workspace** 搭建 Monorepo 单体仓库，统一管理多个应用和共享包。这种架构使得团队成员可以在同一个仓库中协作开发，共享类型定义和工具函数，避免重复代码。

```
Easu/                          # Monorepo 根目录
├── pnpm-workspace.yaml        # 工作区声明
├── package.json               # 根级依赖（ESLint, Prettier, TypeScript）
│
├── apps/                      # 应用层
│   ├── client-user/           # C端用户前端（史世爽负责）
│   ├── client-merchant/       # B端商家管理前端（张雨姗负责）
│   └── server/                # 后端服务（各人分管自己对应端的后端开发）
│
└── packages/                  # 共享包层
    ├── database/              # Prisma Schema + 数据库客户端
    │   ├── prisma/
    │   │   ├── schema.prisma  # 统一数据模型定义
    │   │   ├── seed.ts        # 数据库种子脚本
    │   │   └── migrations/    # 迁移记录
    │   └── src/index.ts       # 导出 PrismaClient 实例
    │
    └── utils/                 # 共享工具库
        ├── src/request.ts     # 统一 Axios 实例工厂
        └── src/types.ts       # 统一 API 响应类型 ApiResponse<T>
```

#### 共享包说明

- **`@repo/database`**：将 Prisma Schema 和数据库客户端抽离为独立包。无论是用户端后端还是商家端后端，都通过 `import { prisma } from '@repo/database'` 引用同一个数据库实例，确保数据模型的一致性。
- **`@repo/utils`**：封装了统一的 Axios 实例工厂函数 `createAxiosInstance` 和标准的 API 响应类型 `ApiResponse<T>`。前端应用通过调用工厂函数创建各自的 HTTP 客户端，统一了请求/响应拦截逻辑。


## 2. 业务实现

用户端核心业务流程围绕 **"搜索 → 浏览 → 预订"** 闭环展开，包含以下四个主要页面：

### 2.1 基本功能实现

#### 2.1.1 首页（酒店查询页）

首页是用户的核心入口，承载了搜索条件的聚合与快速触达功能：

- **顶部 Banner 轮播**：展示酒店广告投放，支持按城市定向投放，点击直接跳转对应酒店详情页。
- **核心查询区域**：
  - 城市/位置选择：支持 GPS 定位、热门城市、字母索引、关键词搜索。
  - 入住日期选择：自研日历组件，支持范围选择（入住/离店）和单日选择（钟点房）。
  - 筛选条件：价格区间、酒店星级。
  - 快捷标签：如"近地铁"、"免费停车"、"情侣主题"等，点击即搜。
- **住宿类型切换**：支持"酒店/民宿"与"钟点房"两种搜索模式。

https://picui.ogmua.cn/s1/2026/02/26/69a02a544d964.webp

#### 2.1.2 酒店列表页（搜索结果页）

- **顶部条件筛选栏**：支持城市、入住/离店日期、入住间数/人数的修改，以及关键词搜索。
- **详细筛选区域**：
  - 排序：默认排序、好评优先、低价优先、高价优先。
  - 价格/星级筛选。
  - 高级标签筛选：分类标签面板（商务基础、设施进阶、情侣/度假、亲子/家庭、电竞/特色），支持多选。
- **酒店列表**：使用 `@tanstack/react-virtual` 实现虚拟滚动列表，配合 React Query 的无限查询（Infinite Query），实现上滑自动加载更多。每个列表项展示酒店封面图、名称、评分、地址、标签、价格等信息。

https://picui.ogmua.cn/s1/2026/02/26/69a02ac5b1cd3.webp

#### 2.1.3 酒店详情页

- **顶部导航**：显示酒店名称，支持返回列表页。
- **大图 Banner**：支持左右滑动查看酒店外观图片。
- **酒店基础信息**：酒店名、星级、评分、点评数、设施标签、地址。
- **日历 + 入住间夜 Banner**：直观显示当前选择的入住/离店日期与间夜数，点击可修改。
- **房型价格列表**：展示酒店的所有房型，包含房型名称、床铺信息、价格（根据选择的入住日期动态计算）、库存状态。价格根据商户端设置的数据按从低到高排序。

https://picui.ogmua.cn/s1/2026/02/26/69a02ae26638b.webp

#### 2.1.4 AI 智能助手页（"小宿"）

- 自然语言对话界面，支持多轮对话。
- 快捷提示标签（如"南京电竞酒店"、"上海情侣入住"）。
- 双模式切换：智能搜索（快速回复）与深度思考（推理模型）。
- 历史会话管理：支持新建会话、切换历史会话、会话自动命名。
- 流式打字机效果输出，AI 回复中穿插可点击的酒店卡片。

https://picui.ogmua.cn/s1/2026/02/26/69a02b06d8cee.webp

#### 2.1.5 登录页

- 支持手机验证码登录（自动注册）和密码登录两种方式。
- 防暴力破解：连续 5 次密码错误自动锁定账号 30 分钟。
- 登录成功后自动跳转到来源页面。

### 2.2 项目亮点

#### 亮点一："小宿" AI Agent 智能助手

##### AI Agent 工作流

项目最核心的亮点是将大语言模型（LLM）深度融入酒店预订业务流程。不同于简单的"问答机器人"，"小宿"是一个具备 **Function Calling 能力的 AI Agent**，能够理解用户自然语言意图，自主调用后端搜索 API，并以图文并茂的方式呈现结果。

```
用户输入自然语言
        │
        ▼
  ┌─────────────┐
  │  LLM 意图识别 │  ← System Prompt 约束 + 场景化联想策略
  │  (豆包大模型)  │
  └──────┬──────┘
         │ 判断是否需要搜索酒店
         ▼
  ┌─────────────────────┐
  │  Function Calling     │  ← 自动提取 city / checkIn / checkOut /
  │  search_hotels()      │     keyword / minPrice / maxPrice / stars 等参数
  └──────┬──────────────┘
         │
         ▼
  ┌─────────────────────┐
  │  搜索 API 执行        │  ← 复用 hotel-search.service 的三级降级策略
  │  (精确查询→降级→兜底)  │
  └──────┬──────────────┘
         │ 返回酒店数据
         ▼
  ┌─────────────────────┐
  │  LLM 生成自然语言总结  │  ← 第二轮流式输出，穿插 [HOTEL_CARD_ID] 占位符
  └──────┬──────────────┘
         │
         ▼
  前端解析占位符，动态渲染酒店卡片
```

##### 搜索 API 核心工作流

搜索 API（`hotel-search.service.ts`）是 AI 助手和传统搜索共用的统一搜索引擎，采用 **三级降级策略** 确保用户永远有结果可看：

1. **精确查询（Exact Query）**：基于日期范围检查房型库存（`RoomInventory`），联合匹配城市、价格区间、设施标签、星级等所有硬约束条件。使用 CTE（公用表表达式）进行多表联合查询，并通过 `word_similarity` 实现关键词模糊匹配的相关性评分排序。
2. **降级查询（Fallback Query）**：当精确查询无结果时，放宽库存约束，使用 `LEFT JOIN` 确保即使无房型数据的酒店也能被检索到。同时标记 `sold_out` 状态告知前端。
3. **全局兜底查询（Global Fallback）**：当前两级均无结果时，忽略大部分约束条件，返回同城市评分最高的热门酒店作为备选推荐。

```typescript
// 三级降级逻辑核心流程（简化）
let exactMatches = await queryExact(params);      // 第一级：严格匹配

if (exactMatches.length === 0) {
    recommendations = await queryFallback(params); // 第二级：放宽库存约束
}

if (exactMatches.length === 0 && recommendations.length === 0) {
    recommendations = await queryGlobal(params);   // 第三级：全局热门兜底
}
```

##### 搜索 API 的可扩展性

搜索服务与 AI 能力采用松耦合设计。AI 聊天控制器通过定义 `tools` 数组向大模型注册函数：

```typescript
const HOTEL_SEARCH_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'search_hotels',
        description: '搜索酒店、查询价格与设施标签...',
        parameters: { /* city, checkIn, checkOut, keyword, minPrice, maxPrice, stars ... */ }
    }
};
```

未来只需新增工具定义（如 `book_hotel`、`cancel_order`、`get_weather`），AI 助手即可自动获得新能力，无需修改前端代码。

##### GUI 生成式组件

AI 回复中通过特殊占位符 `[HOTEL_CARD_123]` 标识需要渲染的酒店卡片。前端使用正则解析器实时解析流式文本，遇到占位符即动态挂载 React 组件 `InlineHotelCard`，实现了**文字与交互式 UI 组件的混排**，用户可直接点击卡片跳转到酒店详情页，极大缩短了"搜索 → 预订"的转化链路。

##### 城市组件作为搜索入口

城市选择组件（`CitySelector`）不仅是传统的城市选择器，更是一个**融合了 AI 搜索能力的统一搜索入口**：

- 组件内置 **AI 搜索开关**，用户开启后输入关键词点击搜索，系统会自动基于当前城市和日期信息生成结构化提示词（prompt），并自动发送给 AI 助手：

```typescript
// 自动生成提示词并跳转 AI 助手页
const prompt = `我想在${storeCity}找酒店，入住时间是${storeDateRange.start}到${storeDateRange.end}。
我的额外要求是：${keywordText}。请帮我推荐合适的酒店。`;
navigate('/ai-assistant?prompt=' + encodeURIComponent(prompt));
```

- AI 助手页通过 URL 参数 `prompt` 接收提示词，自动发送并开始对话，实现**从搜索到 AI 对话的无缝衔接**。

https://picui.ogmua.cn/s1/2026/02/26/69a02b3adea0f.webp

https://picui.ogmua.cn/s1/2026/02/26/69a02bfacef6b.webp

https://picui.ogmua.cn/s1/2026/02/26/69a02b75794f1.webp

#### 亮点二：自研优质组件，高复用率

项目中多个核心组件均为自研实现，跨页面高频复用，大幅提升了开发效率和用户体验一致性：

| 组件 | 复用页面 | 核心能力 |
|------|----------|----------|
| **Calendar 日历组件** | 首页、搜索结果页、酒店详情页 | 范围/单日双模式、节假日/调休标注、月份缓存、自动滚动定位 |
| **CitySelector 城市选择组件** | 首页、搜索结果页 | GPS 定位、热门城市、字母索引导航、搜索联想（城市+酒店）、AI 搜索入口、历史记录 |
| **FilterSelector 标签筛选组件** | 搜索结果页 | 分类标签面板（6大类30+标签）、左侧导航联动右侧内容、历史记录 |
| **PriceStarSelector 价格星级组件** | 首页、搜索结果页 | 价格区间选择、星级多选 |
| **GuestSelector 入住人数组件** | 首页、搜索结果页、酒店详情页 | 成人/儿童/房间数选择、儿童年龄选择 |
| **Banner 轮播组件** | 首页 | 自动轮播、手动滑动、指示器 |

所有组件统一采用 **受控组件 + 回调确认** 的设计模式，通过 `visible` / `onClose` / `onConfirm` 等 props 驱动，使用 `lazy()` + `Suspense` 进行懒加载，按需渲染不阻塞首屏。

---

## 3. 项目难点

### 3.1 AI SSE 流式输出与 GUI 生成式组件

**难点描述**：大模型生成回复通常需要数秒到十几秒，传统的 HTTP 请求会让用户面临长时间的白屏等待。同时纯文本回复无法承载"看房→订房"的业务闭环，需要在流式文本中嵌入可交互的 UI 组件。

**解决方案**：

**后端**：采用 SSE（Server-Sent Events）协议，将大模型调用拆分为两轮流式请求：

- **第一轮**：向大模型发送用户消息 + 工具定义，流式接收意图判断结果。若模型触发 `tool_calls`，立即执行搜索 API 并通过 SSE 事件通知前端工具执行状态和酒店数据。
- **第二轮**：将工具执行结果注入消息上下文，再次调用大模型生成自然语言总结，流式推送给前端。

后端通过自定义 SSE 事件类型精确控制前端行为：

```
event: delta       → 文本/推理内容增量
event: tool_status → 工具执行状态（"正在检索酒店..."）
event: tool_data   → 酒店结构化数据（用于渲染卡片）
event: error       → 错误消息
event: done        → 流结束
```

**前端**：使用 `@microsoft/fetch-event-source` 维持长连接，通过 Zustand Store 的 `appendAssistantContent` 方法实现增量更新。在渲染层编写正则解析器，对流式文本进行实时解析：

```typescript
// 解析文本中的酒店卡片占位符
const parts = content.split(/(\[HOTEL_CARD_\d+])/g);
parts.map(part => {
    const match = part.match(/\[HOTEL_CARD_(\d+)]/);
    if (match) {
        const hotel = hotels.find(h => h.id === Number(match[1]));
        return <InlineHotelCard hotel={hotel} />;  // 动态挂载 React 组件
    }
    return <span>{part}</span>;
});
```

### 3.2 搜索 API 的三级降级设计

**难点描述**：酒店搜索场景下，用户输入的条件组合千变万化（城市 + 日期 + 价格 + 设施标签 + 星级 + 人数），条件越多越容易出现"查无结果"，直接影响用户体验和转化率。同时 AI 助手和传统搜索都需要调用同一套搜索逻辑，必须保证一致性。

**解决方案**：

将搜索逻辑统一封装在 `executeHotelSearch` 服务函数中，API 控制器和 AI 聊天控制器共同调用。内部实现三级降级：

| 级别 | 查询策略 | 约束条件 | 适用场景 |
|------|----------|----------|----------|
| L1 精确查询 | INNER JOIN RoomInventory | 全部硬约束（日期库存 + 价格 + 设施 + 星级） | 条件明确且数据充足 |
| L2 降级查询 | LEFT JOIN，忽略库存 | 保留城市、价格、设施约束 | 库存不足但城市有酒店 |
| L3 全局兜底 | 仅保留城市约束 | 忽略价格、设施等 | 条件过于苛刻 |

每级查询均利用 PostgreSQL 的 `pg_trgm` 扩展进行 `word_similarity` 模糊匹配，结合自定义的 `relevance_score`（相关性评分）综合排序，确保搜索结果的质量。同时通过 `isFallback` 字段标记降级结果，前端据此展示"以下为推荐酒店"的分隔提示。

### 3.3 JWT 双 Token 登录与无感刷新

**难点描述**：移动端用户使用频繁但零散，短效 Token 过期后频繁跳转登录页严重影响体验；而长效 Token 又存在安全风险。需要在安全性和用户体验之间取得平衡。

**解决方案**：

采用 **Access Token + Refresh Token 双 Token 机制**：

| Token | 有效期 | 用途 |
|-------|--------|------|
| Access Token | 15 分钟 | 附在每个请求的 `Authorization` 头，用于身份验证 |
| Refresh Token | 7 天 | 存入数据库 `UserToken` 表，用于签发新的 Access Token |

前端在 Axios 响应拦截器中实现**无感刷新**：

1. 当任意请求收到 `401` 响应时，自动使用 Refresh Token 调用 `/auth/refresh-token` 接口。
2. 刷新期间，其他并发的 401 请求被挂起放入队列，避免重复刷新。
3. 刷新成功后，将新 Access Token 注入队列中的所有请求并重新发起。
4. 若刷新也失败（Refresh Token 过期），清除用户状态并跳转登录页。

```typescript
// 核心队列机制（简化）
if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = httpClient.post('/auth/refresh-token', { refreshToken })
        .then(res => { resolveQueue(res.data.accessToken); })  // 释放队列
        .catch(() => { resolveQueue(null); logout(); });         // 刷新失败，登出
}
// 当前请求排队等待刷新结果
return new Promise(resolve => {
    enqueue(newToken => resolve(httpClient.request({ ...config, Authorization: newToken })));
});
```

后端同时将 Refresh Token 持久化到 `UserToken` 表，支持：
- 多设备登录管理（每个设备一条记录）。
- 服务端主动吊销（删除数据库记录即失效，无需等待 JWT 过期）。

### 3.4 日历组件与节假日计算逻辑

**难点描述**：酒店预订场景下，日历组件需要展示节假日、调休等信息辅助用户决策。中国节假日安排每年由国务院发布，包含法定节假日（休）和调休工作日（班），逻辑复杂且数据每年变化。

**解决方案**：

**数据层**：后端维护年度节假日 JSON 数据文件（`2026.json`），每条记录包含：

```json
{
    "name": "春节",
    "date": "2026-02-17",
    "isOffDay": true,
    "displayLabel": "春节"
}
```

其中 `isOffDay` 区分休息日和调休工作日，`displayLabel` 用于日历格子内的精确展示（如"除夕"、"休"、"班"、"班/情人节"等复合标签）。后端对该数据进行内存级缓存，避免重复文件 IO。

**日历组件**：

- 使用 `Map<dateString, HolidayDay>` 构建 O(1) 查找的假日映射表，每个日期格子通过查表获取展示信息。
- 节假日文字标红（`text-[#FF3333]`），调休工作日显示"班"标签。
- 月份格子数据通过 `MONTH_CELL_CACHE`（`Map<string, Array<Dayjs | null>>`）缓存，避免重复计算每月的日期偏移。
- 支持 `range`（入住-离店范围选择）和 `single`（钟点房单日选择）两种模式，选中范围高亮并显示"入住"/"离店"标签。
- 打开日历时自动滚动定位到当前选中月份。


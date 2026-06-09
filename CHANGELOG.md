# 更新日志 (CHANGELOG)

本文件记录 AI Study Buddy 项目的所有重要功能变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [未发布] - 2026-06-08

### 新增
- **配置驱动模型切换**：`application.yml` 中设置 `ai.provider: agnes|qwen` 即可切换供应商
  - `AgnesAiModelConfig`：添加 `@ConditionalOnProperty(name = "ai.provider", havingValue = "agnes")`
  - `QwenChatModelConfig`：添加 `@ConditionalOnProperty(name = "ai.provider", havingValue = "qwen")` + `StreamingChatModel` 支持
  - 两个供应商的 Bean 统一命名为 `aiChatModel` / `aiStreamingChatModel`，按类型注入
  - `AiCodeHelperServiceFactory` / `AiCodeHelper`：不再硬编码供应商名称
- **JWT 账号系统**：用户注册/登录功能
  - 后端新增 `User` 实体（JPA + H2 内存数据库）
  - 后端新增 `POST /api/auth/register` 注册接口
  - 后端新增 `POST /api/auth/login` 登录接口
  - JWT Token 自动签发与校验
  - Spring Security 集成，`/api/ai/**` 需要认证
  - `AiController.chat()` 自动从 JWT 中提取 userId，无需客户端传入 memoryId
- 前端新增 `Login.vue` 登录/注册页面
  - 支持登录/注册模式切换
  - 表单校验与错误提示
  - 登录成功后自动跳转聊天页
- `App.vue` 新增登录/聊天页面切换逻辑
  - 未登录显示登录页，已登录显示聊天页
  - 头部新增"退出登录"按钮
- `api.ts` 新增 Token 和用户信息管理（localStorage 持久化）
  - `getToken` / `setToken` / `clearToken` / `hasToken`
  - `getUser` / `setUser` / `clearUser` / `logout`

### 修复
- **JWT 认证 403 问题**：修复登录后发消息被弹出到登录页的问题
  - `JwtUtil`：移除 Base64 编码绕圈，使用 `secret.getBytes(StandardCharsets.UTF_8)` 直接创建密钥
  - `SecurityConfig`：未认证请求返回 401 而非 403，前端 `Chat.vue` 中 `response.status === 401` 触发退出
  - `JwtAuthFilter`：添加调试日志，验证失败时打印警告
  - JWT secret 长度确保 ≥ 32 字节（HMAC-SHA256 最低要求）
- **RAG Embedding 模型解耦**：不再绑死 Qwen，支持独立选择 Embedding 供应商
  - 新增 `EmbeddingModelConfig.java`：根据 `ai.embedding.provider` 创建不同供应量的 Embedding 模型
  - 支持三种模式：`none`（禁用）/ `openai`（OpenAI 兼容，复用 Agnes API）/ `dashscope`（Qwen）
  - `RagConfig`：`@Resource(name="qwenEmbeddingModel")` → `@Autowired` 按类型注入，供应商无关
  - `EmbeddingStore` 自动创建：`@ConditionalOnBean(EmbeddingModel.class)` + `@ConditionalOnMissingBean`
- **会话 ID 持久化**：`memoryId` 从纯内存变量改为 localStorage 持久化，刷新页面不再丢失
- **ID 生成优化**：时间戳后5位 + 固定4位随机数，保证9位定长输出
- 新增"新建会话"按钮，可一键清空前端消息

### 变更
- **ORM 框架迁移**：Spring Data JPA → MyBatis-Plus 3.5.7
  - `pom.xml`：`spring-boot-starter-data-jpa` → `mybatis-plus-spring-boot3-starter`
  - `User.java`：JPA 注解（`@Entity`, `@Column`）→ MyBatis-Plus 注解（`@TableName`, `@TableId`）
  - `UserRepository.java` → `UserMapper.java`（`JpaRepository` → `BaseMapper`）
  - `AuthController`：`save/findByUsername/existsByUsername` → `insert/selectOne(QueryWrapper)/selectCount(QueryWrapper)`
  - 新增 `schema.sql`：MySQL 建表脚本，启动时自动执行
  - `application.yml`：移除 JPA 配置，添加 `spring.sql.init` + `mybatis-plus` 配置
- **数据库迁移**：H2 内存数据库 → MySQL
  - `pom.xml`：`com.h2database:h2` → `com.mysql:mysql-connector-j`
  - `application.yml`：数据源切换为 MySQL，默认端口 3306
  - `SecurityConfig`：移除 H2 控制台放行规则
- `AiController.chat()` 接口不再接收 `memoryId` 参数（改为从 JWT 自动获取）
- `Chat.vue` 移除客户端 `memoryId` 管理逻辑，改为显示用户昵称
- 前端 `openStream()` 请求自动携带 `Authorization: Bearer <token>` 头
- `pom.xml` 新增依赖：`spring-boot-starter-data-jpa`、`h2`、`spring-boot-starter-security`、`jjwt`
- `application.yml` 新增 H2 数据源、JWT 密钥配置

### 后端新增文件
| 文件 | 说明 |
|------|------|
| `entity/User.java` | 用户实体（JPA） |
| `repository/UserRepository.java` | 用户数据访问层 |
| `security/JwtUtil.java` | JWT 工具类（生成/校验/解析） |
| `security/JwtAuthFilter.java` | JWT 认证过滤器 |
| `config/SecurityConfig.java` | Spring Security 配置 |
| `dto/AuthRequest.java` | 登录/注册请求 DTO |
| `dto/AuthResponse.java` | 登录/注册响应 DTO |
| `controller/AuthController.java` | 认证接口控制器 |

### 前端新增/修改文件
| 文件 | 说明 |
|------|------|
| `components/Login.vue` | 新建：登录/注册页面 |
| `config/api.ts` | 修改：新增 Token 和用户管理 |
| `App.vue` | 修改：登录/聊天切换 + 退出登录 |
| `components/Chat.vue` | 修改：显示用户名、Token 鉴权、移除 memoryId |

---

## [历史] - 早期版本

### v0.1 - 项目初始化

- **初始提交** (`4408311`)
  - Spring Boot 3.5.7 + Java 21 项目搭建
  - Qwen Chat Model 集成
  - LangChain4j AiServices 声明式 AI 服务
- **RAG 知识库** 
  - 基于向量检索的本地文档问答
  - 知识库内容：Java 基础/集合八股文
- **MCP 工具调用**：支持外部工具集成
- **敏感词过滤**：`SafeInputGuardrail`
- **流式响应**：SSE (Server-Sent Events) 流式输出
- **跨域配置**：`CorsConfig` 支持前端跨域访问

### 功能迭代

- **Agnes AI 集成** (`dbd99ad`)
  - 新增 Agnes AI 模型供应商（OpenAI 兼容接口）
  - 支持双模型切换：Agnes AI（主）/ Qwen（备用）
  - 流式超时配置优化（默认 120s）
- **SSE 流式修复** (`b26e8ad`)
  - 修复 SSE 流式超时问题
  - 修复前端换行丢失问题

### 前端

- Vue 3 + Vite + TypeScript 项目搭建
- `Chat.vue`：基于 fetch + ReadableStream 的 SSE 流式聊天组件
- `App.vue`：简洁单页布局
- Vite 代理配置：开发环境自动转发 `/api` 到后端

---

## 技术栈总览

| 层级 | 技术 |
|------|------|
| 后端框架 | Spring Boot 3.5.7 |
| Java 版本 | 21 |
| AI 框架 | LangChain4j 1.1.0 |
| 主用模型 | Agnes AI (agnes-2.0-flash) |
| 备用模型 | 阿里云 Qwen (qwen3-max) |
| 数据库 | MySQL |
| ORM | MyBatis-Plus 3.5.7 |
| 认证 | Spring Security + JWT (jjwt 0.12.5) |
| 构建工具 | Maven |
| 前端框架 | Vue 3 (Composition API) |
| 构建工具 | Vite 5 |
| 类型支持 | TypeScript |
| HTTP 库 | Axios + fetch |

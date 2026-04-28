name: tradingagents-cn
description: 在本地 Docker 中部署 hsliuping/TradingAgents-CN，并基于其中文多智能体股票研究、模型配置、Docker 部署与报告导出能力，协助搭建、验证、排错和整理使用说明。用户提到 TradingAgents-CN、Docker 部署、FastAPI+Vue、MongoDB/Redis、股票研究、多智能体分析、报告导出、模型配置时优先使用。
version: 0.1.0

# TradingAgents-CN Skill

这个 skill 用来处理两类常见需求：
1. 把 TradingAgents-CN 在本地 Docker 跑起来。
2. 围绕这个项目的能力，形成可复用的使用与部署方法。

项目定位很明确：这是一个中文化的多智能体股票研究/分析平台，不是实盘交易自动化工具。部署、配置和验证时也要按这个边界来做。

## 你应该何时触发这个 skill
当用户提到以下内容时，优先加载本 skill：
- TradingAgents-CN / TradingAgents 中文增强版
- Docker / docker-compose / 容器化部署
- FastAPI 后端、Vue 3 前端、MongoDB、Redis
- 股票研究、多智能体分析、新闻分析、报告导出
- 模型供应商配置、国产大模型、OpenAI/Google/DeepSeek/AiHubMix 等 API 配置
- 需要把项目“装起来”“跑起来”“验证起来”

## 工作原则
- 先确认仓库结构、部署入口、环境变量要求，再动手。
- 优先使用项目自带的 Docker 方案，不要自己发明新的启动方式。
- 部署目标是“可访问、可验证、可复现”，不是只跑一个容器就算完。
- 如果缺少 API key，允许先完成基础容器启动，但要明确哪些功能会受限。
- 这是金融研究工具，回答时不要把它包装成自动赚钱系统。

## 标准部署流程

### 1. 找到官方入口
优先检查这些文件：
- `README.md`
- `docker-compose.yml`
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `.env.docker`
- `docs/`

从这些文件里确认：
- 后端端口
- 前端端口
- 数据库依赖
- 需要哪些环境变量
- 有没有 arm64 / amd64 差异

### 2. 准备环境文件
通常做法是：
- 复制 `.env.docker` 为 `.env`
- 把占位 API key 换成真实值，或者先保留占位值用于“只验证容器能否启动”
- 确保数据库服务账号、密码、端口和 compose 文件一致

### 3. 启动服务
优先使用：
```bash
docker compose up -d --build
```
如果项目提供了管理型 profile，再按需加：
```bash
docker compose --profile management up -d --build
```

### 4. 验证健康状态
依次确认：
- `docker compose ps`
- 后端 health endpoint
- 前端页面可打开
- MongoDB / Redis 正常

如果项目没有明确 health endpoint，就用日志和端口可达性替代。

### 5. 记录已验证的使用方式
把项目的能力抽象成几个稳定的使用场景：
- 模型供应商配置
- 股票同步与数据准备
- 单票/多票分析
- 新闻过滤与分析
- 报告导出
- Docker 运维与排错

这些内容应写进 skill 正文，不要写成“看起来很强”的空话。

## 常见坑
- 只启动前端不代表项目可用，后端和数据库也要一起起来。
- 很多分析功能依赖数据同步，不先同步数据，结果可能不完整或报错。
- `.env.docker` 里的 key 常常是占位符；如果不替换，某些模型能力只能部分工作。
- 若 compose 文件用到了 `depends_on: condition: service_healthy`，某个基础服务的 healthcheck 失败会拖住整个栈。
- Apple Silicon / ARM 机器要留意镜像是否提供 arm64 或是否需要多架构构建。

## 推荐验证清单
部署后至少检查这些项：
- 容器都已启动
- 后端日志无致命异常
- 前端能打开首页
- MongoDB 和 Redis 可连接
- API 健康检查通过
- 如果有示例数据或同步按钮，能看到对应入口

## 输出建议
当用户让你部署时，最好按这个格式回应：
1. 你发现了什么部署入口
2. 你用了什么命令
3. 服务跑在哪里
4. 哪些功能受 API key 或数据同步影响
5. 下一步怎么用

## 这个 skill 的边界
它负责：部署、验证、配置说明、排错、能力梳理。
它不负责：证券建议、买卖指令、收益承诺。

## 如果你需要补充资料
优先看：
- `README.md`
- `docs/deployment/`
- `docs/guides/`
- `docker/`

如果用户要求进一步精细化，可以再把这些内容拆成更专门的子 skill，比如：
- 部署排错
- 模型供应商配置
- 数据同步与初始化
- 报告导出

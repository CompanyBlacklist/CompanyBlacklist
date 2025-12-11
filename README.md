# CompanyBlacklist (职场避雷针)

一个公益性质的企业违规行为曝光平台，旨在帮助职场人士规避不良企业，维护自身合法权益。

## 核心功能

- 📢 **企业爆料**：支持用户提交企业违规行为信息
- 🔍 **企业搜索**：快速搜索黑名单企业
- 🏆 **热榜展示**：实时更新的企业避雷热榜
- ⚖️ **双重审核**：确保信息真实性和准确性
- 📞 **企业申诉**：提供企业申诉通道，保障企业合法权益
- 📱 **多端支持**：Web 端 + Flutter 移动端（待完善）
- 🏷️ **标签分类**：对企业违规行为进行分类标签
- 📊 **数据统计**：提供平台数据统计和审核公示
- 📋 **透明公示**：志愿者贡献榜和审核流程公示

## 技术栈

### 后端 (ETL)
- **语言**：Node.js
- **框架**：无
- **核心依赖**：Octokit (GitHub API)、sanitize-html (防 XSS)、bottleneck (限速)

### 前端 (Web)
- **框架**：Astro v4.0.0
- **样式**：Tailwind CSS v3.4.0
- **搜索**：MiniSearch v6.0.0
- **Markdown 解析**：Marked v17.0.1
- **QR 码生成**：QRCode v1.5.4
- **SEO**：Sitemap、Schema.org

### 移动端 (App) -- 待完善
- **框架**：Flutter

### DevOps
- **CI/CD**：GitHub Actions
- **部署**：GitHub Pages

## 项目结构

```
├── .github/                  # GitHub 配置
│   ├── CODEOWNERS            # 权限锁
│   ├── workflows/            # CI/CD 脚本
│   │   ├── check-labels.yml  # 标签检查工作流
│   │   ├── code-quality.yml  # 代码质量检查
│   │   ├── etl.yml           # ETL 数据处理
│   │   ├── sync-labels.yml   # 标签同步
│   │   └── web-deploy.yml    # Web 部署
│   └── ISSUE_TEMPLATE/       # Issue 模板
├── scripts/                  # ETL 数据处理脚本
├── static_api/               # 生成的 JSON 数据
├── web/                      # Astro 静态网站
│   ├── public/               # 静态资源
│   ├── src/                  # 源代码
│   │   ├── components/       # 组件
│   │   ├── layouts/          # 布局
│   │   ├── pages/            # 页面
│   │   ├── styles/           # 样式
│   │   └── config.js         # 配置
│   └── astro.config.mjs      # Astro 配置
├── docs/                     # 项目文档
├── README.md                 # 项目说明
└── LICENSE                   # MIT 许可证
```

## 文档

- [API 规范文档](docs/API 规范文档 (API Specification).md)
- [业务流程文档](docs/业务流程文档 (Workflow Specification).md)
- [免责声明](docs/免责声明 (Disclaimer).md)
- [志愿者手册](docs/志愿者手册 (Volunteer Manual).md)
- [数据结构文档](docs/数据结构文档 (Data Schema).md)
- [构建与部署文档](docs/构建与部署文档 (Build & Deploy Documentation).md)
- [目录结构设计文档](docs/目录结构设计文档 (Directory Structure).md)
- [角色权限文档](docs/角色权限文档 (Roles & Permissions).md)
- [项目简介](docs/项目简介 (Project Requirements Document - Lite).md)

## 贡献指南

### 如何爆料
1. 点击 GitHub Issues 页面
2. 选择「企业避雷爆料」模板
3. 填写完整信息并提交
4. 等待审核通过后公开

### 如何申诉
1. 点击 GitHub Issues 页面
2. 选择「企业申诉」模板
3. 填写完整信息并提交
4. 等待管理员审核

### 如何贡献代码
1. Fork 本仓库
2. 创建新分支
3. 提交代码更改
4. 发起 Pull Request
5. 等待代码审查和合并

## 审核机制

1. **初步审核**：志愿者对爆料内容进行真实性核查
2. **最终审核**：管理员进行最终审核和标签确认
3. **双重标签**：只有同时获得 `audit:verified` 和 `admin:approved` 标签的内容才会被公开

## 免责声明

- 本平台仅作为信息聚合平台，不保证所有信息的绝对真实性
- 用户需自行核实信息，平台不承担任何法律责任
- 禁止利用本平台进行恶意攻击或诽谤
- 详情请查看 [免责声明](docs/免责声明 (Disclaimer).md)

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 联系我们

- 💬 **社区讨论**：[GitHub Discussions](https://github.com/CompanyBlacklist/CompanyBlacklist/discussions)
- 📢 **问题反馈**：[GitHub Issues](https://github.com/CompanyBlacklist/CompanyBlacklist/issues)

## 支持项目

如果您觉得本项目有帮助，欢迎通过以下方式支持我们：

- ⭐ **Star 本仓库**
- 💜 **赞助支持**：[爱发电](https://afdian.com/a/Ableand)

## 开发与部署

### 本地开发

```bash
# 安装依赖
cd web
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:4321/CompanyBlacklist

# 构建生产版本
npm run build
```

### 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages。当代码推送到主分支或手动触发工作流时，会自动执行以下步骤：
1. 运行 ETL 脚本生成静态 API 数据
2. 构建 Astro 静态网站
3. 将生成的文件部署到 GitHub Pages

## 平台数据

- 所有数据均通过 GitHub Issues 收集
- 数据经过严格的双重审核
- 数据格式采用 JSON，托管在 GitHub Pages
- 支持跨域访问，可被其他应用调用

## 网站访问

- **生产环境**：https://companyblacklist.github.io/CompanyBlacklist
- **API 基础路径**：https://companyblacklist.github.io/CompanyBlacklist/static_api/v1

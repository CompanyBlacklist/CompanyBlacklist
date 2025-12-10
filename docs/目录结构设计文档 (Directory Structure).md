# **目录结构设计文档 (Directory Structure)**

## **1\. 根目录概览 (Root)**

本项目采用 Monorepo 结构，将所有组件集中在一个仓库中管理。

/ (root)  
├── .github/                  \# GitHub 专用配置 (Actions, Templates, Security)  
├── scripts/                  \# \[Backend\] ETL 数据处理脚本 (Node.js)  
├── static\_api/               \# \[Data\] 生成的 JSON 数据 (被 .gitignore 忽略，但部署时存在)  
├── web/                      \# \[Frontend\] Astro 静态网站项目  
├── app/                      \# \[Client\] Flutter 移动端项目  
├── README.md                 \# 项目主说明文档  
└── LICENSE                   \# 开源协议 (建议 MIT)

## **2\. 详细结构定义 (Detailed Breakdown)**

### **2.1 GitHub 配置 (.github/)**

管理自动化流程、权限锁和用户交互模版。

.github/  
├── CODEOWNERS                \# \[Security\] 权限锁文件，锁定核心目录给 @Admins  
├── workflows/                \# CI/CD 自动化脚本  
│   ├── etl.yml               \# \[Core\] 数据 ETL 处理  
│   ├── web-deploy.yml        \# \[Core\] Web 构建和部署  
│   ├── check-labels.yml      \# 标签检查  
│   ├── code-quality.yml      \# 代码质量检查  
│   └── sync-labels.yml       \# 标签同步  
└── ISSUE\_TEMPLATE/           \# Issue 表单模版  
    ├── report.yml            \# 爆料模版 (status:pending)  
    └── appeal.yml            \# 申诉模版 (type:appeal)

### **2.2 ETL 后端 (scripts/)**

负责数据抓取、清洗和生成的 Node.js 环境。

scripts/  
├── package.json              \# 依赖定义 (octokit, fs-extra, pinyin, sanitize-html, bottleneck)  
└── generate\_api.js           \# \[Core\] 核心 ETL 逻辑脚本

### **2.3 生成数据 (static\_api/)**

注意：此目录下的文件由脚本自动生成，不建议手动修改。  
在 .gitignore 中应忽略此目录（除非你决定保留历史版本在 main 分支，但推荐仅 push 到 gh-pages）。  
static\_api/  
└── v1/  
    ├── meta.json             \# 系统元数据  
    ├── \_index.json           \# 全量精简索引  
    ├── hot.json              \# 热榜  
    ├── audit\_stats.json      \# 志愿者贡献榜  
    ├── search/               \# \[Dir\] 拼音分桶索引 (a.json, b.json...)  
    └── items/                \# \[Dir\] 详情数据 (按 ID 前缀分文件夹)

### **2.4 Web 前端 (web/)**

基于 Astro 的静态站点生成项目。

web/  
├── public/  
│   ├── robots.txt            \# 爬虫规则  
│   └── favicon.ico  
├── src/  
│   ├── components/  
│   │   ├── SearchBar.astro   \# 搜索组件  
│   │   └── AuditCard.astro   \# 审核公示组件  
│   ├── layouts/  
│   │   └── Layout.astro      \# 全局布局 (含 Header/Footer)  
│   └── pages/  
│       ├── index.astro       \# 首页 (热榜 \+ 搜索)  
│       └── company/  
│           └── \[id\].astro    \# \[Dynamic\] 公司详情页 (生成静态 HTML)  
├── astro.config.mjs          \# Astro 配置 (Sitemap, Tailwind)  
└── package.json

### **2.5 App 客户端 (app/)**

基于 Flutter 的移动端项目。

app/  
├── android/                  \# Android 原生工程  
├── ios/                      \# iOS 原生工程  
├── lib/  
│   ├── data/  
│   │   ├── models/           \# JSON 数据模型 (Company, Meta)  
│   │   └── repository.dart   \# 数据仓库 (Diff Sync, API Fetch)  
│   ├── ui/  
│   │   ├── pages/  
│   │   │   ├── home\_page.dart   \# 首页  
│   │   │   └── detail\_page.dart \# 详情页  
│   │   └── widgets/  
│   │       └── search\_bar.dart  
│   └── main.dart             \# 入口文件  
└── pubspec.yaml              \# Flutter 依赖定义

## **3\. 忽略文件配置 (.gitignore)**

为了保持仓库整洁，建议配置以下 .gitignore：

\# Node.js  
node\_modules/

\# Generated Data (视策略而定，通常建议忽略，由 Actions 动态生成)  
static\_api/

\# Flutter  
app/.dart\_tool/  
app/build/  
app/.pub/  
app/.flutter-plugins  
app/.flutter-plugins-dependencies

\# Astro  
web/dist/  
web/.astro/  

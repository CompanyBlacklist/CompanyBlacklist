# **项目简介 (Project Requirements Document - Lite)**

## **1. 项目概况**

* **项目名称**: OpenBlacklist (职场避雷针 - 公益版)  
* **项目版本**: v4.0 (Production Ready)  
* **核心理念**: Zero-Cost (零成本), Transparency (透明), Security (安全), GitHub Native (原生 GitHub 生态).  
* **项目目标**: 建立一个去中心化、透明、不可篡改的职场风险信息共享平台。利用 GitHub 的基础设施，实现永久免费托管和抗审查能力。

## **2\. 用户角色 (User Roles)**

* **求职者 (Public User)**:  
  * 浏览和搜索黑名单公司。  
  * 提交新的爆料 (Report)。  
  * 对不实信息发起申诉 (Appeal)。  
* **初审志愿者 (Moderator - @Mods)**:  
  * 负责对新爆料进行初步核实。  
  * 拥有 Triage 权限，负责打 audit:verified 标签。  
  * **无权修改核心代码**。  
* **管理员 (Admin - @Admins)**:  
  * 负责终审，打 admin:approved 标签。  
  * 处理申诉请求。  
  * 拥有 Write/Admin 权限，维护核心架构代码 (CODEOWNERS)。  
* **ETL 机器人 (Automation)**:  
  * 定时运行脚本，负责数据清洗、计算和分发。

## **3\. 核心功能模块 (Core Features)**

### **A. 数据录入与治理 (Data Ingestion)**

1. **结构化提交**: 利用 GitHub Issue Templates 规范爆料 (report.yml) 和申诉 (appeal.yml) 的输入格式。  
2. **双重审核锁 (Double-Lock)**: 数据必须同时经过初审 (audit:verified) 和终审 (admin:approved) 才能上线。  
3. **申诉与防刷**: 提供专用申诉通道，ETL 自动拦截 24 小时内的重复申诉 (Anti-Spam)。

### **B. 数据处理 (Serverless ETL)**

1. **增量同步**: 基于时间戳 (meta.json) 仅拉取变更数据，防止 API 超限。  
2. **安全清洗**: 严格清洗 Markdown (sanitize-html)，移除脚本和样式，仅保留安全文本和图片。  
3. **分片存储**: 生成拼音首字母索引 (search/{letter}.json) 和按 ID 分片的详情数据 (items/{id}.json)。  
4. **透明公示**: 自动提取并记录每条数据的审核人 (Reviewers)，生成志愿者贡献榜。

### **C. 数据展示 (Presentation)**

1. **Web 端 (Astro)**:  
   * 纯静态 HTML 生成 (SSG)，极致 SEO 优化。  
   * 集成 Sitemap, Tailwind CSS, JSON-LD (Schema.org)。  
   * 提供审核公示栏和申诉入口。  
   * 支持客户端搜索 (MiniSearch) 和 QR 码生成。  
2. **App 端 (Flutter)**:  
   * 离线优先策略。  
   * 基于全量索引 (_index.json) 的差量同步算法，节省流量。  
   * 支持 Android/iOS 双端。

## **4\. 技术栈约束 (Tech Stack Constraints)**

* **Database**: GitHub Issues (Strictly No SQL/NoSQL databases).  
* **Backend**: Node.js scripts running on GitHub Actions.  
* **Frontend**: Astro v4.0.0 (Static Site Generation).  
* **Client**: Flutter.  
* **Hosting**: GitHub Pages.  
* **Security**: GitHub Teams for RBAC, CODEOWNERS for file protection.
* **Dependencies**: 
  * MiniSearch for client-side search
  * QRCode for QR code generation
  * Marked for Markdown parsing
  * Tailwind CSS for styling
* **国际化预留 (i18n Ready)**: 
  * Web 端支持 `src/pages/[lang]/...` 多语言路由。
  * API 可扩展 `/v1/en/...` 等多语言目录。

## **5\. 核心页面结构 (Page Structure)**

1. **首页**: 全局搜索框 (拼音联想) + 热榜 (Top 50)。  
2. **详情页**: 公司基本信息 + 标签 + 避雷正文 + 审核人公示 + 申诉按钮 + QR 码分享。  
3. **公示页**: 志愿者贡献统计 + 项目透明度说明。
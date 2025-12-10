# **构建与部署文档 (Build & Deploy Documentation)**

## **1\. 本地开发环境搭建 (Local Development Setup)**

虽然项目核心运行在 GitHub Actions 上，但在开发 ETL 脚本、Web 页面或 Flutter App 时，你需要在本地运行。

### **1.1 前置要求 (Prerequisites)**

* **Git**: 版本控制。  
* **Node.js**: v18+ (用于 ETL 脚本和 Astro Web)。  
* **Flutter SDK**: v3.16+ (用于 App 开发)。  
* **IDE**: 推荐 VS Code (Web/Script) 和 Android Studio/VS Code (Flutter)。

### **1.2 后端 ETL 脚本 (/scripts)**

用于测试数据抓取和生成逻辑。

cd scripts  
npm install

\# 设置环境变量 (需要 GitHub Token 以访问 API)  
\# Windows (PowerShell)  
$env:GITHUB\_TOKEN="你的\_PAT\_TOKEN"; $env:REPO\_OWNER="CompanyBlacklist"; $env:REPO\_NAME="CompanyBlacklist"; node generate\_api.js  
\# Mac/Linux  
GITHUB\_TOKEN="你的\_PAT\_TOKEN" REPO\_OWNER="CompanyBlacklist" REPO\_NAME="CompanyBlacklist" node generate\_api.js

*运行成功后，检查根目录下的 static\_api/v1/ 是否生成了 JSON 文件。*

### **1.3 Web 前端 (/web)**

用于开发 Astro 静态网站。

cd web  
npm install

\# 启动本地开发服务器 (热重载)  
npm run dev  
\# 访问 http://localhost:4321/CompanyBlacklist 查看效果

\# 构建生产版本 (生成 dist 目录)  
npm run build

### **1.4 App 客户端 (/app)**

用于开发 Flutter 移动端应用。

cd app  
flutter pub get

\# 运行在模拟器或真机上  
flutter run

\# 生成发布包 (Android APK)  
flutter build apk \--release

## **2\. 自动化部署架构 (CI/CD Architecture)**

本项目完全依赖 **GitHub Actions** 进行持续集成与部署。我们设计了两个独立的 Workflow 以分离关注点。

### **2.1 核心流水线: ETL & Web Deploy (etl\_and\_web.yml)**

这是系统的“心脏”，负责数据更新和网站发布。

* **触发条件**:  
  1. **定时**: 每 4 小时 (cron: '0 \*/4 \* \* \*')。  
  2. **事件**: 当 Issue 被打上 admin:approved 标签时。  
  3. **手动**: Workflow Dispatch。  
* **执行步骤 (Jobs)**:  
  1. **Checkout**: 拉取代码库。  
  2. **Data Sync**: 拉取 gh-pages 分支的旧数据（用于增量对比）。  
  3. **ETL Execution**: 运行 node scripts/generate\_api.js。  
     * 清洗数据 \-\> 生成 JSON \-\> 存入 static\_api/。  
  4. **Web Build**: 运行 cd web && npm run build。  
     * Astro 读取 static\_api/ \-\> 生成 HTML \-\> 存入 web/dist/。  
  5. **Deploy**: 使用 peaceiris/actions-gh-pages。  
     * 将 static\_api/ (作为 API) 和 web/dist/ (作为网站) **合并**推送到 gh-pages 分支。  
     * **关键**: Commit message 包含 \[skip ci\] 以防止递归死循环。

### **2.2 App 发布流水线: App Release (app\_release.yml)**

仅在发布新版 App 时运行。

* **触发条件**:  
  1. **Tag Push**: 推送标签如 v1.0.0。  
  2. **手动**: Workflow Dispatch。  
* **执行步骤**:  
  1. **Build**: 构建 Android APK 和 iOS IPA (需配置证书)。  
  2. **Release**: 创建 GitHub Release，自动上传安装包附件。

## **3\. 环境变量与密钥 (Secrets & Environment)**

在 GitHub 仓库的 **Settings \-\> Secrets and variables \-\> Actions** 中配置。

| 变量名 | 必需性 | 描述 |
| :---- | :---- | :---- |
| GITHUB\_TOKEN | **自动** | GitHub 内置 Token，无需手动配置。需在 Settings \-\> Actions \-\> General 中赋予 **Read and write permissions**。 |
| ANDROID\_KEYSTORE\_BASE64 | 可选 | (App发布用) Android 签名文件 Base64 编码。 |
| ANDROID\_KEY\_PASSWORD | 可选 | (App发布用) 签名密码。 |
| ANDROID\_ALIAS\_PASSWORD | 可选 | (App发布用) 别名密码。 |

## **4\. 部署验证 (Verification)**

### **4.1 检查 API**

访问 https://companyblacklist.github.io/CompanyBlacklist/static\_api/v1/meta.json。

* 确认 last\_updated 是最新时间。  
* 确认 JSON 内容可访问。

### **4.2 检查网站**

访问 https://companyblacklist.github.io/CompanyBlacklist/。

* 确认首页热榜数据已加载。  
* 确认点击公司详情能正确跳转静态页面 (/CompanyBlacklist/company/10086)。  
* **SEO 检查**: 查看页面源代码，确认 \<title\> 和 \<meta name="description"\> 包含真实的公司数据，而不是空的模板。

### **4.3 常见故障排查 (Troubleshooting)**

* **404 Not Found**: 检查 gh-pages 分支是否生成。检查仓库 Settings \-\> Pages 是否指向了 gh-pages 分支的 / (root)。  
* **API Rate Limit**: ETL 脚本报错 403。检查是否使用了 GITHUB\_TOKEN，并确认 bottleneck 限速配置是否生效。  
* **递归构建**: 检查 Actions 历史，看是否出现无限循环构建。确认 ETL 提交时是否带了 \[skip ci\]。

## **5\. 监控与告警 (Monitoring & Alerting)**

为确保系统稳定运行，建议配置以下告警机制：

### **5.1 GitHub Actions 告警**

*   **触发条件**:
    1.  ETL 脚本执行失败 (Exit Code != 0)。
    2.  单次运行删除数据超过 10 条（可能为异常批量撤销）。
    3.  API Rate Limit 达到 80% 阈值。
*   **通知渠道**:
    *   **Slack Webhook**: 推荐使用 `slackapi/slack-github-action`。
    *   **Email**: 通过 `dawidd6/action-send-mail` 发送邮件告警。

### **5.2 配置示例 (Slack)**

```yaml
# 在 etl_and_web.yml 的 job 末尾添加
- name: Notify on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {"text": "🚨 ETL Pipeline Failed! Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
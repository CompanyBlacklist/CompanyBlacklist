# **角色权限文档 (Roles & Permissions)**

## **1\. 概述 (Overview)**

本项目完全基于 **GitHub Organization** 的权限体系构建。我们不开发独立的后台管理系统，而是直接利用 GitHub 的 Issue、Labels 和 PR 流程进行协作。

### **核心原则**

* **最小权限原则 (Least Privilege)**: 志愿者仅拥有打标签和分类的权限，无法修改核心代码。  
* **双重确认机制 (Double-Lock)**: 任何数据上线都必须经过初审（志愿者）和终审（管理员）两级确认。  
* **代码即法律 (Code is Law)**: 核心规则通过 .github/CODEOWNERS 和 Branch Protection Rules 固化。

## **2\. 角色定义 (Role Definitions)**

### **2.1 公众用户 (Public User)**

* **身份**: 任何拥有 GitHub 账号的互联网用户。  
* **权限**:  
  * Read: 浏览代码仓库、Web 页面、App 内容。  
  * Create Issue: 提交爆料 (report.yml) 或申诉 (appeal.yml)。  
  * Comment: 在 Issue 下参与讨论或补充证据。  
* **限制**: 无法打标签，无法关闭非自己创建的 Issue。

### **2.2 初审志愿者 (Moderators)**

* **GitHub Team**: @OpenBlacklist/Mods  
* **仓库权限**: **Triage** (分类权限)  
* **职责**:  
  1. **每日巡查**: 检查 status:pending 的新 Issue。  
  2. **证据核实**: 确认爆料内容是否包含有效证据（聊天记录、判决书等）。  
  3. **打标签**:  
     * 证据确凿 \-\> 打上 audit:verified (初审通过)。  
     * 证据不足 \-\> 打上 status:info-needed 并评论引导补充。  
     * 恶意捣乱 \-\> 打上 status:rejected 并关闭 Issue。  
* **安全限制**: **无法** 推送代码、合并 PR 或修改 .github/ 目录下的配置。

### **2.3 管理员 (Admins)**

* **GitHub Team**: @OpenBlacklist/Admins  
* **仓库权限**: **Maintain** 或 **Admin**  
* **职责**:  
  1. **终审**: 复核带有 audit:verified 的 Issue，打上 admin:approved (触发上线)。  
  2. **申诉裁决**: 处理 type:appeal，决定是否移除已上线的 admin:approved 标签。  
  3. **代码维护**: 审核并合并 Pull Requests，维护 ETL 脚本和 Web 前端代码。  
  4. **团队管理**: 邀请或移除志愿者。

### **2.4 自动化机器人 (ETL Bot)**

* **身份**: github-actions\[bot\] (默认) 或 专用的 Bot 账号  
* **权限**: **Write** (需在 Settings 中配置)  
* **职责**:  
  * 执行 ETL 脚本。  
  * 自动推送生成的 JSON 到 gh-pages 分支。  
  * 自动识别重复申诉并关闭 Issue。

## **3\. 权限配置操作指南 (Configuration Guide)**

### **3.1 创建团队 (Create Teams)**

在 GitHub Organization 页面 \-\> Teams：

1. 创建团队 **Mods** \-\> 添加仓库 OpenBlacklist \-\> 权限选 **Triage**。  
2. 创建团队 **Admins** \-\> 添加仓库 OpenBlacklist \-\> 权限选 **Admin**。

### **3.2 分支保护规则 (Branch Protection)**

在仓库 Settings \-\> Branches \-\> Add rule (main 分支)：

1. **Require pull request reviews before merging**:  
   * 勾选 **Require review from Code Owners** (必须)。  
   * 这确保了即便志愿者误操作提交了 PR，没有管理员批准也无法合并。  
2. **Do not allow bypassing the above settings**: 勾选 (防止管理员手滑)。

### **3.3 标签权限说明 (Label Permissions)**

* GitHub 目前不支持对特定 Label 设置权限（即谁能打什么标签）。  
* **解决方案**: 依靠 **ETL 脚本逻辑**。  
  * ETL 脚本会检查 audit:verified 是否存在。虽然 Triage 用户可以打 admin:approved 标签（GitHub 限制），但我们的流程规定管理员才打这个。  
  * *进阶风控*: 可以在 ETL 脚本中通过 API 检查 admin:approved 标签**实际上是谁打的**。如果发现是非 Admin 组的用户打的，脚本可以自动移除该标签并报警。

## **4\. 权限矩阵 (Permission Matrix)**

| 操作 / 资源 | Public | @Mods (Triage) | @Admins (Admin) | Actions Bot |
| :---- | :---- | :---- | :---- | :---- |
| **提交爆料/申诉** | ✅ | ✅ | ✅ | ❌ |
| **评论 Issue** | ✅ | ✅ | ✅ | ✅ |
| **打标签 (Label)** | ❌ | ✅ | ✅ | ✅ |
| **关闭他人 Issue** | ❌ | ✅ | ✅ | ✅ |
| **修改代码 (/scripts)** | ❌ | ❌ (被 CODEOWNERS 拦截) | ✅ | ❌ |
| **Push 到 gh-pages** | ❌ | ❌ | ✅ | ✅ |
| **添加/移除成员** | ❌ | ❌ | ✅ | ❌ |

## **5\. 紧急响应流程 (Emergency Protocols)**

### **5.1 志愿者账号被盗**

如果发现 @Mods 成员疯狂乱打标签或乱发垃圾信息：

1. **Admins** 立即在 Org Settings 中将该成员移除出 Team。  
2. **Admins** 运行手动 Workflow (ETL) 触发一次清洗。  
3. **Admins** 批量撤销该账号最近的操作（可能需要手动或写一次性脚本）。

### **5.2 恶意刷屏攻击**

如果出现大量机器人提交 Issue：

1. 开启仓库的 **"Limit interaction"** 功能（Settings \-\> Moderation options）。  
2. 设置为 "Limit to collaborators only" 或 "Limit to users that have verified their email"。  
3. ETL 脚本的 Anti-Spam 逻辑会自动拦截重复申诉。
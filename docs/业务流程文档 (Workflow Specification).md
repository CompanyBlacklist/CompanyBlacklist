# **业务流程文档 (Workflow Specification)**

## **1\. 数据收录流程 (Data Ingestion Workflow)**

此流程描述了一条“避雷信息”如何从用户提交变成公开数据。

### **阶段零：自动化校验 (Automated Validation)**

1.  **提交拦截**: 若表单关键字段 (如公司名) 为空，GitHub Actions/模版配置将阻止提交。
2.  **格式检查**: 初步验证证据链接格式 (Regex Check)。
3.  **活体检测 (Live Check)**: ETL 脚本对证据链接发起 Headless 请求，标记 404/5xx 链接（但不直接拒绝，需人工确认）。

### **阶段一：提交 (Submission)**

1. **用户** 访问 GitHub Issues 页面或通过 App/Web 点击“我要爆料”。  
2. **系统** 提供 report.yml 模版。  
3. **用户** 填写表单（公司名、城市、证据链接等）。  
4. **GitHub** 创建新 Issue，并自动打上 status:pending 标签。

### **阶段二：初审 (Triage / Verification)**

* **执行人**: 志愿者 (@Mods)  
* **动作**:  
  1. 检查 Issue 内容是否完整，证据链接是否有效。  
  2. 若证据不足 \-\> 添加评论要求补充 \-\> 打标签 status:info-needed。  
  3. 若属实 \-\> 打标签 audit:verified (此时 Issue 变为**蓝色**标签状态)。  
  4. 若违规/恶意 \-\> 打标签 status:rejected \-\> 关闭 Issue。
  * **参考标准**: 请查阅《审核标准手册》以统一判断尺度。

### **阶段三：终审 (Final Approval)**

* **执行人**: 管理员 (@Admins)  
* **动作**:  
  1. 定期筛选带有 audit:verified 的 Issue。  
  2. 复核内容合规性。  
  3. 确认无误 \-\> 打标签 admin:approved (此时 Issue 同时拥有**蓝+绿**双标签)。  
  * **触发点**: 一旦打上 admin:approved，GitHub Actions 将在下一次调度时抓取该数据。

## **2\. 自动化构建流程 (ETL Automation Workflow)**

此流程描述 Node.js 脚本 (scripts/generate\_api.js) 如何在 GitHub Actions 中运行。

### **触发条件 (Triggers)**

1. **定时触发**: 每 4 小时 (cron: '0 \*/4 \* \* \*')。  
2. **事件触发**: 当 Issue 被打上 admin:approved 标签时。  
3. **手动触发**: workflow\_dispatch。
4. **并发控制**: (Concurrency Group: etl-data-pipeline) 确保同一时间只有一个构建在运行，避免 Git Push 冲突。

### **执行步骤 (Execution Steps)**

1. **初始化环境 (Setup)**  
   * 检出代码仓库 (main 分支)。  
   * 检出数据分支 (gh-pages 分支) 到临时目录，用于读取 meta.json 和旧数据。  
   * 安装依赖 (npm install).  
2. **增量拉取与同步 (Incremental Fetch & Sync)**  
   * 读取 meta.json 获取 last\_updated 时间戳。  
   * 调用 GitHub API 拉取所有自 last\_updated 后**更新过**的 Issue (State: All)。  
   * **逻辑判断**:
     * **新增/更新**: 若 Issue 拥有 (audit:verified + admin:approved) -> 写入/更新数据。
     * **立即下架**: 若 Issue ID 已存在于 API 中，但不再拥有上述双标签 -> **从数据文件中删除**。 
   * **限速保护**: 使用 bottleneck 库限制 API 并发请求数，防止 403 错误。  
3. **防重与申诉检查 (Anti-Spam & Deduplication)**  
   * 扫描当前批次数据。
   * **ID 查重**: 确保新收录的公司 ID 不会覆盖现有的不同公司数据 (如发生 Hash 碰撞，需报警)。
   * **申诉拦截**: 若发现针对同一 company\_id 的重复恶意申诉 (type:appeal) -> 自动关闭。  
4. **数据处理 (Processing)**  
   * **清洗**: 使用 sanitize-html 移除 Issue Body 中的危险标签 (\<script\>, \<iframe\> 等)。  
   * **隐私脱敏 (Privacy Scrubbing)**:
     * **文本**: 自动替换正文中的手机号、身份证号为 `***`。
     * **图片**: (可选) 使用 sharp 库剥离图片 EXIF 信息 (GPS/Device Model)。
   * **审计提取**: 调用 issues.listEvents API，提取打标签的操作人 (first\_reviewer, final\_reviewer)。  
   * **拼音转换**: 将公司名转换为拼音首字母 (用于分片索引)。  
5. **文件生成 (Generation)**  
   * 更新 items/{prefix}/{id}.json (覆盖、新增或删除)。  
   * 更新 search/{letter}.json (同步增删操作)。  
   * 更新 \_index.json (全量索引，包含 {id, u})。  
   * 更新 hot.json (按更新时间排序 Top 50)。  
   * 更新 audit\_stats.json (累加审核员贡献计数)。  
   * 更新 meta.json (写入当前时间戳)。
   * **时效标记**: 对超过 2 年未更新的数据自动添加 `stale: true` 标记，前端展示 `[历史记录]` 标签。  
6. **部署 (Deploy)**  
   * 将生成的 static\_api/ 目录 Push 到 gh-pages 分支。  
   * **关键点**: Commit Message 必须包含 \[skip ci\] 以防止递归触发构建。

## **3\. 申诉与下架流程 (Appeal & Takedown Workflow)**

### **阶段一：发起申诉**

1. **用户** 在详情页点击“申诉”按钮。  
2. **系统** 跳转到 GitHub New Issue 页面，URL 参数预填了 template=appeal.yml 和 title=\[申诉\] ID:10086...。  
3. **用户** 提交申诉，Issue 自动获得 type:appeal 标签。

### **阶段二：处理申诉**

* **执行人**: 管理员 (@Admins)  
* **动作**:  
  1. 收到申诉通知，核查证据。  
  2. **若申诉无效** \-\> 关闭申诉 Issue。  
  3. **若申诉有效** \-\> 找到原爆料 Issue (ID:10086) \-\> **移除** admin:approved 标签。  
  4. (可选) 添加评论说明下架原因，并关闭原爆料 Issue。

### **阶段三：自动下架**

1. 下一次 **ETL 脚本** 运行时，会重新扫描数据或检测到标签变更。  
2. 由于原 Issue 缺少了 admin:approved 标签，它将不会被包含在新的索引中。  
3. **优化策略**: ETL 脚本每天执行一次“全量索引校准”，自动剔除那些标签被撤销的“僵尸数据”。
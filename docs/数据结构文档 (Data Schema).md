# **数据结构文档 (Data Schema)**

## **1\. 存储规范 (Storage Specification)**

* **Base Path**: /CompanyBlacklist/static\_api/v1/  
* **Versioning**: 所有数据文件必须包含在版本号目录 (v1/) 下，以保证未来兼容性。  
* **Format**: 标准 JSON，UTF-8 编码。  
* **Hosting**: GitHub Pages (通过 CDN 分发)。

## **2\. 目录结构树 (Directory Tree)**

/CompanyBlacklist/static\_api/v1/  
├── meta.json             \# 系统元数据 (最后更新时间、数据总量)  
├── \_index.json           \# 全量精简索引 (用于 App 差量同步)  
├── hot.json              \# 热榜数据 (最近更新的 Top 50\)  
├── audit\_stats.json      \# 志愿者贡献统计 (用于公示页)  
├── search/               \# \[分片\] 搜索索引  
│   ├── a.json            \# 拼音首字母 'a' 开头的公司  
│   ├── ...  
│   ├── z.json  
│   └── other.json        \# 数字或特殊字符开头  
└── items/                \# \[分片\] 详情数据 (按 ID 前缀分文件夹)  
    ├── 10/               \# ID 为 10xx 的数据  
    │   ├── 1001.json  
    │   └── 1099.json  
    └── ...

## **3\. JSON 模型定义 (Schema Definitions)**

### **3.1 系统元数据 (meta.json)**

用于客户端检查是否需要更新。

interface MetaData {  
  last\_updated: string;   // ISO 8601 时间戳 (如 "2023-12-01T12:00:00Z")  
  total\_count: number;    // 收录总条数  
  version: string;        // API 版本号 (如 "1.0.0")  
  build\_id: string;       // GitHub Actions Run ID (用于追踪构建)  
}

### **3.2 全量精简索引 (\_index.json)**

**核心用途**: Flutter App 启动时下载此文件，与本地数据库对比 u (update\_time)，仅下载变动的数据，极大节省流量。

type GlobalIndex \= {  
  id: number; // 公司 ID (对应 GitHub Issue Number)  
  u: number;  // Update Timestamp (Unix 秒级时间戳)  
}\[\];

### **3.3 搜索索引分片 (search/{letter}.json)**

**核心用途**: Web 端和 App 端根据用户输入的拼音首字母加载对应的 JSON，实现快速搜索。

type SearchIndexShard \= {  
  id: number;  
  n: string;      // Name: 公司全称 (如 "腾讯科技")  
  c: string;      // City: 所在城市  
  t: string\[\];    // Tags: 标签列表 (如 \["996", "裁员", "拖欠工资"\])  
  u: number;      // Updated At (Unix 秒级时间戳)  
}\[\];

### **3.4 详情数据 (items/{prefix}/{id}.json)**

**核心用途**: 展示公司的完整避雷信息。Markdown 必须经过清洗。

interface CompanyDetail {  
  id: number;  
  name: string;           // 公司全称  
  city: string;           // 城市  
  tags: string\[\];         // 标签  
  title: string;          // 爆料标题 (来自 Issue 标题)
    
  // 内容部分  
  body\_html: string;      // 经过 sanitize-html 清洗的安全 HTML (移除 script/iframe/style)，并已自动脱敏 (隐藏手机号/身份证)。  
  raw\_body: string;       // 原始 Markdown 内容 (用于前端二次渲染)
  images: string\[\];       // 从正文中提取的图片 URL 列表  
    
  // 审计公示 (Transparency)  
  audit\_info: {  
    first\_reviewer: string; // 初审志愿者 GitHub ID  
    final\_reviewer: string; // 终审管理员 GitHub ID  
    publisher: string;      // 爆料人 GitHub ID (Issue 创建者)
    approved\_at: string;    // ISO 时间戳  
  };  
    
  // 链接  
  source\_url: string;     // 原始 Issue 链接  
  report\_url: string;     // 预生成的申诉链接 (指向 GitHub New Issue 页面，带预填参数)  
    
  created\_at: string;     // ISO 时间戳  
  updated\_at: string;     // ISO 时间戳  
}

### **3.5 热榜数据 (hot.json)**

**核心用途**: 首页默认展示的内容，通常按更新时间倒序排列。

// 结构同 SearchIndexShard，包含最新的 50 条数据  
type HotList \= {  
  id: number;  
  n: string;  
  c: string;  
  t: string\[\];  
  u: number;  
}\[\];

### **3.6 志愿者贡献榜 (audit\_stats.json)**

**核心用途**: 在“关于”或“公示”页面展示，激励社区贡献。

interface AuditStats {  
  updated\_at: string;  
  // key 为 GitHub 用户名, value 为审核通过的数量  
  reviewers: {  
    \[username: string\]: number;   
  };  
  total\_reviews: number;  
}  

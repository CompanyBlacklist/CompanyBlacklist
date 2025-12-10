# **API 规范文档 (API Specification)**

## **1\. 接口概述 (Overview)**

本项目采用 **Static API** 模式。所有接口本质上都是托管在 GitHub Pages 上的静态 JSON 文件。

* **Base URL**: https://companyblacklist.github.io/CompanyBlacklist/static\_api/v1  
  * *开发环境*: 可指向本地 Server，如 http://localhost:4321/CompanyBlacklist/static\_api/v1  
* **Protocol**: HTTPS  
* **Method**: 仅支持 GET  
* **Content-Type**: application/json; charset=utf-8  
* **CORS**: GitHub Pages 默认开启 CORS，支持跨域访问。

## **2\. 核心接口定义 (Endpoints)**

### **2.1 检查更新 (Check Update)**

用于客户端判断是否需要同步数据。

* **URL**: /meta.json  
* **用途**: App 启动时调用。  
* **Response**:  
  {  
    "last\_updated": "2023-12-01T12:00:00Z",  
    "total\_count": 1024,  
    "version": "1.0.0",  
    "build\_id": "892139123"  
  }

### **2.2 全量索引同步 (Global Index Sync)**

用于客户端进行差量对比，实现“省流更新”。

* **URL**: /\_index.json  
* **逻辑**: App 下载此文件 \-\> 对比本地数据库 \-\> 找出 u (update\_time) 变动的 ID \-\> 仅下载这些 ID 的详情。  
* **Response**:  
  \[  
    { "id": 1001, "u": 1701432000 },  
    { "id": 1002, "u": 1701435600 }  
  \]

### **2.3 拼音搜索 (Pinyin Search)**

用于实现“输入即搜索”的极速体验。

* **URL**: /search/{letter}.json (或 /search/{letter}-{page}.json)
* **Parameters**:  
  * {letter}: 公司拼音首字母 (小写 a-z, 或 other)。
  * {page}: (可选) 二级分片页码。当单个字母索引文件超过 200KB 时，系统将自动拆分为多个文件。
* **Example**: 
  * /search/t.json (默认)
  * /search/t-1.json (若 T 开头数据过多)  
* **Example**: /search/t.json (获取所有T开头的公司)  
* **Response**:  
  \[  
    {  
      "id": 10086,  
      "n": "tt科技",  
      "c": "深圳",  
      "t": \["996", "大厂"\],  
      "u": 1701432000  
    }  
  \]

### **2.4 获取热榜 (Get Hot List)**

用于首页展示。

* **URL**: /hot.json  
* **Response**: 同 search/{letter}.json 结构，包含最新的 50 条数据。

### **2.5 获取详情 (Get Detail)**

获取公司的完整避雷信息。

* **URL**: /items/{prefix}/{id}.json  
* **Parameters**:  
  * {id}: GitHub Issue ID (如 10086).  
  * {prefix}: ID 分片前缀，计算公式为 Math.floor(id / 100)。  
* **Example**: ID 为 10086 \-\> /items/100/10086.json  
* **Response**:  
  {  
    "id": 10086,  
    "name": "tt科技",  
    "city": "深圳",  
    "tags": \["996"\],  
    "body\_html": "\<p\>已清洗的正文内容...\</p\>",  
    "images": \["\[https://user-images.githubusercontent.com/\](https://user-images.githubusercontent.com/)..."\],  
    "audit\_info": {  
      "first\_reviewer": "volunteer\_bob",  
      "final\_reviewer": "admin\_alice",  
      "approved\_at": "2023-12-01T12:00:00Z"  
    },  
    "source\_url": "\[https://github.com/user/repo/issues/10086\](https://github.com/user/repo/issues/10086)",  
    "report\_url": "\[https://github.com/user/repo/issues/new?template=appeal.yml\&title=\](https://github.com/user/repo/issues/new?template=appeal.yml\&title=)..."  
  }

### **2.6 获取透明度公示 (Get Audit Stats)**

用于“关于”页面展示志愿者贡献。

* **URL**: /audit\_stats.json  
* **Response**:  
  {  
    "updated\_at": "2023-12-01T12:00:00Z",  
    "total\_reviews": 500,  
    "reviewers": {  
      "volunteer\_bob": 120,  
      "admin\_alice": 380  
    }  
  }

## **3\. 客户端集成指南 (Integration Guide)**

### **3.1 错误处理**

* **404 Not Found**: 表示该公司数据已被下架或尚未生成。客户端应提示“数据暂不可用”。  
* **CORS Error**: 开发模式下若遇到，请检查请求头，生产环境 GitHub Pages 自动支持。

### **3.2 缓存策略 (Client-Side Caching)**

由于 GitHub Pages 的 Cache-Control 我们无法直接控制（通常是 10分钟），建议客户端实现以下逻辑：

1. **强缓存**: 对于 items/{id}.json，一旦下载成功，除非 \_index.json 指示该 ID 更新了，否则永久读取本地缓存。  
2. **弱缓存**: 对于 meta.json 和 hot.json，每次启动 App 时强制网络请求。  
3. **搜索缓存**: 对于 search/t.json，在 App 单次生命周期内缓存内存，重启后失效。
// 平台配置文件 - 子路径部署版本
// 所有配置项都应集中在此文件中，便于管理和维护
// 配置项分类：基本信息、部署配置、路径配置、API配置、功能配置、GitHub配置等
export const config = {
  // ===========================
  // 基本信息配置
  // ===========================
  platformName: 'CompanyBlacklist',           // 平台英文名称
  platformTitle: '职场避雷针',                 // 平台中文名称
  platformDescription: '一个公益性质的企业违规行为曝光平台', // 平台描述
  
  // ===========================
  // 部署配置
  // ===========================
  deployment: {
    mode: 'subpath',                          // 部署模式：subpath（子路径）或 root（根路径）
    baseUrl: '/CompanyBlacklist',             // 基础路径，子路径部署时为仓库名称
    siteUrl: 'https://companyblacklist.github.io/CompanyBlacklist', // 生产环境完整URL
  },
  
  // ===========================
  // 页面路径配置
  // ===========================
  paths: {
    // 公共路径前缀
    prefix: '/CompanyBlacklist',              // 页面路径前缀，与deployment.baseUrl保持一致
    
    // 页面具体路径
    home: '/CompanyBlacklist',                // 首页路径
    about: '/CompanyBlacklist/about',         // 关于页面路径
    contact: '/CompanyBlacklist/contact',     // 联系我们页面路径
    disclaimer: '/CompanyBlacklist/disclaimer', // 免责声明页面路径
    stats: '/CompanyBlacklist/stats',         // 统计页面路径
    companyDetail: '/CompanyBlacklist/company', // 公司详情页基础路径
    search: '/CompanyBlacklist/search',       // 搜索页面路径
  },
  
  // ===========================
  // 静态API配置
  // ===========================
  api: {
    base: '/CompanyBlacklist/static_api/v1',  // API基础路径
    items: '/CompanyBlacklist/static_api/v1/items', // 公司详情数据路径
    hot: '/CompanyBlacklist/static_api/v1/hot.json', // 热榜数据路径
    meta: '/CompanyBlacklist/static_api/v1/meta.json', // 元数据路径
    auditStats: '/CompanyBlacklist/static_api/v1/audit_stats.json', // 审核统计数据路径
    index: '/CompanyBlacklist/static_api/v1/_index.json', // 索引数据路径
  },
  
  // ===========================
  // 导航配置
  // ===========================
  navigation: {
    home: {
      label: '首页',                          // 导航项中文名称
      url: '/CompanyBlacklist'                // 导航链接
    },
    about: {
      label: '关于',                          // 导航项中文名称
      url: '/CompanyBlacklist/about'          // 导航链接
    },
    stats: {
      label: '统计',                          // 导航项中文名称
      url: '/CompanyBlacklist/stats'          // 导航链接
    },
    contact: {
      label: '联系我们',                      // 导航项中文名称
      url: '/CompanyBlacklist/contact'        // 导航链接
    },
    disclaimer: {
      label: '免责声明',                      // 导航项中文名称
      url: '/CompanyBlacklist/disclaimer'     // 导航链接
    }
  },
  
  // ===========================
  // 功能配置
  // ===========================
  features: {
    hotListSize: 50,                          // 热榜企业数量
    relatedCompaniesSize: 6,                  // 相关公司推荐数量
    enableSearch: true,                       // 是否启用搜索功能
    enableRelatedCompanies: true,             // 是否启用相关公司推荐
  },
  
  // ===========================
  // GitHub配置
  // ===========================
  github: {
    org: 'CompanyBlacklist',                  // GitHub组织名称
    repo: 'CompanyBlacklist',                 // GitHub仓库名称
    url: 'https://github.com/CompanyBlacklist/CompanyBlacklist', // 仓库首页
    reportIssueUrl: 'https://github.com/CompanyBlacklist/CompanyBlacklist/issues/new?template=report.yml', // 举报问题链接
    appealIssueUrl: 'https://github.com/CompanyBlacklist/CompanyBlacklist/issues/new?template=appeal.yml', // 申诉问题链接
  },
  
  // ===========================
  // 便捷配置项（向后兼容）
  // ===========================
  githubUrl: 'https://github.com/CompanyBlacklist/CompanyBlacklist', // 仓库首页链接
  reportIssueUrl: 'https://github.com/CompanyBlacklist/CompanyBlacklist/issues/new?template=report.yml', // 举报问题链接
  appealIssueUrl: 'https://github.com/CompanyBlacklist/CompanyBlacklist/issues/new?template=appeal.yml', // 申诉问题链接
  
  // ===========================
  // 其他配置说明
  // ===========================
  // 以下配置项由于特定原因无法聚合到此文件中：
  // 1. Astro配置：在astro.config.mjs中，包括site、base等部署相关配置
  // 2. Tailwind配置：在tailwind.config.js中，包括主题、插件等样式相关配置
  // 3. 环境变量：在.env文件中，包括API密钥、部署环境等敏感信息
  // 4. ETL配置：在scripts/generate_api.js中，包括GitHub API配置、数据处理规则等
  // 5. GitHub Actions配置：在.github/workflows/中，包括CI/CD流程配置
};
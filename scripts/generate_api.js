#!/usr/bin/env node

// 依赖导入
import { Octokit } from '@octokit/rest';
import Bottleneck from 'bottleneck';
import fs from 'fs-extra';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import path from 'path';
import url from 'url';



// 日志工具函数
const logger = {
  info: (message) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
  error: (message, error) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || ''),
  debug: (message) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    }
  },
};

// 配置参数
const CONFIG = {
  // GitHub 仓库信息
  OWNER: process.env.GITHUB_OWNER || 'OpenBlacklist',
  REPO: process.env.GITHUB_REPO || 'CompanyBlacklist',

  // API 限速配置
  RATE_LIMIT: {
    MAX_CONCURRENT: parseInt(process.env.RATE_LIMIT_MAX_CONCURRENT || '1'),
    MIN_TIME: parseInt(process.env.RATE_LIMIT_MIN_TIME || '1000'), // 毫秒
  },

  // 数据存储路径
  API_BASE_PATH: process.env.API_BASE_PATH || '../static_api/v1',

  // 热榜数量
  HOT_LIST_SIZE: parseInt(process.env.HOT_LIST_SIZE || '50'),

  // 清洗规则
  SANITIZE_OPTIONS: {
    allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'img', 'blockquote'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['http', 'https'],
    allowedIframeHostnames: [],
    disallowedTagsMode: 'discard',
    transformTags: {
      img: (tagName, attributes) => {
        // 移除图片的 EXIF 数据（通过重新获取图片 URL 实现）
        return { tagName, attributes };
      },
    },
  },

  // 隐私脱敏正则
  PRIVACY_REGEX: {
    PHONE: /1[3-9]\d{9}/g,
    ID_CARD: /\d{17}[\dXx]/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },

  // 图片链接正则
  IMAGE_REGEX: /<img[^>]+src="([^"]+)"[^>]*>/g,
};

// 验证配置
const validateConfig = () => {
  const requiredFields = ['OWNER', 'REPO'];
  let configValid = true;

  for (const field of requiredFields) {
    if (!CONFIG[field]) {
      logger.error(`配置错误: ${field} 是必填项`);
      configValid = false;
    }
  }

  if (!configValid) {
    logger.error('配置验证失败，使用默认配置继续执行');
    // 使用默认配置
    CONFIG.OWNER = CONFIG.OWNER || 'CompanyBlacklist';
    CONFIG.REPO = CONFIG.REPO || 'CompanyBlacklist';
  }

  logger.info(`配置验证通过: OWNER=${CONFIG.OWNER}, REPO=${CONFIG.REPO}`);
};

// 验证配置
validateConfig();

// 工具函数

/**
 * 获取拼音首字母（使用简单的实现，避免依赖外部库）
 * @param {string} text - 文本
 * @returns {string} 拼音首字母，小写
 */
const getFirstLetter = (text) => {
  try {
    // 提取文本的第一个字符
    const firstChar = text.charAt(0).toLowerCase();

    // 如果是字母，直接返回
    if (/^[a-z]$/.test(firstChar)) {
      return firstChar;
    }

    // 对于中文，使用简单的拼音首字母映射
    // 这里只处理常用的汉字，其他情况返回'other'
    const pinyinMap = {
      'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
      'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
      'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
      'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z'
    };

    // 对于其他情况，返回'other'
    return 'other';
  } catch (error) {
    console.error('获取拼音首字母失败:', error);
    return 'other';
  }
};

/**
 * 提取图片链接
 * @param {string} html - HTML 内容
 * @returns {string[]} 图片链接数组
 */
const extractImages = (html) => {
  const images = [];
  let match;
  while ((match = CONFIG.IMAGE_REGEX.exec(html)) !== null) {
    images.push(match[1]);
  }
  return images;
};

/**
 * 隐私脱敏
 * @param {string} text - 文本
 * @returns {string} 脱敏后的文本
 */
const desensitize = (text) => {
  let result = text;
  for (const [key, regex] of Object.entries(CONFIG.PRIVACY_REGEX)) {
    result = result.replace(regex, '***');
  }
  return result;
};

/**
 * 检查 Issue 是否有指定标签
 * @param {Object} issue - GitHub Issue 对象
 * @param {string} tag - 标签名
 * @returns {boolean} 是否有指定标签
 */
const hasTag = (issue, tag) => {
  return issue.labels.some(label => label.name === tag);
};

/**
 * 检查 Issue 是否有效（同时拥有双重标签）
 * @param {Object} issue - GitHub Issue 对象
 * @returns {boolean} Issue 是否有效
 */
const isIssueValid = (issue) => {
  return hasTag(issue, 'audit:verified') && hasTag(issue, 'admin:approved');
};

/**
 * 检查 Issue 是否是申诉类型
 * @param {Object} issue - GitHub Issue 对象
 * @returns {boolean} 是否是申诉
 */
const isAppealIssue = (issue) => {
  return hasTag(issue, 'type:appeal');
};

/**
 * 检查申诉是否是恶意刷申
 * @param {Object[]} appealIssues - 申诉 Issue 列表
 * @param {Object} newAppeal - 新申诉 Issue
 * @returns {boolean} 是否是恶意刷申
 */
const isAppealSpam = (appealIssues, newAppeal) => {
  // 从标题中提取公司 ID 或名称
  const title = newAppeal.title.toLowerCase();

  // 查找相同公司的申诉数量
  const sameCompanyAppeals = appealIssues.filter(appeal => {
    const appealTitle = appeal.title.toLowerCase();
    return appealTitle === title && appeal.number !== newAppeal.number;
  });

  // 如果相同公司的申诉数量超过 2 个，则认为是恶意刷申
  return sameCompanyAppeals.length >= 2;
};

/**
 * 关闭恶意申诉 Issue
 * @param {Object} octokit - Octokit 实例
 * @param {Object} appeal - 申诉 Issue
 * @returns {Promise<void>}
 */
const closeSpamAppeal = async (octokit, appeal) => {
  try {
    await octokit.issues.update({
      owner: CONFIG.OWNER,
      repo: CONFIG.REPO,
      issue_number: appeal.number,
      state: 'closed',
      state_reason: 'spam',
    });

    await octokit.issues.createComment({
      owner: CONFIG.OWNER,
      repo: CONFIG.REPO,
      issue_number: appeal.number,
      body: '⚠️ 此申诉已被系统自动关闭，原因：恶意重复申诉。\n\n若您认为这是误判，请联系项目管理员。',
    });

    console.log(`Closed spam appeal: #${appeal.number}`);
  } catch (error) {
    console.error(`Failed to close spam appeal #${appeal.number}:`, error);
  }
};

/**
 * 清洗和处理 Issue 内容
 * @param {string} body - Issue 原始内容
 * @returns {Object} 处理后的内容
 */
const processIssueBody = (body) => {
  try {
    // 过滤掉模板中未选中的选项，只保留实际内容
    let filteredBody = body;

    // 移除模板中未选中的复选框选项（匹配 - [ ] 开头的行）
    filteredBody = filteredBody.replace(/^\s*-\s*\[\s\]\s*.+$/gm, '');

    // 移除多余的空行
    filteredBody = filteredBody.replace(/\n{3,}/g, '\n\n');

    // 转换 Markdown 为 HTML
    const html = marked.parse(filteredBody);

    // 清洗 HTML
    const sanitizedHtml = sanitizeHtml(html, CONFIG.SANITIZE_OPTIONS);

    // 隐私脱敏
    const desensitizedHtml = desensitize(sanitizedHtml);

    // 提取图片链接
    // 先从原始Markdown中提取图片
    const markdownImages = body.match(/!\[.*?\]\((.*?)\)/g) || [];
    const rawImageUrls = markdownImages.map(img => {
      const urlMatch = img.match(/!\[.*?\]\((.*?)\)/);
      return urlMatch ? urlMatch[1].trim() : '';
    }).filter(Boolean);

    // 再从HTML中提取图片，确保不会遗漏
    const htmlImages = extractImages(desensitizedHtml);

    // 合并去重
    const images = [...new Set([...rawImageUrls, ...htmlImages])];

    return {
      body_html: desensitizedHtml,
      raw_body: body, // 保留原始 Markdown 内容
      images: images,
    };
  } catch (error) {
    logger.error('Error processing issue body:', error);
    return {
      body_html: desensitize(body), // 降级处理，直接返回脱敏后的原始内容
      raw_body: body, // 保留原始 Markdown 内容
      images: [],
    };
  }
};

/**
 * 从 Issue 中提取审计信息
 * @param {Object[]} events - Issue 事件列表
 * @returns {Object} 审计信息
 */
const extractAuditInfo = (events) => {
  let firstReviewer = null;
  let finalReviewer = null;
  let approvedAt = null;

  // 按时间顺序遍历事件
  for (const event of events) {
    if (event.event === 'labeled') {
      // 找到第一个添加 audit:verified 标签的人
      if (event.label.name === 'audit:verified' && !firstReviewer) {
        firstReviewer = event.actor.login;
      }

      // 找到第一个添加 admin:approved 标签的人
      if (event.label.name === 'admin:approved' && !finalReviewer) {
        finalReviewer = event.actor.login;
        approvedAt = event.created_at;
      }
    }
  }

  return {
    first_reviewer: firstReviewer,
    final_reviewer: finalReviewer,
    approved_at: approvedAt,
  };
};

/**
 * 获取 Issue 事件
 * @param {Object} octokit - Octokit 实例
 * @param {number} issueNumber - Issue 编号
 * @returns {Promise<Object[]>} 事件列表
 */
const getIssueEvents = async (octokit, limiter, issueNumber) => {
  let allEvents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await limiter.schedule(async () => {
      return await octokit.issues.listEventsForTimeline({
        owner: CONFIG.OWNER,
        repo: CONFIG.REPO,
        issue_number: issueNumber,
        per_page: 100,
        page: page,
      });
    });

    allEvents = allEvents.concat(response.data);
    hasMore = response.data.length === 100;
    page++;
  }

  return allEvents;
};

/**
 * 从正文（HTML或Markdown）中提取指定部分的内容
 * @param {string} body - HTML正文或Markdown正文
 * @param {string} section - 要提取的部分标题
 * @returns {string} 提取的内容
 */
const extractSection = (body, section) => {
  // 支持HTML和Markdown格式
  const sectionLower = section.toLowerCase();

  // 检查body是否为HTML格式
  // 更可靠的判断方法：检查内容是否以完整的HTML标签开始
  const isHtml = body.trim().startsWith('<h3');

  if (isHtml) {
    // HTML格式
    const htmlTitleRegex = new RegExp('<h3[^>]*>\s*' + sectionLower + '\s*<\/h3>', 'i');
    const htmlTitleMatch = body.match(htmlTitleRegex);

    if (htmlTitleMatch) {
      // 查找h3标签结束位置
      const h3End = htmlTitleMatch.index + htmlTitleMatch[0].length;

      // 查找下一个h3标签或内容结束位置
      const nextH3 = body.indexOf('<h3', h3End);
      const contentEnd = nextH3 === -1 ? body.length : nextH3;

      // 提取h3标签后的内容，查找p标签
      const pStart = body.indexOf('<p', h3End);
      if (pStart !== -1 && pStart < contentEnd) {
        const pEnd = body.indexOf('</p>', pStart);
        if (pEnd !== -1 && pEnd < contentEnd) {
          // 提取p标签内的内容
          let content = body.substring(pStart + 3, pEnd).trim();
          content = content.replace(/<[^>]+>/g, ''); // 去除HTML标签
          return content;
        }
      }
    }
  } else {
    // Markdown格式
    // 针对公司全称和所在城市的特殊处理
    if (section === '公司全称' || section === '所在城市') {
      // 使用更简单的方式提取这些信息
      // 匹配### 公司全称，然后任意数量的空白行，然后一行或多行内容，直到下一个###或文件结束
      const sectionRegex = new RegExp('###\s*' + section + '\s*\n\s*([^#]+)(?:###|$)', 'is');
      const sectionMatch = body.match(sectionRegex);

      if (sectionMatch && sectionMatch[1]) {
        // 提取内容，去除前后空白和可能的空行
        let content = sectionMatch[1].trim();
        // 只返回第一行内容
        const firstLineEnd = content.indexOf('\n');
        if (firstLineEnd !== -1) {
          content = content.substring(0, firstLineEnd).trim();
        }
        return content;
      }
    }

    // 通用Markdown格式处理
    const mdTitleRegex = new RegExp('###\s*' + section + '[\s\S]*?(?=###|$)', 'i');
    const mdTitleMatch = body.match(mdTitleRegex);

    if (mdTitleMatch) {
      let content = mdTitleMatch[0];
      // 去除标题行
      content = content.replace(new RegExp('###\s*' + section + '\s*', 'i'), '').trim();
      // 去除前后空白和可能的空行
      content = content.replace(/^\s*$/gm, '').trim();

      // 只返回第一行内容
      const firstLineEnd = content.indexOf('\n');
      if (firstLineEnd !== -1) {
        content = content.substring(0, firstLineEnd).trim();
      }

      return content;
    }
  }

  return '';
};

/**
 * 从正文（HTML或Markdown）中提取公司信息
 * @param {string} body - HTML正文或Markdown正文
 * @returns {Object} 公司信息
 */
const extractCompanyInfoFromBody = (body) => {
  // 直接从body中提取公司全称
  const companyFullNameMatch = body.match(/###\s*公司全称\s*\n\s*([^#]+)(?:###|$)/is);
  const companyFullName = companyFullNameMatch && companyFullNameMatch[1] ? companyFullNameMatch[1].trim().split('\n')[0].trim() : '';

  // 直接从body中提取所在城市
  const cityMatch = body.match(/###\s*所在城市\s*\n\s*([^#]+)(?:###|$)/is);
  const city = cityMatch && cityMatch[1] ? cityMatch[1].trim().split('\n')[0].trim() : '';

  // 提取问题标签 - 支持HTML和Markdown格式
  const tags = [];

  // 检查body是否包含HTML标签
  const isHtml = body.includes('<h3') && body.includes('<ul') && body.includes('<li');

  if (isHtml) {
    // HTML格式：匹配问题标签部分
    const htmlTagsRegex = /<h3[^>]*>\s*问题标签\s*<\/h3>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i;
    const htmlTagsMatch = body.match(htmlTagsRegex);

    if (htmlTagsMatch && htmlTagsMatch[1]) {
      // HTML格式：匹配所有li标签内的内容
      // 此时HTML中已经只有选中的标签，因为processIssueBody函数已经过滤掉了未选中的标签
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
      let liMatch;
      while ((liMatch = liRegex.exec(htmlTagsMatch[1])) !== null) {
        const liContent = liMatch[1].trim();

        // 提取标签文本，去除HTML标签
        const tag = liContent
          .replace(/<[^>]+>/g, '') // 去除HTML标签
          .trim();

        if (tag) {
          tags.push(tag);
        }
      }
    }
  } else {
    // Markdown格式：直接从原始文本中提取
    const mdTagsRegex = /###\s*问题标签[\s\S]*?(?=###|$)/i;
    const mdTagsMatch = body.match(mdTagsRegex);

    if (mdTagsMatch && mdTagsMatch[0]) {
      // Markdown格式：匹配所有带有 [x] 标记的行
      const mdTagRegex = /-\s*\[x\]\s*([^\n]+)/g;
      let mdTagMatch;
      while ((mdTagMatch = mdTagRegex.exec(mdTagsMatch[0])) !== null) {
        const tag = mdTagMatch[1].trim();
        if (tag) {
          tags.push(tag);
        }
      }
    }
  }

  return {
    name: companyFullName,
    city: city,
    tags: tags,
  };
};

/**
 * 解析 Issue 内容，提取公司信息
 * @param {Object} issue - GitHub Issue 对象
 * @returns {Object} 公司信息
 */
const parseIssue = (issue) => {
  // 先从正文中提取信息，这是最可靠的来源
  const bodyInfo = extractCompanyInfoFromBody(issue.body);

  // 提取标题（去掉[爆料]前缀，移除末尾多余的-）
  const title = issue.title.replace(/^\[爆料\]\s*/, '').trim().replace(/\s*-\s*$/, '');

  // 直接使用从正文中提取的公司名称
  // 确保只返回第一行内容
  let companyName = bodyInfo.name;
  if (companyName) {
    // 只返回第一行
    const firstLineEnd = companyName.indexOf('\n');
    if (firstLineEnd !== -1) {
      companyName = companyName.substring(0, firstLineEnd).trim();
    }
  }

  // 如果正文中没有提取到公司名称，尝试从标题中提取
  if (!companyName) {
    // 从标题中提取公司名称和城市
    // 假设标题格式为：[爆料] 公司名称 - 城市
    const titleMatch = issue.title.match(/^\[爆料\]\s*(.+?)\s*-\s*(.+?)$/);

    if (titleMatch) {
      companyName = titleMatch[1].trim();
    } else {
      // 否则使用标题（去掉[爆料]前缀）作为公司名称
      companyName = title;
    }
  }

  // 直接使用从正文中提取的城市
  let city = bodyInfo.city;
  if (city) {
    // 只返回第一行
    const firstLineEnd = city.indexOf('\n');
    if (firstLineEnd !== -1) {
      city = city.substring(0, firstLineEnd).trim();
    }
  }

  // 如果正文中没有提取到城市，尝试从标题中提取
  if (!city) {
    const titleMatch = issue.title.match(/^\[爆料\]\s*(.+?)\s*-\s*(.+?)$/);
    if (titleMatch) {
      city = titleMatch[2].trim();
    }
  }

  // 直接使用从正文中提取的标签，不使用GitHub标签
  let tags = bodyInfo.tags;

  return {
    name: companyName,
    city: city,
    tags: tags,
    title: title,
  };
};

// 主函数
async function main() {
  logger.info('Starting CompanyBlacklist ETL process...');

  try {
    // 初始化 Octokit 和限速器
    logger.info('Initializing Octokit and rate limiter...');
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'CompanyBlacklist ETL Bot',
    });

    // 初始化限速器
    const limiter = new Bottleneck({
      maxConcurrent: CONFIG.RATE_LIMIT.MAX_CONCURRENT,
      minTime: CONFIG.RATE_LIMIT.MIN_TIME,
    });

    // 初始化 API 路径
    logger.info('Initializing API paths...');
    const apiPath = path.join(process.cwd(), CONFIG.API_BASE_PATH);
    await fs.ensureDir(apiPath);
    await fs.ensureDir(path.join(apiPath, 'search'));
    await fs.ensureDir(path.join(apiPath, 'items'));

    // 读取现有 meta.json
    let meta = {
      last_updated: new Date(0).toISOString(),
      total_count: 0,
      version: '1.0.0',
      build_id: process.env.GITHUB_RUN_ID || 'local',
    };

    const metaPath = path.join(apiPath, 'meta.json');
    if (await fs.pathExists(metaPath)) {
      try {
        meta = await fs.readJSON(metaPath);
        logger.info(`Loaded existing meta.json: ${meta.last_updated}`);
      } catch (error) {
        logger.error('Failed to read existing meta.json, using default:', error);
      }
    }

    // 增量获取 GitHub Issues
    const getIssues = async (since) => {
      let allIssues = [];
      let page = 1;
      let hasMore = true;

      logger.info(`Fetching issues since ${since}...`);

      while (hasMore) {
        try {
          const response = await limiter.schedule(async () => {
            return await octokit.issues.listForRepo({
              owner: CONFIG.OWNER,
              repo: CONFIG.REPO,
              since: since,
              state: 'all',
              per_page: 100,
              page: page,
            });
          });

          allIssues = allIssues.concat(response.data);
          hasMore = response.data.length === 100;
          page++;

          logger.debug(`Fetched ${allIssues.length} issues so far...`);
        } catch (error) {
          logger.error(`Failed to fetch issues on page ${page}:`, error);
          hasMore = false;
        }
      }

      return allIssues;
    };

    // 增量获取Issues
    const issues = await getIssues(meta.last_updated);
    logger.info(`Total issues fetched: ${issues.length}`);

    // 过滤有效 Issue
    const validIssues = issues.filter(isIssueValid);
    const appealIssues = issues.filter(isAppealIssue);

    logger.info(`Valid issues: ${validIssues.length}`);
    logger.info(`Appeal issues: ${appealIssues.length}`);

    // 处理申诉防刷
    for (const appeal of appealIssues) {
      if (appeal.state === 'open' && isAppealSpam(appealIssues, appeal)) {
        try {
          await closeSpamAppeal(octokit, appeal);
        } catch (error) {
          logger.error(`Failed to close spam appeal #${appeal.number}:`, error);
        }
      }
    }

    // 获取所有有效 Issue 的完整数据
    const processedIssues = [];

    logger.info('Processing valid issues...');
    for (const issue of validIssues) {
      try {
        // 获取 Issue 事件
        const events = await getIssueEvents(octokit, limiter, issue.number);

        // 解析 Issue 内容
        const companyInfo = parseIssue(issue);

        // 处理 Issue 正文
        const bodyData = processIssueBody(issue.body);

        // 提取审计信息
        const auditInfo = extractAuditInfo(events);
        // 添加发布者信息
        auditInfo.publisher = issue.user ? issue.user.login : 'Unknown';

        // 构建公司详情数据
        const companyData = {
          id: issue.number,
          name: companyInfo.name,
          city: companyInfo.city,
          tags: companyInfo.tags,
          title: companyInfo.title,
          body_html: bodyData.body_html,
          raw_body: issue.body, // 保存原始Markdown内容
          images: bodyData.images,
          audit_info: auditInfo,
          source_url: issue.html_url,
          report_url: `https://github.com/${CONFIG.OWNER}/${CONFIG.REPO}/issues/new?template=appeal.yml&title=[申诉] ${companyInfo.name} - ${companyInfo.city}&body=公司ID: ${issue.number}`,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        };

        processedIssues.push(companyData);

        logger.info(`Processed issue: #${issue.number} - ${companyInfo.name}`);
      } catch (error) {
        logger.error(`Failed to process issue #${issue.number}:`, error);
        continue;
      }
    }

    // 生成数据文件
    logger.info('Generating data files...');

    // 1. 读取现有数据
    const existingData = new Map();
    const itemsDir = path.join(apiPath, 'items');

    try {
      // 读取现有 items 目录下的所有文件
      const itemDirs = await fs.readdir(itemsDir, { withFileTypes: true });
      for (const dir of itemDirs) {
        if (dir.isDirectory()) {
          const prefixDir = path.join(itemsDir, dir.name);
          const files = await fs.readdir(prefixDir);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(prefixDir, file);
              const data = await fs.readJSON(filePath);
              existingData.set(data.id, data);
            }
          }
        }
      }
      logger.info(`Loaded ${existingData.size} existing companies`);
    } catch (error) {
      logger.error('Failed to read existing data:', error);
    }

    // 2. 更新现有数据或添加新数据
    for (const companyData of processedIssues) {
      existingData.set(companyData.id, companyData);
    }

    // 3. 处理现有数据，重新应用新的解析逻辑
    logger.info('Reprocessing existing data with new parsing logic...');
    const reprocessedData = new Map();

    // 遍历现有数据，重新应用新的解析逻辑
    for (const [id, data] of existingData.entries()) {
      // 查找对应的processedIssue
      let matchingIssue = processedIssues.find(issue => issue.id === id);

      if (matchingIssue) {
        // 如果找到了，直接使用
        reprocessedData.set(id, matchingIssue);
      } else {
        // 如果没有找到，重新应用新的解析逻辑
        // 从原始Markdown内容中重新提取信息
        // 使用现有的title作为issue标题，而不是构造新的
        const companyInfo = parseIssue({ title: data.title, body: data.raw_body });
        const bodyData = processIssueBody(data.raw_body);

        // 构建更新后的数据
        const updatedData = {
          ...data,
          name: companyInfo.name,
          city: companyInfo.city,
          tags: companyInfo.tags,
          title: companyInfo.title,
          body_html: bodyData.body_html,
          images: bodyData.images,
        };

        reprocessedData.set(id, updatedData);
      }
    }

    // 使用重新处理后的数据
    existingData.clear();
    for (const [id, data] of reprocessedData.entries()) {
      existingData.set(id, data);
    }

    // 4. 生成 items/{prefix}/{id}.json
    logger.info('Generating company detail files...');
    for (const [id, data] of existingData.entries()) {
      try {
        const prefix = Math.floor(id / 100).toString();
        const itemDir = path.join(itemsDir, prefix);
        const itemPath = path.join(itemDir, `${id}.json`);

        await fs.ensureDir(itemDir);
        await fs.writeJSON(itemPath, data, { spaces: 2 });
      } catch (error) {
        logger.error(`Failed to write company file for id ${id}:`, error);
      }
    }

    // 5. 生成 search/{letter}.json
    logger.info('Generating search index files...');
    const searchData = new Map();

    for (const [id, data] of existingData.entries()) {
      try {
        const firstLetter = getFirstLetter(data.name);

        if (!searchData.has(firstLetter)) {
          searchData.set(firstLetter, []);
        }

        searchData.get(firstLetter).push({
          id: data.id,
          n: data.name,
          c: data.city,
          t: data.tags,
          u: Math.floor(new Date(data.updated_at).getTime() / 1000),
          title: data.title || '',
        });
      } catch (error) {
        logger.error(`Failed to process search data for id ${id}:`, error);
      }
    }

    // 写入 search 目录
    for (const [letter, items] of searchData.entries()) {
      try {
        const searchPath = path.join(apiPath, 'search', `${letter}.json`);
        await fs.writeJSON(searchPath, items, { spaces: 2 });
      } catch (error) {
        logger.error(`Failed to write search file for letter ${letter}:`, error);
      }
    }

    // 6. 生成 _index.json
    logger.info('Generating index file...');
    try {
      const indexData = Array.from(existingData.values()).map(data => ({
        id: data.id,
        u: Math.floor(new Date(data.updated_at).getTime() / 1000),
      }));

      const indexPath = path.join(apiPath, '_index.json');
      await fs.writeJSON(indexPath, indexData, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to write index file:', error);
    }

    // 7. 生成 hot.json - 改进排序算法，考虑创建时间和更新时间
    logger.info('Generating hot companies file...');
    try {
      // 热榜排序算法：综合考虑更新时间和创建时间，越新的问题排名越高
      const hotData = Array.from(existingData.values())
        .sort((a, b) => {
          // 优先考虑更新时间，然后是创建时间
          const updateTimeDiff = new Date(b.updated_at) - new Date(a.updated_at);
          if (updateTimeDiff !== 0) {
            return updateTimeDiff;
          }
          return new Date(b.created_at) - new Date(a.created_at);
        })
        .slice(0, CONFIG.HOT_LIST_SIZE)
        .map(data => ({
          id: data.id,
          n: data.name,
          c: data.city,
          t: data.tags,
          u: Math.floor(new Date(data.updated_at).getTime() / 1000),
          title: data.title || '',
        }));

      const hotPath = path.join(apiPath, 'hot.json');
      await fs.writeJSON(hotPath, hotData, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to write hot file:', error);
    }

    // 8. 生成 audit_stats.json
    logger.info('Generating audit stats file...');
    try {
      const auditStats = {
        updated_at: new Date().toISOString(),
        total_reviews: 0,
        reviewers: {},
      };

      for (const data of existingData.values()) {
        // 更新初审员统计
        if (data.audit_info.first_reviewer) {
          auditStats.reviewers[data.audit_info.first_reviewer] =
            (auditStats.reviewers[data.audit_info.first_reviewer] || 0) + 1;
        }

        // 更新终审员统计
        if (data.audit_info.final_reviewer) {
          auditStats.reviewers[data.audit_info.final_reviewer] =
            (auditStats.reviewers[data.audit_info.final_reviewer] || 0) + 1;
        }
      }

      // 计算总审核数
      auditStats.total_reviews = Object.values(auditStats.reviewers).reduce((sum, count) => sum + count, 0);

      const auditStatsPath = path.join(apiPath, 'audit_stats.json');
      await fs.writeJSON(auditStatsPath, auditStats, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to write audit stats file:', error);
    }

    // 9. 更新 meta.json
    logger.info('Updating meta file...');
    try {
      const newMeta = {
        last_updated: new Date().toISOString(),
        total_count: existingData.size,
        version: '1.0.0',
        build_id: process.env.GITHUB_RUN_ID || 'local',
      };

      await fs.writeJSON(metaPath, newMeta, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to write meta file:', error);
    }

    logger.info('ETL process completed successfully!');
    logger.info(`Processed ${processedIssues.length} issues`);
    logger.info(`Total companies: ${existingData.size}`);

  } catch (error) {
    logger.error('ETL process failed:', error);
    process.exit(1);
  }
}

// 执行主函数
main();

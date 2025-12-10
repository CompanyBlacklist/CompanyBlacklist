# GitHub 标签使用指南

## 1. 标签定义

| 标签名 | 颜色 | 用途 |
|-------|------|------|
| `status:pending` | #f9d0c4 | 信息提交后，系统自动添加的初始状态 |
| `status:info-needed` | #ffb100 | 初审时，若证据不足，添加此标签要求补充信息 |
| `audit:verified` | #2ea043 | 初审志愿者确认信息属实，添加此蓝色标签 |
| `status:rejected` | #b60205 | 初审或终审时，若信息违规/恶意，添加此标签并关闭 Issue |
| `admin:approved` | #0e8a16 | 终审管理员确认无误，添加此绿色标签，触发 GitHub Actions 抓取数据 |
| `type:appeal` | #006b75 | 用户提交的申诉，自动添加此标签 |

## 2. 创建标签的方法

### 2.1 手动创建

1. 进入 GitHub 仓库页面
2. 点击 Issues 标签
3. 点击左侧 Labels 标签
4. 点击 New label 按钮
5. 填写标签名称、描述和颜色
6. 点击 Create label 按钮

### 2.2 使用 GitHub Actions 自动创建

可以使用第三方 Action 来自动创建标签，例如 `actions/labeler` 或 `andymckay/labeler`。

在 `.github/workflows/setup-labels.yml` 中添加以下内容：

```yaml
name: Setup Labels
on:
  push:
    branches:
      - main
    paths:
      - '.github/labels.yml'
  workflow_dispatch:

jobs:
  setup-labels:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Create/update labels
        uses: actions/github-script@v6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const labels = JSON.parse(fs.readFileSync('.github/labels.yml', 'utf8'));
            for (const label of labels) {
              try {
                await github.rest.issues.createLabel({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  name: label.name,
                  color: label.color,
                  description: label.description
                });
                console.log(`Created label: ${label.name}`);
              } catch (error) {
                // 如果标签已存在，尝试更新
                if (error.status === 422) {
                  await github.rest.issues.updateLabel({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    name: label.name,
                    color: label.color,
                    description: label.description
                  });
                  console.log(`Updated label: ${label.name}`);
                } else {
                  throw error;
                }
              }
            }
```

## 3. 标签使用流程

### 3.1 完整流程

```
用户提交 → 系统添加 status:pending → 初审志愿者审核
├── 证据不足 → 添加 status:info-needed → 用户补充信息 → 重新审核
├── 违规/恶意 → 添加 status:rejected → 关闭 Issue
└── 属实 → 添加 audit:verified → 终审管理员审核
    └── 确认无误 → 添加 admin:approved → GitHub Actions 抓取数据
```

### 3.2 简化流程（只有管理员审核）

如果只有管理员审核，可以简化流程：

```
用户提交 → 系统添加 status:pending → 管理员审核
├── 证据不足 → 添加 status:info-needed → 用户补充信息 → 重新审核
├── 违规/恶意 → 添加 status:rejected → 关闭 Issue
└── 属实 → 直接添加 admin:approved → GitHub Actions 抓取数据
```

**简化说明**：
- 跳过初审志愿者步骤
- 管理员直接审核所有提交
- 审核通过后直接添加 `admin:approved` 标签
- 无需使用 `audit:verified` 标签

## 4. 标签使用注意事项

1. **使用规范**：严格按照业务流程使用标签，确保信息流转清晰
2. **颜色一致性**：使用统一的颜色方案，便于视觉识别
3. **描述完整性**：每个标签都要有清晰的描述，便于团队成员理解
4. **自动化触发**：`admin:approved` 标签会触发 GitHub Actions，请勿随意添加
5. **申诉处理**：申诉 Issue 自动添加 `type:appeal` 标签，管理员需及时处理

## 5. 标签管理

- 定期清理不再使用的标签
- 保持标签数量精简，避免过多无用标签
- 标签名称使用 `type:name` 或 `status:name` 的格式，便于分类管理

## 6. 常见问题

### Q: 要是只有管理员审核呢？

A: 可以使用简化流程，跳过初审志愿者步骤，管理员直接审核所有提交，审核通过后直接添加 `admin:approved` 标签。

### Q: 如何批量添加标签？

A: 可以使用 GitHub CLI 或第三方工具批量添加标签，例如：

```bash
# 使用 GitHub CLI 批量添加标签
gh label create status:pending --color f9d0c4 --description "信息提交后，系统自动添加的初始状态"
gh label create status:info-needed --color ffb100 --description "初审时，若证据不足，添加此标签要求补充信息"
gh label create audit:verified --color 2ea043 --description "初审志愿者确认信息属实，添加此蓝色标签"
gh label create status:rejected --color b60205 --description "初审或终审时，若信息违规/恶意，添加此标签并关闭 Issue"
gh label create admin:approved --color 0e8a16 --description "终审管理员确认无误，添加此绿色标签，触发 GitHub Actions 抓取数据"
gh label create type:appeal --color 006b75 --description "用户提交的申诉，自动添加此标签"
```

### Q: 如何修改已存在的标签？

A: 可以在 GitHub 仓库的 Labels 页面点击标签名称进行修改，或使用 GitHub CLI 命令：

```bash
# 使用 GitHub CLI 修改标签
gh label edit status:pending --color f9d0c4 --description "新的描述"
```

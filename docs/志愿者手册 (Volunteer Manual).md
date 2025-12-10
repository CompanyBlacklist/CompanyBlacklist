# 志愿者手册 (Volunteer Manual)

## 1. GitHub 团队与权限管理

### 1.1 团队结构

| 团队名称 | 权限级别 | 成员类型 | 可使用标签 |
|---------|---------|---------|-----------|
| `@OpenBlacklist/Volunteers` | 志愿者权限 | 普通志愿者 | `status:info-needed`, `audit:verified`, `status:rejected` |
| `@OpenBlacklist/Admins` | 管理员权限 | 管理员 | 所有标签，包括 `admin:approved` |

### 1.2 权限划分

#### 普通志愿者权限
- 可以查看和评论所有 Issues
- 可以添加/删除 `status:info-needed`, `audit:verified`, `status:rejected` 标签
- 可以关闭违规/恶意的 Issues
- 不能添加/删除 `admin:approved` 标签

#### 管理员权限
- 拥有普通志愿者的所有权限
- 可以添加/删除所有标签，包括 `admin:approved`
- 可以触发 GitHub Actions 工作流
- 可以管理团队成员和权限

### 1.3 敏感标签限制

| 标签名 | 敏感级别 | 允许使用的团队 | 说明 |
|-------|---------|---------------|------|
| `status:pending` | 低 | 系统自动添加 | 无需手动添加 |
| `status:info-needed` | 低 | `@OpenBlacklist/Volunteers`, `@OpenBlacklist/Admins` | 普通志愿者和管理员均可使用 |
| `audit:verified` | 中 | `@OpenBlacklist/Volunteers`, `@OpenBlacklist/Admins` | 普通志愿者和管理员均可使用 |
| `status:rejected` | 中 | `@OpenBlacklist/Volunteers`, `@OpenBlacklist/Admins` | 普通志愿者和管理员均可使用 |
| `admin:approved` | 高 | `@OpenBlacklist/Admins` | 仅管理员可使用，触发数据抓取 |
| `type:appeal` | 低 | 系统自动添加 | 无需手动添加 |

## 2. 标签使用指南

### 2.1 普通志愿者操作流程

1. **接收待审核 Issue**：系统自动添加 `status:pending` 标签
2. **检查内容完整性**：
   - 若证据不足：添加评论要求补充 → 打标签 `status:info-needed`
   - 若属实：打标签 `audit:verified`
   - 若违规/恶意：打标签 `status:rejected` → 关闭 Issue
3. **等待管理员终审**：管理员会定期筛选带有 `audit:verified` 的 Issue 进行终审

### 2.2 管理员操作流程

1. **接收待终审 Issue**：筛选带有 `audit:verified` 标签的 Issue
2. **复核内容合规性**：
   - 若确认无误：打标签 `admin:approved`，触发 GitHub Actions 抓取数据
   - 若需要补充信息：打标签 `status:info-needed` → 添加评论要求补充
   - 若违规/恶意：打标签 `status:rejected` → 关闭 Issue

### 2.3 敏感标签使用注意事项

1. **`admin:approved` 标签**：
   - 仅管理员可使用
   - 一旦添加，GitHub Actions 会在下一次调度时抓取数据
   - 请确保信息真实可靠，避免误操作
   - 如需撤销，直接删除该标签即可

2. **`status:rejected` 标签**：
   - 请在关闭 Issue 前添加此标签
   - 请在评论中说明拒绝原因
   - 避免滥用此标签，确保有充分证据

3. **`audit:verified` 标签**：
   - 请确保证据充分且有效
   - 请在评论中说明审核结果
   - 避免误判，如有疑问可与其他志愿者或管理员讨论

## 3. 如何请求管理员权限

1. 联系现有管理员，说明请求理由
2. 提供相关经验和资质证明
3. 经过管理员团队审核后，可添加到 `@OpenBlacklist/Admins` 团队
4. 获得管理员权限后，需遵守管理员职责和行为规范

## 4. 最佳实践

### 4.1 标签使用最佳实践

1. **使用正确的标签**：根据 Issue 状态和类型选择合适的标签
2. **及时更新标签**：当 Issue 状态变化时，及时更新标签
3. **避免滥用标签**：每个 Issue 最多使用 3-5 个标签，避免过多无用标签
4. **添加评论说明**：在添加/删除标签时，添加评论说明原因
5. **定期清理标签**：定期清理不再使用的标签，保持标签体系精简

### 4.2 权限管理最佳实践

1. **最小权限原则**：只授予完成工作所需的最小权限
2. **定期审查权限**：定期审查团队成员权限，及时调整
3. **使用团队而非个人权限**：通过团队管理权限，便于统一管理
4. **启用双因素认证**：所有团队成员应启用双因素认证，提高安全性
5. **遵守安全规范**：保护好 GitHub 账号和权限，避免泄露

### 4.3 协作最佳实践

1. **保持沟通**：遇到问题及时与其他志愿者或管理员沟通
2. **记录工作**：在评论中记录审核过程和结果，便于追溯
3. **尊重他人**：尊重其他志愿者和管理员的工作，避免冲突
4. **持续学习**：学习相关知识和技能，提高审核质量
5. **遵守规则**：遵守志愿者行为规范和业务流程

## 5. 常见问题

### Q: 我是普通志愿者，可以使用 `admin:approved` 标签吗？

A: 不可以。`admin:approved` 是敏感标签，仅管理员可使用，用于触发 GitHub Actions 抓取数据。普通志愿者应使用 `audit:verified` 标签标记审核通过的 Issue，等待管理员终审。

### Q: 我发现一个 Issue 需要管理员处理，怎么办？

A: 可以在评论中 @ 管理员，或添加 `status:needs-admin-review` 标签（如已创建），通知管理员处理。

### Q: 我误添加了敏感标签，怎么办？

A: 立即删除该标签，并在评论中说明误操作，同时通知管理员。

### Q: 如何申请成为管理员？

A: 联系现有管理员，说明请求理由，提供相关经验和资质证明，经过管理员团队审核后，可添加到 `Admins` 团队。

## 6. 志愿者行为规范

1. **客观公正**：审核过程中保持客观公正，避免个人偏见
2. **保密原则**：保护用户隐私，不泄露敏感信息
3. **尊重他人**：尊重其他志愿者、管理员和用户
4. **遵守法律**：遵守相关法律法规，不参与违法活动
5. **持续改进**：不断提高审核质量和效率
6. **团队合作**：与其他志愿者和管理员保持良好合作

## 7. 联系方式

- issues: [CompanyBlacklist/CompanyBlacklist](https://github.com/CompanyBlacklist/CompanyBlacklist/issues)
- **文档更新**：如发现文档或者代码有误或需要更新，请提交 Issue 或 Pull Request

---

**版本**: 1.0.0  
**更新日期**: 2025-12-08  
**最后更新者**: CompanyBlacklist Team

<div align="center">

<img src="assets/velclaw-logo.svg" alt="Velclaw Workspace" width="120" />

# Velclaw Workspace

**Standalone mobile-first IDE/codebase workspace cho hệ sinh thái Velclaw — code editor, agent, source control, dashboard và ecosystem navigation.**

</div>

---

## Kiến trúc

`zskbot/eve-pages` là **companion/child project độc lập** của Velclaw. Nó deploy riêng được nhưng được thiết kế để kết nối với Velclaw Agent Core.

```text
VELCLAW ECOSYSTEM
├── Velclaw/Velclaw        # CORE / MAIN
├── zskbot/eve-pages       # STANDALONE WORKSPACE / EVE UI
├── Velclaw Deploy         # BUILD / DEPLOY / RUNTIME
├── VelclawHub             # PROJECT / ECOSYSTEM HUB
└── Velclaw Dashboard      # OPERATIONS

      eve-pages
          │
          ├── Codebase editor
          ├── Agent bridge ─────> Velclaw Agent Core
          ├── GitHub adapter ───> repository contents API
          └── Source Control ───> commits / branch / PR layer
```

## UI mới

- Menu 3 gạch là navigation chính; không còn bottom navigation chiếm chiều cao màn hình.
- Toàn bộ trang ngoài được gom vào **Velclaw ecosystem menu**.
- Codebase có file drawer, filter, breadcrumb, editor tabs, line numbers, word-wrap, cursor position và language detection.
- Command palette `Ctrl/Cmd + K` để chuyển nhanh giữa Codebase, Agent, Source Control và Dashboard.
- Giao diện responsive: mobile-first nhưng mở rộng được trên desktop.

## Chạy độc lập

Yêu cầu Node.js 20+.

```bash
npm start
```

Mở `http://localhost:8080/`.

Agent bridge:

```bash
VELCLAW_AGENT_URL=https://your-agent-endpoint.example/api/agent/chat npm start
```

## Deployment API

Repo có các Vercel Functions để tránh lỗi `405 Method Not Allowed` khi frontend chạy trên static hosting:

| Endpoint | Method | Chức năng |
|---|---:|---|
| `/api/agent/chat` | POST | Proxy server-side tới Velclaw Agent |
| `/api/workspace/status` | GET | Runtime + Agent + GitHub status |
| `/api/workspace/tree` | GET | Đọc codebase từ GitHub |
| `/api/workspace/file?path=...` | GET | Đọc file từ GitHub |
| `/api/workspace/file?path=...` | POST/PUT | Commit nội dung file về GitHub |
| `/api/git/status` | GET | Lịch sử commit gần đây |

### Environment variables cho deployment

```text
VELCLAW_AGENT_URL=https://<agent-backend>/api/agent/chat
VELCLAW_AGENT_TOKEN=<optional-server-side-token>
GITHUB_TOKEN=<fine-grained-token-with-repository-content-access>
GITHUB_REPO=zskbot/eve-pages
GITHUB_BRANCH=main
```

`GITHUB_TOKEN` chỉ nằm ở server environment. Browser không nhận token.

**Lưu ý:** GitHub adapter là persistence layer cho bản deploy. Nếu chưa cấu hình `GITHUB_TOKEN`, editor vẫn có thể hiển thị code nhưng thao tác Save trên deployment sẽ báo cần cấu hình token.

## Source Control roadmap

Đã có nền tảng cho GitHub-backed editing và commit history. Các lớp tiếp theo được thiết kế theo pipeline:

```text
Agent request
   ↓
Plan
   ↓
Edit codebase
   ↓
Diff
   ↓
Build
   ↓
Test
   ↓
Review
   ↓
Fix
   ↓
Rerun
   ↓
PASS
   ↓
Commit / Pull Request
```

Các module tiếp theo: branch switching, unified diff, staged changes, commit composer, PR creation, CI status, build/test executor và automatic review/fix loop.

## Bảo mật

Server local chặn path traversal, giới hạn request body và không expose agent token cho frontend. Deployment sử dụng GitHub token server-side. **Không cấp token quyền ghi rộng hơn cần thiết và không expose public write API mà không có authentication/authorization.**

## License

Xem `LICENSE`.

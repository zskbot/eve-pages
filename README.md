<div align="center">

<img src="assets/velclaw-logo.svg" alt="Velclaw Workspace" width="120" />

# Velclaw Workspace

**Standalone mobile-first IDE workspace cho hệ sinh thái Velclaw — files, chat, dashboard và bridge tới agent thật.**

</div>

---

## Kiến trúc

`zskbot/eve-pages` là **companion/child project độc lập** của Velclaw. Nó có thể chạy và deploy riêng, nhưng mặc định kết nối tới agent API của `Velclaw/Velclaw`.

```text
VELCLAW ECOSYSTEM
├── Velclaw/Velclaw        # CORE / MAIN
└── zskbot/eve-pages       # STANDALONE WORKSPACE / EVE UI
                              │
                              └── /api/agent/chat ──> Velclaw Agent
```

Repo này không cần clone hay cài đặt repo chính để khởi động giao diện. Khi muốn đổi runtime, đặt `VELCLAW_AGENT_URL`.

## Chạy độc lập

Yêu cầu Node.js 20+.

```bash
npm start
```

Mở `http://localhost:8080/`.

Hoặc:

```bash
PORT=8080 VELCLAW_AGENT_URL=https://velclaw.cfd/api/agent/chat npm start
```

## API runtime

| Endpoint | Method | Chức năng |
|---|---:|---|
| `/api/health` | GET | Health check |
| `/api/workspace/status` | GET | Workspace + agent connection status |
| `/api/workspace/tree` | GET | Đọc cây file thật |
| `/api/workspace/file?path=...` | GET | Đọc file trong workspace |
| `/api/workspace/file` | POST | Ghi file trong workspace |
| `/api/agent/chat` | POST | Proxy tới Velclaw Agent |

### Agent request

```json
{
  "message": "Review file này",
  "path": "app.js",
  "model": "optional-model"
}
```

Bridge giữ token ở server-side qua `VELCLAW_AGENT_TOKEN`, không đưa token vào browser.

## Tính năng hiện tại

- **Files:** đọc/ghi filesystem thật, dirty state, path traversal protection.
- **Chat:** gọi agent Velclaw thật qua server bridge, không còn demo delay.
- **Dashboard:** hiển thị trạng thái backend/agent và tự refresh.
- **Workspace tree:** endpoint filesystem thật cho các bước nâng cấp tiếp theo.
- **Deployment:** có Dockerfile và cấu hình môi trường mẫu.
- **Zero frontend build:** vanilla HTML/CSS/JS.

## Hướng nâng cấp tiếp theo

1. Streaming agent response (SSE/WebSocket).
2. Git diff / branch / commit / PR từ workspace.
3. Build → test → review → fix → rerun loop.
4. Terminal/runtime controls.
5. Agent tool approvals và audit log.
6. Multi-project workspace.
7. Authentication/session thay vì public workspace write.
8. File search, command palette và editor nâng cao.

## Bảo mật

Server giới hạn body request, chặn path traversal, bỏ qua `.git` và `node_modules` khi tạo tree, và chỉ giữ agent token ở backend. **Không nên expose server này ra Internet với quyền ghi file mà không thêm authentication/authorization.**

## License

Xem `LICENSE`.

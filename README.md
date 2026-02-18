# MT Monitoring

셀프 호스팅 통합 모니터링 플랫폼 — 서비스 헬스체크, 인프라 리소스, 알림을 하나의 대시보드에서 관리합니다.

## 구조

```
mt-app/
├── mt-app/              # Frontend — React + Vite + TypeScript + Tailwind
└── mt-monitoring-api/   # Backend  — Go (Fiber) + SQLite + WebSocket
```

## 빠른 시작

### 백엔드
```bash
cd mt-monitoring-api
go run ./cmd/server
# → http://localhost:3001
```

### 프론트엔드
```bash
cd mt-app
pnpm install
pnpm dev
# → http://localhost:5173
```

## 주요 기능

- **서비스 모니터링** — HTTP/TCP 헬스체크, 업타임, 레이턴시 추적
- **인프라 모니터링** — CPU/메모리/디스크/네트워크 실시간 수집 (로컬 + SSH 원격)
- **알림** — Telegram / Discord 채널 연동, 임계값 기반 규칙
- **로그 관리** — 통합 로그 뷰어 및 검색
- **실시간 WebSocket** — 메트릭 스트리밍

## 라이선스

MIT

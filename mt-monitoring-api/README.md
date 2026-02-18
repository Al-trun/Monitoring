# MT Monitoring API

경량 모니터링 시스템 백엔드 API 서버

## 특징

- **경량화**: Docker 이미지 ~20MB, 메모리 ~50MB
- **제로 설정**: `docker run` 한 번으로 즉시 실행
- **설정 기반**: `config.json`으로 모니터링 대상 정의
- **올인원**: API + Frontend + DB 단일 컨테이너

## 빠른 시작

### Docker 사용

```bash
# 이미지 실행
docker run -d -p 3001:3001 \
  -v ./config.json:/app/config.json:ro \
  -v mt-data:/app/data \
  username/mt-monitoring

# 브라우저에서 확인
open http://localhost:3001
```

### Docker Compose 사용

```bash
# config.json 생성
cp config.example.json config.json
# 설정 편집...

# 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 설정

`config.json` 파일로 모니터링 대상을 정의합니다:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3001,
    "mode": "production"
  },
  "database": {
    "type": "sqlite",
    "path": "./data/monitoring.db"
  },
  "services": [
    {
      "id": "my-api",
      "name": "My API Server",
      "type": "http",
      "url": "https://api.example.com/health",
      "interval": 30,
      "timeout": 5000,
      "expectedStatus": 200
    },
    {
      "id": "my-db",
      "name": "PostgreSQL",
      "type": "tcp",
      "host": "db.example.com",
      "port": 5432,
      "interval": 60,
      "timeout": 3000
    }
  ],
  "retention": {
    "metrics": "7d",
    "logs": "3d"
  }
}
```

### 환경 변수

설정은 환경 변수로도 오버라이드 가능합니다:

```bash
MT_SERVER_PORT=8080
MT_DATABASE_PATH=/custom/path/data.db
```

## API 엔드포인트

### 서비스

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/services` | 전체 서비스 목록 |
| GET | `/api/v1/services/:id` | 서비스 상세 |
| POST | `/api/v1/services` | 서비스 추가 |
| PUT | `/api/v1/services/:id` | 서비스 수정 |
| DELETE | `/api/v1/services/:id` | 서비스 삭제 |

### 메트릭

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/services/:id/metrics` | 서비스 메트릭 |
| GET | `/api/v1/services/:id/uptime` | 업타임 데이터 |

### 대시보드

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/dashboard/summary` | KPI 요약 |
| GET | `/api/v1/dashboard/timeline` | 이벤트 타임라인 |

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/metrics');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

## 개발

### 요구 사항

- Go 1.22+
- Node.js 22+ (프론트엔드 빌드용)

### 로컬 실행

```bash
# 의존성 설치
go mod download

# 설정 파일 생성
cp config.example.json config.json

# 실행
go run ./cmd/server

# 또는 Air로 핫 리로드
air
```

### 빌드

```bash
# 바이너리 빌드
CGO_ENABLED=1 go build -o server ./cmd/server

# Docker 이미지 빌드
docker build -t mt-monitoring .
```

## 라이선스

MIT

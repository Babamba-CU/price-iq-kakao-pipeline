# 🚀 카카오톡 도매단가 파이프라인 - GitHub 배포 가이드

## 📋 배포 단계별 가이드

### **STEP 1: GitHub에 로그인** (1분)

```bash
gh auth login
# → 프롬프트 따라 진행 (브라우저 자동 열림)
# → https://github.com/login/device 코드 입력
```

---

### **STEP 2: GitHub 리포지토리 생성 및 푸시** (2분)

```bash
cd /Users/taeholee/Documents/PNF\ 앱

# 리포지토리 생성 (자동)
gh repo create price-iq-kakao-pipeline \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "카카오톡 도매단가 파이프라인 (PRICE-IQ)" \
  --add-readme

# 또는 수동으로 생성 후 푸시
git remote add origin https://github.com/YOUR_USERNAME/price-iq-kakao-pipeline.git
git push -u origin main
```

**결과:**
```
✅ https://github.com/YOUR_USERNAME/price-iq-kakao-pipeline
```

---

## 🏗️ 배포 옵션 (2가지)

### **옵션 1: Railway (권장 - 1시간)**

**가장 간단하고 빠른 배포**

#### 1️⃣ Railway 계정 생성
```
https://railway.app
GitHub 로그인 → 연결
```

#### 2️⃣ Railway에서 배포
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd /Users/taeholee/Documents/PNF\ 앱/backend
railway init

# 환경변수 설정
railway variables set ANTHROPIC_API_KEY=sk-...
railway variables set DATABASE_URL=postgresql://...

# 배포
railway up
```

**배포 결과:**
```
✅ API 엔드포인트: https://price-iq.up.railway.app
✅ FastAPI Docs: https://price-iq.up.railway.app/docs
```

---

### **옵션 2: GitHub Actions + Render (1시간)**

**자동 배포 + 무료 호스팅**

#### 1️⃣ Render 계정 생성
```
https://render.com
GitHub 로그인 → 연결
```

#### 2️⃣ GitHub Actions 워크플로우 생성

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
        run: |
          curl -X POST https://api.render.com/deploy/$RENDER_SERVICE_ID \
            -H "Authorization: Bearer $RENDER_API_KEY"
```

#### 3️⃣ Render에서 배포 설정

```
1. New → Web Service
2. Repository 선택: price-iq-kakao-pipeline
3. Settings:
   - Build Command: pip install -r backend/requirements.txt
   - Start Command: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000
   - Environment: Add ANTHROPIC_API_KEY, DATABASE_URL
4. Deploy
```

**배포 결과:**
```
✅ API 엔드포인트: https://price-iq.onrender.com
✅ 자동 배포: main 브랜치에 push될 때마다 자동 배포
```

---

### **옵션 3: Docker + 자체 서버 (2시간)**

**완전 제어 가능**

#### 1️⃣ Docker 이미지 빌드

```bash
cd /Users/taeholee/Documents/PNF\ 앱
docker build -f backend/Dockerfile -t price-iq:latest .
```

#### 2️⃣ Docker Compose로 실행

```bash
docker-compose up -d
```

#### 3️⃣ 서버에 배포

```bash
# SSH로 서버 접속 후
docker pull username/price-iq:latest
docker run -d \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=sk-... \
  -e DATABASE_URL=postgresql://... \
  username/price-iq:latest
```

---

## 🔧 GitHub Secrets 설정

배포 전에 **GitHub Secrets**에 환경변수 추가:

1. GitHub 리포지토리 → Settings → Secrets and variables → Actions
2. **New repository secret** 추가:
   - `ANTHROPIC_API_KEY`: `sk-...`
   - `DATABASE_URL`: `postgresql://...`
   - `JWT_SECRET_KEY`: `(임의의 256비트 문자열)`

```bash
# Secret 생성 예시
gh secret set ANTHROPIC_API_KEY -b "sk-..." -R username/price-iq-kakao-pipeline
gh secret set DATABASE_URL -b "postgresql://..." -R username/price-iq-kakao-pipeline
```

---

## 📊 배포 옵션 비교

| 옵션 | 난이도 | 시간 | 비용 | 추천 |
|------|--------|------|------|------|
| **Railway** | ⭐ (매우 쉬움) | 30분 | 무료~$7/월 | ✅ 개발 단계 |
| **Render** | ⭐⭐ (쉬움) | 1시간 | 무료~$7/월 | ✅ 소규모 프로덕션 |
| **Docker** | ⭐⭐⭐ (중간) | 2시간 | 서버 비용 | ✅ 완전 제어 필요 시 |

---

## 🚀 빠른 시작 (Railway 선택 시)

### 1️⃣ GitHub에 푸시
```bash
cd /Users/taeholee/Documents/PNF\ 앱
gh repo create price-iq-kakao-pipeline --public --source=. --remote=origin --push
```

### 2️⃣ Railway 로그인 및 배포
```bash
npm install -g @railway/cli
railway login
cd backend && railway init
railway variables set ANTHROPIC_API_KEY=sk-...
railway variables set DATABASE_URL=postgresql://...
railway up
```

### 3️⃣ 완료!
```
✅ API 주소: https://price-iq.up.railway.app
✅ API Docs: https://price-iq.up.railway.app/docs
```

---

## 🔗 배포 후 테스트

### REST API 테스트

```bash
# 로그인
curl -X POST https://price-iq.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "changeme123!"
  }'

# 파이프라인 호출
TOKEN=... # 위에서 받은 토큰
curl -X POST https://price-iq.up.railway.app/api/v1/kakao/parse-message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_text": "SKT 아이폰15프로 30만원",
    "message_date": "2024-07-31",
    "sender_name": "홍길동"
  }'
```

### Swagger UI 확인

```
https://price-iq.up.railway.app/docs
```

---

## 📚 관련 문서

| 문서 | 용도 |
|------|------|
| `README.md` | 프로젝트 개요 |
| `CLAUDE.md` | 프로젝트 아키텍처 |
| `KAKAO_PIPELINE_README.md` | 파이프라인 상세 가이드 |
| `FULL_VERSION_SETUP.md` | 풀 버전 설정 |
| `READY_TO_RUN.md` | 빠른 시작 |

---

## 🆘 문제 해결

### "API 크레딧 부족"
→ Anthropic 콘솔에서 크레딧 추가
→ https://console.anthropic.com/account/billing/overview

### "데이터베이스 연결 실패"
→ DATABASE_URL이 올바른지 확인
→ 서버에서 PostgreSQL 포트(5432) 접근 가능한지 확인

### "Railway 배포 실패"
→ `railway logs` 명령으로 로그 확인
→ 환경변수가 모두 설정되었는지 확인

---

## 🎓 배포 아키텍처

```
┌─────────────────────────┐
│  GitHub Repository      │
│  - 모든 소스 코드        │
│  - CI/CD 설정            │
└────────────┬────────────┘
             │
             ▼
    ┌────────────────┐
    │ GitHub Actions │ (선택적)
    │ (자동 테스트)   │
    └────────┬───────┘
             │
             ▼
┌─────────────────────────────────────┐
│  배포 플랫폼 (선택)                  │
│  ┌─────────────┐ ┌────────────────┐│
│  │  Railway    │ │    Render      ││
│  │  (추천)      │ │                ││
│  └─────┬───────┘ └────────┬───────┘│
│        │                  │        │
└────────┼──────────────────┼────────┘
         │                  │
         ▼                  ▼
    FastAPI Server    (선택 옵션)
    - 파이프라인 API
    - REST 엔드포인트
    - Claude API 통합
```

---

## ✅ 최종 체크리스트

```
☑️  Git 리포지토리 초기화
☑️  .gitignore 설정
☑️  모든 파일 커밋
☑️  GitHub 로그인 (gh auth login)
☑️  GitHub 리포지토리 생성 및 푸시
☑️  배포 플랫폼 선택 (Railway 권장)
☑️  GitHub Secrets 설정
☑️  배포 실행
☑️  API 엔드포인트 테스트
☑️  문서 업데이트
```

---

## 🎯 다음 단계

1. **GitHub 로그인**: `gh auth login`
2. **리포지토리 생성**: `gh repo create price-iq-kakao-pipeline --public --source=. --remote=origin --push`
3. **배포 선택**: Railway 또는 Render
4. **환경변수 설정**: GitHub Secrets 또는 배포 플랫폼
5. **배포 실행**: `railway up` 또는 Render UI
6. **테스트**: API 엔드포인트 확인

---

*작성일: 2026-04-22*
*최종 수정: 배포 가이드 완성*

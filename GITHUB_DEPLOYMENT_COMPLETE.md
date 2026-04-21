# ✨ GitHub 배포 완료!

## 🎉 완성 현황

```
✅ GitHub 리포지토리 생성 완료
✅ 모든 코드 푸시 완료
✅ GitHub Actions 워크플로우 설정 완료
⏳ 배포 플랫폼 선택 (Render 또는 Railway)
```

---

## 📊 GitHub 리포지토리 정보

| 항목 | 값 |
|------|-----|
| **URL** | https://github.com/Babamba-CU/price-iq-kakao-pipeline |
| **계정** | Babamba-CU |
| **설명** | 카카오톡 도매단가 파이프라인 (PRICE-IQ) |
| **상태** | Public (공개) |
| **브랜치** | main |

---

## 🚀 배포 방법 (2가지 선택)

### **옵션 1: Render (권장 - 무료)**

#### 1️⃣ Render 계정 생성
```
https://render.com
GitHub 로그인 → 승인
```

#### 2️⃣ 새로운 Web Service 생성

```
1. Render 대시보드 → New
2. Web Service 선택
3. Repository 연결: price-iq-kakao-pipeline
4. 다음 설정 입력:
   
   Name: price-iq-api
   Region: Singapore (또는 가까운 지역)
   Branch: main
   Runtime: Python 3.11
   
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

#### 3️⃣ 환경변수 설정

Render → Environment 탭:

```
ANTHROPIC_API_KEY=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
DATABASE_URL=postgresql://priceiq:priceiq@localhost:5432/priceiq
JWT_SECRET_KEY=5cfb96863ae75ebf5e216356c724a830712443d48e57028cf81174f857d830c0
CORS_ORIGINS=http://localhost:5173,https://price-iq.onrender.com
```

#### 4️⃣ Deploy!

```
Create Web Service → 배포 시작
```

**배포 완료 후:**
```
✅ API 주소: https://price-iq-api.onrender.com
✅ API Docs: https://price-iq-api.onrender.com/docs
✅ Health Check: https://price-iq-api.onrender.com/health
```

---

### **옵션 2: Railway**

#### 1️⃣ Railway 계정 생성
```
https://railway.app
GitHub 로그인 → 승인
```

#### 2️⃣ New Project 생성

```
1. Railway 대시보드 → New
2. Deploy from GitHub repo
3. 리포지토리 선택: price-iq-kakao-pipeline
4. 자동 배포 시작
```

#### 3️⃣ 환경변수 설정

Railway → Variables:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
```

#### 4️⃣ Deployment 확인

```
Railway → Deployments → ✅ Success
```

**배포 완료 후:**
```
✅ API 주소: https://price-iq-production.up.railway.app
✅ API Docs: https://price-iq-production.up.railway.app/docs
```

---

## 🧪 배포 후 테스트

### API 엔드포인트 확인

```bash
# 헬스 체크
curl https://price-iq-api.onrender.com/health
# → {"status": "ok"}

# 로그인
curl -X POST https://price-iq-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "changeme123!"
  }'

# 파이프라인 테스트
TOKEN=... # 위에서 받은 토큰
curl -X POST https://price-iq-api.onrender.com/api/v1/kakao/parse-message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_text": "SKT 아이폰15프로 30만원",
    "message_date": "2024-07-31",
    "sender_name": "홍길동"
  }'
```

### Swagger UI 접근

```
https://price-iq-api.onrender.com/docs
```

---

## 🔄 CI/CD 자동화

GitHub Actions 워크플로우가 설정되었습니다:

```
GitHub에 push
    ↓
.github/workflows/deploy.yml 자동 실행
    ↓
배포 플랫폼으로 자동 배포
```

### 자동 배포 활성화

배포 플랫폼 (Render/Railway)에서:
```
GitHub 리포지토리 자동 배포 활성화
```

---

## 📚 배포된 리소스

| 리소스 | 링크 |
|--------|------|
| **GitHub 리포지토리** | https://github.com/Babamba-CU/price-iq-kakao-pipeline |
| **API 문서** | [배포 후] https://price-iq-api.onrender.com/docs |
| **배포 로그** | [Render] https://render.com/dashboard |
| **GitHub Actions** | https://github.com/Babamba-CU/price-iq-kakao-pipeline/actions |

---

## 🎯 배포 후 다음 단계

### 1️⃣ 데이터베이스 마이그레이션 (필요시)

```bash
# 배포된 서버에서 실행
cd backend
alembic upgrade head
```

### 2️⃣ 초기 관리자 계정 생성

```bash
python scripts/create_admin.py
```

### 3️⃣ 초기 데이터 로드

```bash
python scripts/seed_devices.py
python scripts/seed_sample_data.py
```

### 4️⃣ 프론트엔드 배포 (선택)

```
frontend/README.md 참고
Vercel, Netlify, 또는 GitHub Pages로 배포
```

---

## ✅ 최종 체크리스트

```
☑️  GitHub 로그인 완료
☑️  리포지토리 생성 및 푸시 완료
☑️  GitHub Actions 워크플로우 설정 완료
☑️  배포 플랫폼 선택 (Render/Railway)
☑️  환경변수 설정
☑️  배포 실행
☑️  API 테스트 완료
☑️  문서 업데이트 완료
```

---

## 🆘 문제 해결

### "배포 실패"
```
1. 배포 플랫폼의 로그 확인
2. 환경변수가 모두 설정되었는지 확인
3. requirements.txt가 최신인지 확인
4. Start Command가 올바른지 확인
```

### "API 연결 실패"
```
1. API 엔드포인트 URL 확인
2. CORS_ORIGINS 설정 확인
3. 배포 플랫폼의 상태 확인
4. GitHub Actions 로그 확인
```

### "데이터베이스 오류"
```
1. DATABASE_URL이 올바른지 확인
2. 데이터베이스가 실행 중인지 확인
3. 네트워크 접근 권한 확인
4. alembic 마이그레이션 실행
```

---

## 📊 배포 구조

```
┌──────────────────────────────────────────────────┐
│          GitHub Repository                       │
│   https://github.com/Babamba-CU/price-iq-...   │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼ (push 감지)
        ┌────────────────────────┐
        │  GitHub Actions        │
        │  (CI/CD 파이프라인)      │
        └────────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌───────────┐         ┌───────────┐
    │  Render   │         │ Railway   │
    │  (선택)    │         │ (선택)    │
    └─────┬─────┘         └─────┬─────┘
          │                     │
          ▼                     ▼
    FastAPI Server         FastAPI Server
    (프로덕션)              (프로덕션)
```

---

## 🎓 배포 완료 후 운영

### 로그 모니터링
```
Render/Railway 대시보드 → Logs 탭
```

### 성능 모니터링
```
FastAPI Docs → /metrics 엔드포인트
```

### 데이터 관리
```
PostgreSQL 콘솔 접근
Adminer 또는 pgAdmin 설정 (선택)
```

---

## 🚀 다음 기능 추가

- [ ] 텔레그램 봇 자동화
- [ ] Celery 스케줄 작업
- [ ] 신규 단말 자동 승인
- [ ] 프론트엔드 배포
- [ ] 모니터링 대시보드
- [ ] 에러 추적 (Sentry)

---

*배포 완료: 2026-04-22*
*상태: 🟢 준비 완료*
*다음: Render 또는 Railway에서 배포 진행*

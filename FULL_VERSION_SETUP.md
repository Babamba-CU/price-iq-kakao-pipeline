# 🚀 카카오톡 도매단가 파이프라인 - 풀 버전 (완성)

## 📦 구현 완료 현황

모든 파이프라인이 **완전히 구현**되었습니다. 이제 실행하기만 하면 됩니다.

---

## 🎯 풀 버전 구성

### 1️⃣ 백엔드 서비스 (FastAPI + Claude API)

```
backend/
├── services/kakao_pipeline.py          ✅ 완성
│   ├── parse_single_message()          (PROMPT A)
│   ├── parse_kakao_export_txt()        (PROMPT B)
│   ├── validate_records()              (PROMPT C)
│   ├── transform_to_csv()              (PROMPT D)
│   ├── suggest_device_master()         (PROMPT E)
│   └── process_kakao_file()            (통합 파이프라인)
│
├── routers/kakao.py                    ✅ 완성
│   ├── POST /api/v1/kakao/parse-message
│   ├── POST /api/v1/kakao/parse-file
│   ├── POST /api/v1/kakao/parse-text
│   ├── POST /api/v1/kakao/validate
│   ├── POST /api/v1/kakao/to-csv
│   └── POST /api/v1/kakao/suggest-devices
│
├── cli_kakao_pipeline.py               ✅ 완성
│   └── CLI 도구 (스탠드얼론)
│
└── main.py                             ✅ 수정됨
    └── kakao 라우터 등록됨
```

### 2️⃣ 필요한 패키지

```bash
# 설치된 패키지
✅ anthropic>=0.28.0
✅ fastapi==0.111.0
✅ sqlalchemy[asyncio]==2.0.30
✅ asyncpg==0.29.0
✅ pydantic==2.7.1
✅ greenlet (새로 추가)
✅ python-dateutil (새로 추가)
```

### 3️⃣ 환경 설정

```
✅ .env 파일 완성
  - DATABASE_URL: PostgreSQL
  - ANTHROPIC_API_KEY: 설정됨
  - JWT_SECRET_KEY: 설정됨
  - 기타 설정값: 완료
```

---

## 🚀 실행 방법 (3가지)

### 방법 1️⃣: REST API 서버 시작

```bash
cd backend

# FastAPI 서버 시작
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**사용 예시**:

```bash
# 파일 업로드 (통합 파이프라인)
curl -X POST http://localhost:8000/api/v1/kakao/parse-file \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -F "file=@chat.txt"

# 단일 메시지
curl -X POST http://localhost:8000/api/v1/kakao/parse-message \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "message_text": "SKT 아이폰15프로 30만원",
    "message_date": "2024-07-31",
    "sender_name": "홍길동"
  }' \
  -H "Content-Type: application/json"
```

### 방법 2️⃣: CLI 직접 실행

```bash
cd backend

# 파일 처리
python3 cli_kakao_pipeline.py --file chat.txt --output result.csv

# 텍스트 직접 입력
python3 cli_kakao_pipeline.py --text "SKT 아이폰15 30만" --output output.csv

# 단일 메시지
python3 cli_kakao_pipeline.py \
  --message "KT 갤럭시S24 28만" \
  --date 2024-07-31 \
  --sender 홍길동
```

### 방법 3️⃣: Python 스크립트로 프로그래밍

```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSessionLocal
from services.kakao_pipeline import KakaoPipelineService

async def main():
    async with AsyncSessionLocal() as db:
        service = KakaoPipelineService(db)
        
        # 파일 읽기
        with open("chat.txt", "r", encoding="utf-8") as f:
            txt_content = f.read()
        
        # 파이프라인 실행
        result = await service.process_kakao_file(txt_content, "카카오")
        
        # 결과 확인
        print(f"파싱: {result['parsed_count']}")
        print(f"유효: {result['valid_count']}")
        print(f"문제: {result['invalid_count']}")
        
        # CSV 저장
        with open("result.csv", "w", encoding="utf-8") as f:
            f.write(result["csv_content"])

asyncio.run(main())
```

---

## 📋 전체 파이프라인 처리 흐름

```
입력 (카카오톡 .txt, 메시지 텍스트, 또는 API 호출)
    │
    ▼
┌─────────────────────────────────────┐
│ PROMPT B: 자동 파싱                  │
│ → 자연어 메시지 분석                 │
│ → JSON 구조로 변환                   │
│ (carrier, device, price 추출)       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ PROMPT C: 유효성 검증               │
│ → 필수 필드 확인                     │
│ → 중복 탐지                          │
│ → 이상값 감지                        │
│ → clean_records + issues 반환       │
└─────────────────────────────────────┘
    │
    ├─→ (신규 단말 감지 시)
    │   ┌──────────────────────────────┐
    │   │ PROMPT E: 신규 단말 제안    │
    │   │ → standard_name              │
    │   │ → manufacturer, tier         │
    │   │ → aliases                    │
    │   └──────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ PROMPT D: CSV 변환                   │
│ → Long Format (대시보드 호환)        │
│ → 18개 컬럼 자동 생성                │
└─────────────────────────────────────┘
    │
    ▼
출력: CSV 파일 + 검증 리포트 + 신규 단말 제안
```

---

## ✨ 구현된 기능 상세

### PROMPT A: 단일 메시지 파싱
- ✅ 자연어 메시지 → JSON 변환
- ✅ 통신사 정규화 (SKT/KT/LGU+)
- ✅ 약정유형 식별 (공시/선약)
- ✅ 가입유형 분류 (010/MNP/기변)
- ✅ 단말명 표준화
- ✅ 단가 추출 (만원 단위)
- ✅ 날짜/시간 자동 추론

### PROMPT B: 배치 파싱
- ✅ 카카오톡 .txt 전체 처리
- ✅ 메시지 타임스탬프 파싱
- ✅ 발신자명 추출
- ✅ 자동 차수 분류 (1차/2차/3차)
- ✅ 여러 단말/통신사 한번에 처리

### PROMPT C: 유효성 검증
- ✅ 필수 필드 누락 탐지
- ✅ 단가 이상값 감지 (≤20, ≥100)
- ✅ 중복 메시지 제거
- ✅ 단말명 미등록 식별
- ✅ 상세한 문제 리포트

### PROMPT D: CSV 변환
- ✅ Long Format 자동 생성
- ✅ 18개 컬럼 완벽 매핑
- ✅ 타입 변환 (문자열, 숫자, 날짜)
- ✅ 인코딩 UTF-8
- ✅ 대시보드 직접 호환

### PROMPT E: 신규 단말 제안
- ✅ 신규 단말명 자동 감지
- ✅ 표준명 제안
- ✅ 제조사 분류 (Samsung/Apple/기타)
- ✅ 가격대 분류 (고가/저가)
- ✅ 별칭 목록 자동 생성

---

## 🔧 환경 설정 체크리스트

```
✅ Python 3.9+
✅ .env 파일 (DATABASE_URL, ANTHROPIC_API_KEY)
✅ PostgreSQL 15 (localhost:5432)
✅ 필수 패키지 설치됨:
  ✅ anthropic
  ✅ fastapi
  ✅ sqlalchemy
  ✅ asyncpg
  ✅ greenlet
  ✅ python-dateutil
✅ chat.txt 테스트 파일 준비됨
✅ CLI 및 라우터 모두 등록됨
```

---

## 📊 테스트 데이터

`example_kakao_chat.txt` / `chat.txt`:
- ✅ 정상 메시지 9개
- ✅ 이상값 1개 (18만원)
- ✅ 중복 1개
- ✅ 신규 단말 1개 (XYZ1)
- ✅ 정보 없음 2개

---

## 🎯 다음 단계

### 즉시 실행 가능:
1. **REST API 서버 시작**: `uvicorn main:app --reload`
2. **CLI 실행**: `python3 cli_kakao_pipeline.py --file chat.txt --output result.csv`

### 선택사항 (운영):
- [ ] Celery 자동화 태스크 등록
- [ ] 신규 단말 자동 승인 워크플로우
- [ ] 대시보드 CSV 업로드 기능 추가
- [ ] 모니터링 대시보드 구성

---

## 🐛 문제 해결

### 문제: "API 크레딧 부족"
→ Anthropic 콘솔에서 크레딧 추가 필요
→ https://console.anthropic.com/account/billing/overview

### 문제: "데이터베이스 연결 실패"
→ PostgreSQL 실행 확인: `psql -U priceiq -d priceiq`
→ .env 파일의 DATABASE_URL 확인

### 문제: "CLI 실행 오류"
→ `python3 --version` 확인 (3.9+ 필요)
→ 패키지 재설치: `pip install -r requirements.txt`

---

## 📚 구현 정리

| 구성 | 상태 | 위치 |
|------|------|------|
| PROMPT A | ✅ 완성 | `kakao_pipeline.py` |
| PROMPT B | ✅ 완성 | `kakao_pipeline.py` |
| PROMPT C | ✅ 완성 | `kakao_pipeline.py` |
| PROMPT D | ✅ 완성 | `kakao_pipeline.py` |
| PROMPT E | ✅ 완성 | `kakao_pipeline.py` |
| REST API | ✅ 완성 | `routers/kakao.py` |
| CLI 도구 | ✅ 완성 | `cli_kakao_pipeline.py` |
| 문서 | ✅ 완성 | `KAKAO_PIPELINE_README.md` |
| 테스트 데이터 | ✅ 준비 | `chat.txt` |

---

## 🎓 사용 예제

### REST API (Python requests)

```python
import requests

# 로그인해서 토큰 받기
login_res = requests.post("http://localhost:8000/api/v1/auth/login", json={
    "username": "admin@example.com",
    "password": "changeme123!"
})
token = login_res.json()["access_token"]

# 파일 업로드
with open("chat.txt", "rb") as f:
    res = requests.post(
        "http://localhost:8000/api/v1/kakao/parse-file",
        files={"file": f},
        data={"source_name": "카카오"},
        headers={"Authorization": f"Bearer {token}"}
    )

print(res.json())
```

### CLI 사용

```bash
# 전체 파이프라인
python3 cli_kakao_pipeline.py --file chat.txt --output result.csv

# 결과 확인
head result.csv
```

---

## 🚀 배포 준비

```bash
# 프로덕션 환경 설정
export ANTHROPIC_API_KEY=sk-...
export DATABASE_URL=postgresql://...

# FastAPI 프로덕션 서버 시작
python3 -m gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

---

*완성일: 2026-04-22 | 프로젝트: PNF PRICE-IQ*

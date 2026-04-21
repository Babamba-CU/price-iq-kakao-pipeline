# PNF 단가 인텔리전스 플랫폼 (PRICE-IQ)

## 프로젝트 개요

PNF 구성원들이 텔레그램에 공유하는 3사(SKT/KT/LGU+) 스마트폰 도매 단가 정보를 자동 수집·구조화하고,
지역 단위 시각화 대시보드 및 AI 에이전트 경쟁 분석을 통해 경쟁사의 단가 과열을 실시간으로 감지·대응하는 내부 플랫폼.

---

## 기술 스택

### Backend
- **Python 3.11+** / FastAPI
- **PostgreSQL 15** — 정형 단가 데이터, 메타 정보, 사용자/권한
- **Redis** — 일별 집계 캐싱, 알림 큐
- **Celery + Redis** — 스케줄 집계 (12시/17시 배치)
- **SQLAlchemy 2.0** (async) — ORM
- **Alembic** — DB 마이그레이션
- **python-jose + passlib** — JWT 인증, bcrypt 비밀번호 해싱

### 텔레그램 수집
- **python-telegram-bot v20** (async) — 봇 수신 처리
- 구성원이 웹 UI에서 직접 업로드하는 방식이 **1차 수집 채널**
- 텔레그램 봇은 **2차 채널**: 지정 그룹에서 메시지/이미지 자동 수신 보조
- **Claude API (claude-sonnet-4-20250514)** — 이미지/텍스트 파싱 및 구조화

### Frontend
- **React 18 + TypeScript**
- **Vite** — 빌드 도구
- **Tailwind CSS** — 스타일링
- **Recharts / D3.js** — 단말별 단가 차트
- **React-Leaflet + GeoJSON** — 전국/시도/구군/동 단위 지도 시각화
- **TanStack Query** — 서버 상태 관리

### AI 에이전트
- **Claude API** — 경쟁 분석 에이전트
- **LangChain** (선택적) — Tool calling 구조화

### 인프라
- **Docker / Docker Compose** — 로컬 및 서버 동일 환경
- **Nginx** — 리버스 프록시 + HTTPS (Let's Encrypt)
- **클라우드/사내 서버 배포** (AWS EC2 또는 사내 VM 기준)
- **환경변수 관리**: `.env` (절대 커밋 금지)

---

## 디렉토리 구조

```
price-iq/
├── CLAUDE.md                  # 이 파일
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── main.py                # FastAPI 앱 진입점
│   ├── config.py              # 설정 (환경변수 로드)
│   ├── database.py            # DB 연결, 세션 관리
│   │
│   ├── models/                # SQLAlchemy ORM 모델
│   │   ├── user.py            # 사용자 및 역할(Role)
│   │   ├── price_entry.py     # 단가 수집 원본
│   │   ├── price_aggregated.py # 집계 결과
│   │   ├── device_meta.py     # 단말 메타 (기종명, 출고가 등)
│   │   ├── carrier_policy.py  # 이통사 정책 정보
│   │   └── region.py          # 지역 마스터 (시도/구군/동)
│   │
│   ├── schemas/               # Pydantic 스키마
│   │   ├── auth.py            # 로그인/토큰 스키마
│   │   ├── user.py
│   │   ├── price_entry.py
│   │   ├── aggregation.py
│   │   └── device.py
│   │
│   ├── routers/               # FastAPI 라우터
│   │   ├── auth.py            # 로그인/로그아웃/토큰 갱신
│   │   ├── users.py           # 사용자 관리 (admin 전용)
│   │   ├── ingest.py          # 단가 수집 API
│   │   ├── dashboard.py       # 대시보드 데이터 API
│   │   ├── devices.py         # 단말 관리 API
│   │   ├── aggregation.py     # 집계 결과 API
│   │   └── agent.py           # AI 에이전트 분석 API
│   │
│   ├── services/
│   │   ├── auth.py            # JWT 발급/검증, 권한 의존성
│   │   ├── telegram_bot.py    # 텔레그램 봇 수신 처리
│   │   ├── parser.py          # 텍스트/이미지 → 구조화 데이터
│   │   ├── aggregator.py      # 12시/17시 집계 로직
│   │   ├── alert.py           # 과열 감지 알림
│   │   └── agent.py           # Claude 경쟁 분석 에이전트
│   │
│   ├── tasks/                 # Celery 태스크
│   │   ├── schedule.py        # 12시/17시 집계 스케줄
│   │   └── alert_check.py     # 알림 조건 체크
│   │
│   └── utils/
│       ├── geo.py             # 지역 코드 매핑
│       └── device_tier.py     # 단말 등급 분류 로직
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # 메인 대시보드
│   │   │   ├── RegionMap.tsx          # 지역 단위 지도 시각화
│   │   │   ├── DeviceDashboard.tsx    # 단말별 단가 대시보드
│   │   │   ├── CompetitionAnalysis.tsx # 경쟁 분석 에이전트 UI
│   │   │   └── DeviceManager.tsx      # 단말 메타 관리
│   │   │
│   │   ├── components/
│   │   │   ├── PriceTable.tsx         # 단가 테이블
│   │   │   ├── RegionHeatmap.tsx      # 지역 히트맵
│   │   │   ├── CarrierCompareChart.tsx # 3사 비교 차트
│   │   │   ├── AlertBanner.tsx        # 과열 알림 배너
│   │   │   └── AgentChat.tsx          # 에이전트 분석 출력
│   │   │
│   │   └── api/                       # API 클라이언트
│
├── data/
│   ├── geojson/               # 전국 시도/구군/동 GeoJSON
│   └── device_master.json     # 단말 마스터 (출고가 등)
│
└── scripts/
    ├── seed_devices.py        # 단말 마스터 초기 데이터 적재
    └── backfill_regions.py    # 지역 마스터 초기 적재
```

---

## 사용자 및 권한 관리

### 역할(Role) 정의

| 역할 | 코드 | 주요 권한 |
|---|---|---|
| 시스템 관리자 | `admin` | 전체 권한 (사용자 생성/삭제, 단말 마스터 관리, 모든 데이터 삭제) |
| SKT 구성원 | `skt_staff` | 조회 전체 + 본인 등록 데이터 삭제 + 이상 데이터 신고/삭제 |
| PNF 중간 관리자 | `pnf_manager` | 조회 전체 + 본인 등록 데이터 삭제 + 이상 데이터 신고 |
| 일반 구성원 | `member` | 조회 + 본인 등록 데이터 삭제만 가능 |

### 사용자 DB 모델

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
                    -- 'admin' | 'skt_staff' | 'pnf_manager' | 'member'
    org_type        VARCHAR(10),          -- 'SKT' | 'PNF'
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);
```

### 데이터 삭제 정책

```sql
-- price_entry에 삭제 관련 필드 추가
ALTER TABLE price_entry ADD COLUMN
    deleted_at      TIMESTAMPTZ DEFAULT NULL,   -- NULL이면 유효 데이터
    deleted_by      INT REFERENCES users(id),   -- 삭제한 사용자
    delete_reason   VARCHAR(200);               -- 삭제 사유 (필수 입력)
```

**삭제 원칙 (Soft Delete):**
- 물리 삭제 금지 — 모든 삭제는 `deleted_at` 타임스탬프 기록
- `deleted_at IS NOT NULL` 데이터는 집계/대시보드에서 자동 제외
- 삭제 이력은 감사 로그로 별도 보관 (`audit_log` 테이블)
- 삭제 사유 입력 필수 (UI에서 강제)

**삭제 권한 매트릭스:**

| 대상 데이터 | admin | skt_staff | pnf_manager | member |
|---|---|---|---|---|
| 본인 등록 데이터 | ✅ | ✅ | ✅ | ✅ |
| 타인 등록 데이터 (이상 판단) | ✅ | ✅ | ❌ | ❌ |
| 이상 데이터 신고 (삭제 요청) | ✅ | ✅ | ✅ | ❌ |
| 신고된 데이터 최종 삭제 | ✅ | ✅ | ❌ | ❌ |
| 단말 마스터 수정 | ✅ | ✅ | ❌ | ❌ |

**이상 데이터 신고 플로우:**
```
pnf_manager가 이상 데이터 발견
  → "이상 신고" 버튼 클릭 + 사유 입력
  → report_status = 'flagged' 로 변경
  → SKT 구성원/admin에게 알림
  → skt_staff/admin이 검토 후 삭제 또는 신고 기각
```

```sql
CREATE TABLE data_reports (
    id              SERIAL PRIMARY KEY,
    price_entry_id  BIGINT REFERENCES price_entry(id),
    reported_by     INT REFERENCES users(id),
    report_reason   TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
                    -- 'pending' | 'approved_delete' | 'rejected'
    reviewed_by     INT REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### JWT 인증 구조

```
로그인 → Access Token (30분) + Refresh Token (7일) 발급
Access Token 만료 시 Refresh Token으로 자동 갱신
로그아웃 시 Refresh Token 블랙리스트 처리 (Redis)
모든 API 엔드포인트에 Bearer Token 필수 (공개 API 없음)
```

### API 권한 적용 예시 (FastAPI Depends)

```python
# 역할별 의존성
def require_role(*roles: str):
    async def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(403, "권한이 없습니다")
        return current_user
    return dependency

# 라우터 적용
@router.delete("/ingest/{entry_id}")
async def delete_entry(
    entry_id: int,
    reason: str,
    user = Depends(require_role("admin", "skt_staff", "pnf_manager", "member"))
):
    # 본인 데이터 or skt_staff 이상 체크 후 soft delete
```

---

## 단말 메타 관리 (출고가 직접 입력 → 향후 연동)

### Phase 1: 직접 입력 방식

관리자 UI(`/admin/devices`)에서 단말 정보를 직접 입력·관리:

```
입력 필드:
- 단말명 (정규화된 공식 명칭)
- 채널 (도매채널/소매채널/신유통채널/전채널/제휴/본사 정책 혹은 별도 언급 없을 시 전채널로 입력)
- 별칭 목록 (파싱 매칭용: 아이폰17프로, iPhone17Pro, 17pro 등)
- 이통사 (전 통신사 / SKT 전용 / KT 전용 / LGU 전용)
- 단가 (10만으로 표시할 경우 10만원, 100K와 같이 표시 시 천원으로 해석)
- 요금제 기준 (고가 요금제 기준/전체/특정 요금제 기준)
- 
```
-> 단말, 요금제 등 정보가 없을 경우 전체에 적용하는 것으로 해석

**단말 마스터 초기 데이터 예시 (`data/device_master.json`):**
```json
[
  {
    "device_name": "아이폰17",
    "aliases": ["iPhone17", "iphone17", "아폰17"],
    "release_price": 1250000,
    "official_subsidy_by_carrier": {
      "SKT": 240000,
      "KT": 240000,
      "LGU": 240000
    },
    "release_date": "2025-09-01",
    "is_active": true
  },
  {
    "device_name": "아이폰17프로",
    "aliases": ["iPhone17Pro", "17pro", "아폰17프로"],
    "release_price": 1550000,
    "official_subsidy_by_carrier": {
      "SKT": 270000,
      "KT": 270000,
      "LGU": 270000
    }
  },
  {
    "device_name": "갤럭시S26",
    "aliases": ["GalaxyS26", "S26", "갤s26"],
    "release_price": 1150000,
    "official_subsidy_by_carrier": {
      "SKT": 210000,
      "KT": 210000,
      "LGU": 210000
    }
  }
]
```

### Phase 2: 외부 연동 (향후)

```
연동 후보:
- 방송통신위원회 공시지원금 공개 API
- 제조사 공식 사이트 크롤링
- 이통사 내부 시스템 API (SKT 내부망 연동)

구조 변경 최소화를 위해 device_meta 테이블의
official_subsidy 필드는 Phase 1부터 캐리어별로 분리 설계
(device_subsidy 별도 테이블로 1:N 관계 유지)
```

```sql
-- 캐리어별 공시지원금 분리 테이블 (Phase 1부터 적용)
CREATE TABLE device_subsidy (
    id          SERIAL PRIMARY KEY,
    device_id   INT REFERENCES device_meta(id),
    carrier     VARCHAR(10) NOT NULL,        -- SKT | KT | LGU
    subsidy     INT NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to   DATE,                     -- NULL이면 현재 유효
    source      VARCHAR(20) DEFAULT 'manual', -- 'manual' | 'api' | 'crawl'
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (device_id, carrier, effective_from)
);
```

---



### 1. 단가 수집 원본 (`price_entry`)

```sql
CREATE TABLE price_entry (
    id              BIGSERIAL PRIMARY KEY,
    collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- 수집 시각
    source_type     VARCHAR(10) NOT NULL,                  -- 'text' | 'image'
    raw_content     TEXT,                                  -- 원문 텍스트 or 이미지 경로
    parsed_at       TIMESTAMPTZ,                           -- 파싱 완료 시각

    -- 이통사
    carrier         VARCHAR(10) NOT NULL,                  -- 'SKT' | 'KT' | 'LGU'

    -- 단말
    device_id       INT REFERENCES device_meta(id),
    device_name     VARCHAR(100),                          -- 파싱된 단말명 (정규화 전)

    -- 가입 유형
    sub_type        VARCHAR(10) NOT NULL,                  -- '010' | 'MNP' | '기변'

    -- 선약/공시
    support_type    VARCHAR(10) NOT NULL,                  -- '선약' | '공시'

    -- 요금제 조건
    plan_condition  VARCHAR(100),                          -- '85이상' | '95이상' | '프라임' 등

    -- 지역
    region_sido     VARCHAR(20),                           -- 시/도
    region_sigungu  VARCHAR(30),                           -- 시군구
    region_dong     VARCHAR(30),                           -- 읍면동

    -- 판매점
    store_type      VARCHAR(20),                           -- 'unknown' | 'code' | 'pnf'
    store_code      VARCHAR(20),                           -- P00000~P99999 or AA~ZZ

    -- 정책 적용 시점
    policy_start_at TIMESTAMPTZ,                           -- 00월 00일 00시~

    -- 단가
    price           INT NOT NULL,                          -- 도매 단가 (원)

    -- 검증
    is_valid        BOOLEAN DEFAULT TRUE,
    note            TEXT
);
```

### 2. 단말 메타 (`device_meta`)

```sql
CREATE TABLE device_meta (
    id              SERIAL PRIMARY KEY,
    device_name     VARCHAR(100) NOT NULL UNIQUE,   -- 정규화된 단말명
    aliases         JSONB,                           -- 파싱용 별칭 배열
    release_price   INT NOT NULL,                    -- 출고가 (원) — 직접 입력
    tier            VARCHAR(10) GENERATED ALWAYS AS (
        CASE
            WHEN release_price >= 1500000 THEN 'premium'
            WHEN release_price >= 900000  THEN 'high'
            WHEN release_price >= 500000  THEN 'mid'
            ELSE 'low'
        END
    ) STORED,
    release_date    DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INT REFERENCES users(id),
    updated_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 캐리어별 공시지원금 (Phase 1: 직접 입력 / Phase 2: API 연동)
-- net_price = release_price - subsidy, ≤0 이면 Alert
CREATE TABLE device_subsidy (
    id              SERIAL PRIMARY KEY,
    device_id       INT REFERENCES device_meta(id) ON DELETE CASCADE,
    carrier         VARCHAR(10) NOT NULL,            -- SKT | KT | LGU
    subsidy         INT NOT NULL DEFAULT 0,          -- 공시지원금 (원)
    net_price       INT GENERATED ALWAYS AS (        -- 출고가 - 공시지원금 (뷰에서 join)
        -- 계산은 애플리케이션 레이어 또는 VIEW로 처리
    ) STORED,                                        -- device_meta.release_price 참조 불가로 앱 레이어 계산
    effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to    DATE,                            -- NULL = 현재 유효
    source          VARCHAR(20) DEFAULT 'manual',   -- 'manual' | 'api' | 'crawl'
    updated_by      INT REFERENCES users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (device_id, carrier, effective_from)
);

-- net_price 및 Alert 조회용 VIEW
CREATE VIEW device_price_view AS
SELECT
    dm.id AS device_id,
    dm.device_name,
    dm.tier,
    dm.release_price,
    ds.carrier,
    ds.subsidy AS official_subsidy,
    (dm.release_price - ds.subsidy) AS net_price,
    ((dm.release_price - ds.subsidy) <= 0) AS is_alert
FROM device_meta dm
JOIN device_subsidy ds ON dm.id = ds.device_id
WHERE ds.effective_to IS NULL
  AND dm.is_active = TRUE;
```

### 3. 집계 결과 (`price_aggregated`)

```sql
CREATE TABLE price_aggregated (
    id              BIGSERIAL PRIMARY KEY,
    agg_date        DATE NOT NULL,
    agg_round       SMALLINT NOT NULL,        -- 1: 12시 차수, 2: 17시 차수
    agg_level       VARCHAR(10) NOT NULL,     -- 'national' | 'sido' | 'sigungu' | 'dong'
    region_key      VARCHAR(50),              -- NULL(전국) | 시도명 | 시군구명 | 동명

    carrier         VARCHAR(10) NOT NULL,
    device_id       INT REFERENCES device_meta(id),
    sub_type        VARCHAR(10),
    support_type    VARCHAR(10),
    plan_condition  VARCHAR(100),

    sample_count    INT NOT NULL,             -- 집계 표본 수
    avg_price       INT,                      -- 평균 단가
    top30_price     INT,                      -- 상위 30% 단가 (70th percentile)
    max_price       INT,                      -- 최대 단가

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (agg_date, agg_round, agg_level, region_key, carrier, device_id, sub_type, support_type, plan_condition)
);
```

---

## 핵심 서비스 구현 가이드

### A. 텔레그램 봇 수신 (`services/telegram_bot.py`)

```
구현 포인트:
- python-telegram-bot의 Application 클래스로 봇 초기화
- MessageHandler로 텍스트/사진 메시지 모두 수신
- 텍스트: 원문 그대로 parser.py로 전달
- 이미지: 파일 다운로드 후 base64 변환 → Claude API로 전달
- 수신 즉시 DB에 raw 저장 후 파싱 태스크 큐잉
- 처리 완료 시 봇으로 확인 메시지 발송 (선택적)
```

### B. 파싱 서비스 (`services/parser.py`)

**텍스트 파싱 프롬프트 구조:**
```
[시스템]
당신은 이동통신 도매 단가 데이터를 구조화하는 파서입니다.
입력된 텍스트에서 다음 필드를 추출하여 JSON으로만 응답하세요.
필드가 명시되지 않은 경우 null로 처리합니다.

[추출 필드]
carrier: SKT | KT | LGU
device_name: 단말명 (예: 아이폰17프로, 갤럭시S26)
sub_type: 010 | MNP | 기변
support_type: 선약 | 공시
plan_condition: 요금제 조건 문자열 (예: "85이상", "프라임")
region_sido: 시/도
region_sigungu: 시군구
region_dong: 읍면동
store_type: unknown | code | pnf
store_code: 판매점 코드
policy_start_at: ISO8601 형식 (추론 가능한 경우)
price: 정수 (원 단위)

[이미지 파싱 시]
이미지에서 표/텍스트를 인식하여 위 JSON 배열 형식으로 복수 항목 추출 가능
```

**단말명 정규화:**
- device_meta의 aliases JSONB 배열과 매칭
- 유사 문자열 정규화: "아이폰17프로" = "iPhone17Pro" = "17pro" 등
- 매칭 실패 시 device_name 원문 보존 + is_valid=false 플래그

### C. 집계 서비스 (`services/aggregator.py`)

```
집계 스케줄: 매일 12:00, 17:00 (KST) → Celery beat

집계 로직:
1. 당일 00:00 ~ 집계 시각 사이의 is_valid=true 데이터 조회
2. 레벨별 그룹핑: (carrier, device_id, sub_type, support_type, plan_condition)
   - 전국: 모든 데이터
   - 시도: region_sido 기준
   - 시군구: region_sigungu 기준
   - 동: region_dong 기준
3. 각 그룹 통계 계산:
   - avg_price: AVG(price)
   - top30_price: PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY price)
   - max_price: MAX(price)
4. price_aggregated upsert (agg_round별 덮어쓰기)
5. 알림 체크 (alert.py) 호출
```

### D. 알림 서비스 (`services/alert.py`)

```
알림 조건 1 — 출고가 하회:
  device_meta.net_price <= 0 인 단말이 존재하면 즉시 알림

알림 조건 2 — 경쟁사 단가 급등:
  이전 차수(또는 전일 동 차수) 대비 특정 carrier의 avg_price가
  임계값(기본: 10% 이상) 상승하면 알림
  → AlertBanner로 프론트 전달 + 텔레그램 봇 역방향 알림 (선택)

알림 조건 3 — 특정 지역 집중 과열:
  특정 시도/시군구에서 경쟁사 max_price가 타 지역 avg_price 대비
  임계값(기본: 15%) 이상이면 지역 과열 알림
```

### E. AI 경쟁 분석 에이전트 (`services/agent.py`)

```
트리거: 집계 완료 후 자동 실행 or 사용자 요청

분석 항목:
1. 전체 우위/열위: 3사 avg_price 비교 → 우리 캐리어 포지션
2. 단말별 우위/열위: 주요 단말 top5 기준 3사 비교
3. 지역별 우위/열위: 시도 단위 히트맵 기반 우세/열세 지역
4. 변동 분석: 직전 차수 대비 급등 캐리어/단말/지역 식별
5. 대응 권고: 열위 단말 및 지역에 대한 단가 조정 시사점

에이전트 컨텍스트 구성:
- 당일 집계 결과 JSON (전국/시도 레벨)
- 전일/전 차수 집계 결과 JSON
- 단말 메타 (출고가, 공시지원금, 등급)
- 분석 요청 프롬프트

출력: 마크다운 형식 분석 리포트 → AgentChat 컴포넌트에 렌더링
```

---

## API 엔드포인트 설계

### 인증
```
POST /api/v1/auth/login           # 로그인 → Access/Refresh Token 발급
POST /api/v1/auth/refresh         # Access Token 갱신
POST /api/v1/auth/logout          # 로그아웃 (Refresh Token 무효화)
GET  /api/v1/auth/me              # 내 프로필 조회
```

### 사용자 관리 (admin 전용)
```
GET    /api/v1/users              # 전체 사용자 목록
POST   /api/v1/users              # 사용자 생성
PATCH  /api/v1/users/{id}         # 역할/활성화 수정
DELETE /api/v1/users/{id}         # 사용자 비활성화
```

### 수집 / 수동 입력
```
POST /api/v1/ingest/text          # 텍스트 단가 직접 등록
POST /api/v1/ingest/image         # 이미지 업로드 → 파싱
GET  /api/v1/ingest/pending       # 파싱 대기 목록
PATCH /api/v1/ingest/{id}/validate # 파싱 결과 수동 검증
DELETE /api/v1/ingest/{id}        # 데이터 삭제 (soft, 사유 필수)
POST /api/v1/ingest/{id}/report   # 이상 데이터 신고 (pnf_manager+)
GET  /api/v1/ingest/reports       # 신고 목록 조회 (skt_staff+)
PATCH /api/v1/ingest/reports/{id} # 신고 처리 (skt_staff+)
```

### 대시보드 / 집계 데이터
```
GET /api/v1/aggregation/latest            # 최신 차수 전국 집계
GET /api/v1/aggregation/region/{level}    # 시도/시군구/동 집계
GET /api/v1/aggregation/device/{device_id} # 단말별 3사 비교
GET /api/v1/aggregation/history           # 일별 추이 (기간 쿼리)
```

### 단말 관리 (admin/skt_staff)
```
GET    /api/v1/devices              # 단말 목록 (등급 필터 포함)
POST   /api/v1/devices              # 단말 등록
PATCH  /api/v1/devices/{id}         # 출고가/별칭 수정
POST   /api/v1/devices/{id}/subsidy # 공시지원금 등록 (캐리어별)
PATCH  /api/v1/devices/{id}/subsidy/{carrier} # 공시지원금 수정
GET    /api/v1/devices/alerts       # net_price ≤ 0 알림 목록
```

### AI 에이전트
```
POST /api/v1/agent/analyze          # 분석 실행 (round 지정 가능)
GET  /api/v1/agent/reports          # 분석 리포트 목록
GET  /api/v1/agent/reports/{id}     # 특정 리포트 조회
```

### 알림
```
GET  /api/v1/alerts/active          # 현재 활성 알림
PATCH /api/v1/alerts/{id}/dismiss   # 알림 처리
```

---

## 프론트엔드 페이지 구성

### 0. 로그인 (`/login`)
- 이메일/비밀번호 입력
- JWT Access/Refresh Token 발급 후 로컬스토리지 저장
- 역할(Role)에 따라 접근 가능한 메뉴 자동 제한

### 1. 메인 대시보드 (`/`)
- 오늘 날짜, 현재 차수 표시
- 3사 전국 평균/상위30%/Max 카드
- net_price ≤ 0 단말 Alert 배너 (빨간색)
- 경쟁사 급등 알림 배너 (주황색)
- 신고된 데이터 처리 알림 (skt_staff+ 전용)
- 최근 수집 원본 피드 (실시간)

### 2. 지역 지도 (`/map`)
- React-Leaflet 기반 전국 지도
- 레벨 토글: 전국 → 시도 → 시군구 → 동 드릴다운
- 이통사 선택, 단말 선택, 가입유형 필터
- 히트맵: avg_price 기준 색상 구분
- 클릭 시 해당 지역 상세 팝업 (평균/상위30/Max)

### 3. 단말별 대시보드 (`/devices`)
- 단말 등급 탭: 프리미엄 / 고가 / 중가 / 저가
- 단말 선택 시 3사 비교 바 차트
- 출고가 / 공시지원금(캐리어별) / net_price 표시
- net_price ≤ 0 시 빨간색 하이라이트 + Alert 뱃지
- 가입유형별 단가 필터

### 4. 경쟁 분석 (`/analysis`)
- 최신 에이전트 리포트 표시 (마크다운 렌더링)
- 분석 재실행 버튼
- 전일 대비 변동률 히트맵 (단말 × 이통사 매트릭스)
- 차수별 추이 라인 차트

### 5. 단가 수집 관리 (`/ingest`)
- 수동 텍스트/이미지 업로드
- 파싱 결과 검토 및 수동 수정
- 이상 데이터 신고 버튼 (pnf_manager+)
- 데이터 삭제 버튼 (본인 데이터: 전체 / 타인 데이터: skt_staff+)
- 삭제/신고 시 사유 입력 모달 필수
- 신고 처리 현황 탭 (skt_staff+): 신고 목록 → 승인삭제/기각

### 6. 관리자 (`/admin`) — admin/skt_staff 전용
- **단말 마스터 관리**: 단말 등록/수정, 출고가 입력, 캐리어별 공시지원금 관리
- **사용자 관리**: 사용자 목록, 역할 수정, 계정 활성화/비활성화 (admin 전용)
- **감사 로그**: 삭제/신고 이력 조회

---

## 온톨로지 / 지식 체계 구조

TypeDB 또는 JSON-LD 기반 지식 그래프로 확장 가능한 엔티티 관계:

```
[엔티티]
Carrier (이통사)
  ├─ 속성: name, code
Device (단말)
  ├─ 속성: name, release_price, tier, official_subsidy
Region (지역)
  ├─ 속성: name, level (sido/sigungu/dong), parent_region
Store (판매점)
  ├─ 속성: code, type (pnf/general), region
PriceEntry (단가 수집)
  ├─ 관계: [Carrier] × [Device] × [Region] × [Store]
  ├─ 속성: price, sub_type, support_type, plan_condition, collected_at

[추론 규칙 예시]
- Device.net_price <= 0 → ALERT(over_subsidy)
- PriceEntry.price > prev_round.avg_price * 1.1 → ALERT(price_surge)
- Region.avg_price(carrier_A) > Region.avg_price(carrier_B) * 1.15 → ALERT(regional_overheat)
```

---

## 환경 변수 (.env.example)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/priceiq

# Redis
REDIS_URL=redis://localhost:6379/0

# Telegram
TELEGRAM_BOT_TOKEN=           # BotFather에서 발급
TELEGRAM_GROUP_ID=            # 수집 대상 그룹 ID (음수값)
TELEGRAM_ADMIN_CHAT_ID=       # 알림 수신할 관리자 Chat ID

# Claude API
ANTHROPIC_API_KEY=            # Anthropic 콘솔에서 발급

# Auth
JWT_SECRET_KEY=               # 랜덤 256bit 문자열 (openssl rand -hex 32)
JWT_ACCESS_TOKEN_EXPIRE_MIN=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
INITIAL_ADMIN_EMAIL=          # 최초 관리자 이메일
INITIAL_ADMIN_PASSWORD=       # 최초 관리자 비밀번호 (배포 후 즉시 변경)

# App
ALERT_PRICE_SURGE_THRESHOLD=0.10    # 급등 감지 임계값 (10%)
ALERT_REGIONAL_OVERHEAT_THRESHOLD=0.15

# Aggregation Schedule (KST cron)
AGG_ROUND1_TIME=12:00
AGG_ROUND2_TIME=17:00

# Deployment
CORS_ORIGINS=https://priceiq.your-domain.com
```

---

## 개발 단계별 로드맵

### Phase 1 — 기반 환경 및 인증 (1주)
- [ ] Docker Compose 환경 구성 (PostgreSQL, Redis, FastAPI, Celery, Nginx)
- [ ] DB 스키마 생성 및 마이그레이션 (Alembic) — users, roles 포함
- [ ] JWT 인증 서비스 구현 (로그인/로그아웃/토큰 갱신)
- [ ] 역할 기반 접근 제어 (RBAC) 미들웨어
- [ ] 관리자 계정 초기 생성 스크립트

### Phase 2 — 데이터 수집 및 저장 (1~2주)
- [ ] 텔레그램 봇 수신 구현
- [ ] 웹 UI 수동 업로드 구현 (텍스트/이미지)
- [ ] Claude API 파싱 서비스 구현
- [ ] 단말 마스터 관리 UI (출고가 직접 입력, 캐리어별 공시지원금)
- [ ] 단말 메타 초기 데이터 적재
- [ ] 지역 마스터 데이터 적재 (행정안전부 법정동 코드)

### Phase 3 — 집계, 알림, 데이터 거버넌스 (1주)
- [ ] Celery beat 12시/17시 집계 태스크 구현
- [ ] 알림 조건 3종 (net_price ≤ 0 / 급등 / 지역 과열)
- [ ] Soft delete + 감사 로그 구현
- [ ] 이상 데이터 신고/처리 플로우 구현

### Phase 4 — 프론트엔드 대시보드 (2주)
- [ ] 로그인 페이지 및 역할별 메뉴 구성
- [ ] 메인 대시보드 페이지
- [ ] 지역 지도 (GeoJSON 드릴다운)
- [ ] 단말별 대시보드
- [ ] 관리자 단말 마스터 관리 UI
- [ ] 데이터 수집/신고/삭제 UI

### Phase 5 — AI 에이전트 (1주)
- [ ] 경쟁 분석 에이전트 구현
- [ ] 차수별 변동 분석 로직
- [ ] 에이전트 리포트 UI

### Phase 6 — 운영 안정화 (상시)
- [ ] HTTPS 적용 (Let's Encrypt / 사내 인증서)
- [ ] 파싱 정확도 모니터링 및 프롬프트 개선
- [ ] 공시지원금 외부 연동 (Phase 2 연동 전환)
- [ ] 단말 마스터 업데이트 프로세스 정립

---

## 코딩 컨벤션

- Python: Black 포맷터, isort, type hint 필수
- TypeScript: ESLint + Prettier, strict mode
- 커밋 메시지: `feat:` / `fix:` / `data:` / `refactor:` 접두어
- API 응답 형식: `{ success: bool, data: any, message: str }`
- 에러 처리: 파싱 실패 시 silent fail 금지 — 반드시 로그 + is_valid=false 처리

---

## 주요 참고 자료

- [python-telegram-bot 공식 문서](https://python-telegram-bot.org/)
- [행정안전부 법정동코드](https://www.mois.go.kr/) — 지역 마스터 소스
- [React-Leaflet](https://react-leaflet.js.org/)
- [Claude API — Vision](https://docs.anthropic.com/en/docs/vision)
- [Celery Beat 스케줄링](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html)

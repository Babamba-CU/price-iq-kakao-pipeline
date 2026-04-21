# 카카오톡 도매단가 수집 파이프라인

## 개요

카카오톡 오픈채팅에서 수집한 도매단가 정보를 자동으로 파싱하여 구조화 데이터로 변환하는 파이프라인입니다.

### 주요 기능

- **PROMPT A**: 단일 메시지 파싱 → JSON
- **PROMPT B**: 배치 파싱 (카카오톡 .txt 내보내기 파일)
- **PROMPT C**: 유효성 검증 (중복, 오류값, 필드 누락)
- **PROMPT D**: Long Format CSV 변환 (대시보드 호환)
- **PROMPT E**: 신규 단말 자동 제안

---

## 사용 방법

### 1. FastAPI 라우터를 통한 REST API

#### 단일 메시지 파싱

```bash
curl -X POST http://localhost:8000/api/v1/kakao/parse-message \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message_text": "SKT 아이폰15프로 30만원",
    "message_date": "2024-07-31",
    "sender_name": "홍길동"
  }'
```

**응답:**
```json
{
  "status": "success",
  "records": [
    {
      "survey_date": "20240731",
      "batch_no": "1차",
      "carrier": "SKT",
      "contract_type": null,
      "subscription_type": "010",
      "device_model": "IPHONE 15 PRO",
      "wholesale_price": 30,
      "is_valid": true,
      "dealer_name": "홍길동",
      "channel": "카카오오픈채팅",
      "raw_text": "SKT 아이폰15프로 30만원"
    }
  ],
  "count": 1
}
```

#### 파일 업로드 (통합 파이프라인)

```bash
curl -X POST http://localhost:8000/api/v1/kakao/parse-file \
  -H "Authorization: Bearer {TOKEN}" \
  -F "file=@chat.txt" \
  -F "source_name=카카오_도매가"
```

**응답:**
```json
{
  "status": "success",
  "parsed_count": 45,
  "valid_count": 42,
  "invalid_count": 3,
  "issues": [
    {
      "row_index": 5,
      "issue_type": "missing_field",
      "severity": "error",
      "field": "carrier",
      "current_value": null,
      "suggestion": "통신사 정보 추가 필요",
      "raw_text": "아이폰15 30만원"
    }
  ],
  "new_devices": ["갤럭시Z플롤1"],
  "device_suggestions": [
    {
      "raw_name": "갤럭시Z플롤1",
      "standard_name": "갤럭시 Z플롤1",
      "manufacturer": "Samsung",
      "tier": "고가",
      "aliases": ["Z플롤1", "플롤1"],
      "is_new": true,
      "note": "2024년 신규 기종"
    }
  ],
  "csv_content": "survey_date,batch_no,...\n20240731,1차,..."
}
```

#### 유효성 검증만

```bash
curl -X POST http://localhost:8000/api/v1/kakao/validate \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [...]
  }'
```

#### CSV 변환만

```bash
curl -X POST http://localhost:8000/api/v1/kakao/to-csv \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [...],
    "source_name": "카카오"
  }'
```

#### 신규 단말 제안

```bash
curl -X POST http://localhost:8000/api/v1/kakao/suggest-devices \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "device_names": ["갤럭시Z플롤1", "아이폰17"]
  }'
```

---

### 2. CLI 도구

#### 설치

```bash
cd backend
pip install python-dateutil  # 필요시
```

#### 파일 처리

```bash
python cli_kakao_pipeline.py --file chat.txt --output data.csv --source "카카오_도매가"
```

#### 텍스트 직접 입력

```bash
python cli_kakao_pipeline.py --text "$(cat chat.txt)" --output data.csv
```

#### 단일 메시지 파싱

```bash
python cli_kakao_pipeline.py \
  --message "SKT 아이폰15프로 30만" \
  --date 2024-07-31 \
  --sender 홍길동
```

#### 유효성 검증만

```bash
python cli_kakao_pipeline.py --validate parsed.json
```

---

## 카카오톡 내보내기 형식

### 준비 단계

1. PC 카카오톡 실행
2. 대상 채팅방 선택
3. 우상단 메뉴 > "대화 내보내기"
4. `.txt` 형식 선택 → 저장

### 지원되는 형식

```
2024년 7월 31일 오전 10:23, 홍길동 : SKT 아이폰15프로 30만원
2024년 7월 31일 오전 10:25, 이순신 : KT 갤럭시S24 28만
2024년 7월 31일 오후 2:30, 김유신 : LGU+ 아이폰14 25만
```

---

## 파싱 규칙

### 통신사 (carrier)

| 입력 | 출력 |
|------|------|
| SKT, 에스케이, SK텔레콤 | SKT |
| KT, 케이티, 케티 | KT |
| LG, LGU+, 유플, 엘지유플 | LGU+ |
| (없음) | null |

### 약정유형 (contract_type)

| 입력 | 출력 |
|------|------|
| 공시, 공시지원, 공지 | 공시 |
| 선약, 선택약정, 선택 | 선약 |
| (없음) | null |

### 가입유형 (subscription_type)

| 입력 | 출력 |
|------|------|
| 신규, 010, 번호이동신규 | 010 |
| 번이, 번호이동, MNP, 번변 | MNP |
| 기변, 기기변경 | 기변 |

### 단말명 (device_model) - 정규화 표

| 입력 | 출력 |
|------|------|
| 플립6, Z플립6, 플립 6 | 갤럭시 Z플립6 |
| 폴드6, Z폴드6 | 갤럭시 Z폴드6 |
| S24, 갤S24, S24 울트라 | 갤럭시 S24 / 갤럭시 S24 울트라 |
| 아이폰15, 15, IP15 | IPHONE 15 |
| 아이폰15프로, 15pro, IP15P | IPHONE 15 PRO |
| 아이폰14, IP14 | IPHONE 14 |
| 갤럭시S23, S23 | 갤럭시 S23 |
| A35 | 갤럭시 A35 |

### 단가 (wholesale_price)

- **단위**: 만원 (10 = 10만원)
- **범위**: 20 이상 권장 (20 이하 시 `is_valid=false`)
- **입력 형식**: "30만", "30,000원", "30" → 모두 30으로 파싱

### 날짜 (survey_date)

- **형식**: YYYYMMDD
- **자동 추론**: 메시지 타임스탬프에서 추출
- **예**: "2024년 7월 31일 오전 10:23" → "20240731"

### 차수 (batch_no)

| 시간대 | 출력 |
|--------|------|
| 오전 (~12:00) | 1차 |
| 오후 (12:00~18:00) | 2차 |
| 저녁 (18:00~) | 3차 |

---

## 출력 CSV 스키마 (Long Format)

### 컬럼 정의

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| survey_date | int | 조사 날짜 (YYYYMMDD) | 20240731 |
| batch_no | str | 차수 (1차/2차/3차) | 1차 |
| source_file | str | 소스 파일명 | 카카오_20240731 |
| carrier | str | 통신사 | SKT |
| contract_type | str | 약정 유형 | 공시 |
| subscription_type | str | 가입 유형 | 010 |
| price_tier | str | 가격대 (고가/저가) | 고가 |
| device_model | str | 단말명 (정규화) | IPHONE 15 PRO |
| channel | str | 수집 채널 | 카카오오픈채팅 |
| hq_unit | str | 본부 | (비어있음 가능) |
| dealer_code | str | 대리점 코드 | (비어있음 가능) |
| distribution_type | str | 유통망 구분 | (비어있음 가능) |
| dealer_name | str | 발신자명 | 홍길동 |
| legal_dong_code | str | 법정동 코드 | (비어있음 가능) |
| legal_dong_name | str | 법정동명 | (비어있음 가능) |
| hq_name | str | 본부명 | (비어있음 가능) |
| wholesale_price | int | 도매 단가 (만원) | 30 |
| weight | int | 가중치 (기본 1) | 1 |
| collected_at | str | 수집 시각 (ISO8601) | 2024-07-31T10:23:00Z |

---

## 유효성 검증 규칙

### 필수 필드

- `carrier`
- `subscription_type`
- `device_model`
- `wholesale_price`

### 이상값 탐지

| 조건 | 심각도 | 처리 |
|------|--------|------|
| wholesale_price ≤ 20 | warning | is_valid=false |
| wholesale_price ≥ 100 | warning | 단위 오류 가능성 |
| 필드 누락 | error | 제외 |
| 중복 (동일 date+carrier+device+sender) | warning | 최신 메시지만 유지 |
| 단말명 미등록 | info | 신규 단말로 표시 |

---

## 신규 단말 관리 (PROMPT E)

파이프라인에서 `new_devices_detected`에 포함된 단말은 자동으로 표준명 제안을 받습니다.

### 반환 데이터

```json
{
  "raw_name": "갤럭시Z플롤1",
  "standard_name": "갤럭시 Z플롤1",
  "manufacturer": "Samsung",
  "tier": "고가",
  "aliases": ["Z플롤1", "플롤1"],
  "is_new": true,
  "note": "2024년 신규 기종"
}
```

이 정보를 기반으로 `device_meta` 테이블에 수동으로 등록하면 향후 파싱 시 자동으로 매칭됩니다.

---

## 통합 워크플로우 예시

### 시나리오: 일일 카카오톡 수집

```bash
#!/bin/bash
# 1. 카카오톡에서 .txt 내보내기
# (수동 또는 자동화 도구로 chat.txt 저장)

# 2. 파이프라인 실행
python cli_kakao_pipeline.py \
  --file chat.txt \
  --output wholesale_price_$(date +%Y%m%d).csv \
  --source "카카오_도매가"

# 3. 신규 단말이 있으면 수동 검토 & 마스터 등록
# (device_meta 테이블에 INSERT)

# 4. CSV를 대시보드에 업로드 (수동 또는 자동화)
# wholesale_dashboard.jsx에서 업로드
```

---

## 트러블슈팅

### "파싱 결과가 비어있음"

**원인**: 메시지에 도매단가 정보가 없음

**해결**:
- 메시지 형식 확인 (통신사/단말/단가 포함 필수)
- 광고나 잡담 제외

### "단말명이 매칭되지 않음"

**원인**: device_meta에 해당 단말이 없음

**해결**:
- `new_devices_detected`에서 제안 확인
- device_meta 테이블에 신규 단말 등록
- 별칭 목록 업데이트

### "단가 값이 이상함"

**원인**: 단위 혼동 (원 vs 만원)

**해결**:
- 입력 텍스트에서 "만원" 또는 "K" 등 단위 명시
- is_valid=false 레코드 검토 후 수정

---

## API 응답 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (파일/텍스트 누락) |
| 401 | 인증 실패 (토큰 필요) |
| 500 | 서버 오류 (LLM 호출 실패 등) |

---

## 성능 고려사항

### 처리 시간

- **단일 메시지**: ~1초
- **배치 (100건)**: ~5-10초
- **검증**: ~2초
- **CSV 변환**: ~1초

### 토큰 사용량

- PROMPT A (단일): ~500 tokens
- PROMPT B (100건): ~5,000 tokens
- PROMPT C (검증): ~3,000 tokens
- PROMPT D (CSV): ~2,000 tokens
- PROMPT E (신규 단말): ~1,500 tokens

---

## 확장 아이디어

1. **정기 자동화**: Celery 태스크로 매일 특정 시간에 자동 실행
2. **텔레그램 연동**: 봇으로 메시지 받아서 자동 파싱
3. **스마트 중복 제거**: 발신자 신뢰도 기반 가중치 부여
4. **이상값 자동 수정**: 80% 이상 확률로 수정안 제시 시 자동 적용
5. **다중 채팅방 통합**: 여러 오픈채팅 동시 수집

---

## 라이선스 & 참고

- Claude API: Anthropic SDK 사용
- DB: PostgreSQL + SQLAlchemy
- 프론트: wholesale_dashboard.jsx (Long Format CSV 호환)

---

*마지막 업데이트: 2026-04-21*

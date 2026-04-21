import base64
import csv
import io
import json
import logging
from datetime import datetime
from typing import Optional
from dateutil.parser import parse as parse_date

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.device_meta import DeviceMeta
from models.price_entry import PriceEntry

logger = logging.getLogger(__name__)


class KakaoPipelineService:
    """카카오톡 오픈채팅 도매단가 수집 파이프라인"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # ========== PROMPT A: 단일 메시지 파싱 ==========
    async def parse_single_message(
        self,
        message_text: str,
        message_date: str,
        sender_name: Optional[str] = None,
    ) -> list[dict]:
        """단일 카카오톡 메시지 파싱"""
        prompt = f"""당신은 이동통신 유통망 도매단가 데이터 수집 전문가입니다.
아래의 카카오톡 오픈채팅 메시지에서 단말기별 도매단가 정보를 추출하여
정확한 JSON 배열로 반환하세요.

## 추출 규칙

### 통신사(carrier) 식별
- "SKT", "에스케이", "SK텔레콤" → "SKT"
- "KT", "케이티", "케티" → "KT"
- "LG", "LGU+", "유플", "엘지유플" → "LGU+"
- 통신사 미표기 시 → null

### 약정유형(contract_type) 식별
- "공시", "공시지원", "공지" → "공시"
- "선약", "선택약정", "선택" → "선약"
- 미표기 시 → null

### 가입유형(subscription_type) 식별
- "신규", "010", "번호이동신규" → "010"
- "번이", "번호이동", "MNP", "번변" → "MNP"
- "기변", "기기변경" → "기변"

### 단말명(device_model) 정규화
원문 표기를 아래 표준명으로 매핑하세요:
- "플립6", "Z플립6", "플립 6" → "갤럭시 Z플립6"
- "폴드6", "Z폴드6" → "갤럭시 Z폴드6"
- "S24", "갤S24", "S24 울트라" → "갤럭시 S24" / "갤럭시 S24 울트라"
- "아이폰15", "15", "IP15" → "IPHONE 15"
- "아이폰15프로", "15pro", "IP15P" → "IPHONE 15 PRO"
- 그 외 단말은 원문 정리 후 유지

### 단가(wholesale_price) 추출
- 숫자만 추출 (단위: 만원)
- "30만", "30,000원", "30" → 30
- "0", "없음", "-", "X" → null
- 20 이하 값은 포함하되 is_valid=false 표기

### 날짜(survey_date) 식별
- 메시지 상단 날짜 또는 본문 날짜 사용
- YYYYMMDD 형식으로 변환
- "7/31" → 오늘 연도 기준 YYYYMMDD
- 날짜 없을 경우 → message_date 사용

### 차수(batch_no)
- "1차", "오전", "아침" → "1차"
- "2차", "오후", "점심이후" → "2차"
- "3차", "저녁" → "3차"
- 미표기 시 → "1차"

## 출력 JSON 스키마
[
  {{
    "survey_date": "YYYYMMDD",
    "batch_no": "1차|2차|3차",
    "carrier": "SKT|KT|LGU+|null",
    "contract_type": "공시|선약|null",
    "subscription_type": "010|MNP|기변",
    "device_model": "표준 단말명",
    "wholesale_price": 숫자 또는 null,
    "is_valid": true/false,
    "dealer_name": "{sender_name or null}",
    "channel": "카카오오픈채팅",
    "raw_text": "원문 발췌"
  }}
]

## 처리 지침
- 하나의 메시지에 여러 단말이 있으면 각각 별도 레코드로 분리
- 광고, 안부, 잡담 메시지 → 빈 배열 [] 반환
- JSON만 출력, 설명 없음

## 입력 메시지
message_date: {message_date}
sender: {sender_name or "unknown"}
----
{message_text}
----
"""
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            result = json.loads(response.content[0].text)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"단일 메시지 파싱 실패: {e}")
            return []

    # ========== PROMPT B: 배치 파싱 (.txt 파일) ==========
    async def parse_kakao_export_txt(self, txt_content: str) -> list[dict]:
        """카카오톡 내보내기 .txt 파일 전체 파싱"""
        prompt = f"""당신은 이동통신 도매단가 데이터 파이프라인 엔지니어입니다.
아래는 카카오톡 오픈채팅방을 내보내기한 .txt 파일입니다.

## 작업 목표
1. 단가 정보가 포함된 메시지만 선별
2. 각 메시지를 구조화된 레코드로 변환
3. 전체 결과를 단일 JSON 배열로 반환

## 카카오톡 .txt 형식 (예시)
2024년 7월 31일 오전 10:23, 홍길동 : [메시지 내용]

## 파싱 규칙
- 통신사: SKT계열→"SKT", KT계열→"KT", LG/유플러스→"LGU+"
- 약정: 공시→"공시", 선약→"선약"
- 가입: 신규/010→"010", 번이/MNP→"MNP", 기변→"기변"
- 단말 표준화:
  * Z플립6/플립6 → "갤럭시 Z플립6"
  * Z폴드6/폴드6 → "갤럭시 Z폴드6"
  * S24/갤S24 → "갤럭시 S24"
  * 아이폰15/IP15 → "IPHONE 15"
  * 아이폰15프로/IP15P → "IPHONE 15 PRO"
  * 아이폰14/IP14 → "IPHONE 14"
  * 갤S23/S23 → "갤럭시 S23"
  * A35 → "갤럭시 A35"
- 단가: 만원 단위 숫자. 20 이하 시 is_valid=false
- 날짜: 메시지 시각에서 YYYYMMDD 추출
- 차수: 오전(~12시)→"1차", 오후(12~18시)→"2차", 저녁(18시~)→"3차"

## 출력 JSON 스키마
[
  {{
    "survey_date": "YYYYMMDD",
    "batch_no": "1차|2차|3차",
    "carrier": "SKT|KT|LGU+|null",
    "contract_type": "공시|선약|null",
    "subscription_type": "010|MNP|기변",
    "device_model": "표준 단말명",
    "wholesale_price": 숫자 또는 null,
    "is_valid": true/false,
    "dealer_name": "발신자명 또는 null",
    "channel": "카카오오픈채팅",
    "raw_text": "원문 발췌"
  }}
]

## 입력 파일 내용
{txt_content}

JSON 배열만 출력하세요. 설명 없음.
"""
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            result = json.loads(response.content[0].text)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"배치 파싱 실패: {e}")
            return []

    # ========== PROMPT C: 유효성 검증 ==========
    async def validate_records(self, records: list[dict]) -> dict:
        """파싱된 데이터 유효성 검증"""
        prompt = f"""당신은 이동통신 도매단가 데이터 품질 관리자입니다.
아래의 파싱된 데이터를 검토하고 문제 레코드를 찾아내세요.

## 검증 항목
1. 필수 필드 누락: carrier, contract_type, subscription_type, device_model, wholesale_price
2. 단가 이상값: ≤20→제외(is_valid=false), ≥100→단위 오류 가능성
3. 단말명 표준화 미완성
4. 중복 탐지: (survey_date, carrier, contract_type, subscription_type, device_model, dealer_name) 조합
5. 날짜 일관성

## 출력 JSON 스키마
{{
  "summary": {{
    "total_records": 숫자,
    "valid_records": 숫자,
    "invalid_records": 숫자,
    "issues_found": 숫자
  }},
  "issues": [
    {{
      "row_index": 숫자,
      "issue_type": "missing_field|outlier|duplicate|parse_error|new_device",
      "severity": "error|warning|info",
      "field": "문제 필드명",
      "current_value": "현재값",
      "suggestion": "수정 제안",
      "raw_text": "원문 발췌"
    }}
  ],
  "new_devices_detected": ["단말명1", "단말명2"],
  "clean_records": [/* 문제 없는 레코드 */]
}}

## 검증할 데이터
{json.dumps(records, ensure_ascii=False, indent=2)}

JSON만 출력하세요.
"""
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            result = json.loads(response.content[0].text)
            return result
        except Exception as e:
            logger.error(f"유효성 검증 실패: {e}")
            return {
                "summary": {"total_records": 0, "valid_records": 0, "invalid_records": 0, "issues_found": 0},
                "issues": [],
                "new_devices_detected": [],
                "clean_records": [],
            }

    # ========== PROMPT D: 최종 스키마 변환 (CSV) ==========
    async def transform_to_csv(self, records: list[dict], source_file: str = "카카오") -> str:
        """검증된 레코드 → Long Format CSV"""
        prompt = f"""카카오톡 파싱 데이터를 대시보드 업로드용 표준 스키마로 변환하세요.

## 목표 스키마 (Long Format CSV)
컬럼 순서:
survey_date, batch_no, source_file, carrier, contract_type, subscription_type,
price_tier, device_model, channel, hq_unit, dealer_code, distribution_type,
dealer_name, legal_dong_code, legal_dong_name, hq_name,
wholesale_price, weight, collected_at

## 변환 규칙
- source_file: "{source_file}_{{survey_date}}"
- channel: "카카오오픈채팅"
- collected_at: 현재 처리 시각 (ISO8601)
- price_tier: ≥50→"고가", <50→"저가"
- weight: 1
- 그 외 필드: null이면 공백("")

## 데이터
{json.dumps(records, ensure_ascii=False, indent=2)}

CSV 헤더 포함. UTF-8. 문자열은 큰따옴표로 감싸기.
"""
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            csv_text = response.content[0].text
            # CSV 마크다운 블록 제거
            if "```csv" in csv_text:
                csv_text = csv_text.split("```csv")[1].split("```")[0].strip()
            elif "```" in csv_text:
                csv_text = csv_text.split("```")[1].split("```")[0].strip()
            return csv_text
        except Exception as e:
            logger.error(f"CSV 변환 실패: {e}")
            return ""

    # ========== PROMPT E: 신규 단말 관리 ==========
    async def suggest_device_master(self, new_device_names: list[str]) -> list[dict]:
        """신규 탐지 단말명 → 마스터 테이블 업데이트안"""
        # 현재 마스터 단말 조회
        from sqlalchemy import select

        result = await self.db.execute(select(DeviceMeta).where(DeviceMeta.is_active == True))
        current_devices = result.scalars().all()
        current_names = [d.device_name for d in current_devices]

        prompt = f"""이동통신 단말기 표준명 마스터 관리자입니다.
아래 단말명들이 기존 마스터에 없는 신규 단말로 탐지되었습니다.

## 현재 마스터 단말 목록
{json.dumps(current_names, ensure_ascii=False)}

## 신규 탐지된 단말명 (원문)
{json.dumps(new_device_names, ensure_ascii=False)}

## 작업
1. 각 신규 단말명에 대해 표준명(standard_name) 제안
2. 제조사(manufacturer), 가격대(tier) 분류
3. 향후 파싱용 별칭(aliases) 목록 작성

## 출력 JSON
[
  {{
    "raw_name": "원문 단말명",
    "standard_name": "표준화된 단말명",
    "manufacturer": "Samsung|Apple|기타",
    "tier": "고가|저가",
    "aliases": ["별칭1", "별칭2"],
    "is_new": true,
    "note": "확인 필요 사항"
  }}
]

JSON 배열만 출력하세요.
"""
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            result = json.loads(response.content[0].text)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"신규 단말 제안 실패: {e}")
            return []

    # ========== 통합 파이프라인 ==========
    async def process_kakao_file(self, txt_content: str, source_name: str = "카카오") -> dict:
        """전체 파이프라인 통합 실행"""
        logger.info(f"카카오톡 파이프라인 시작: {source_name}")

        # STEP 1: 배치 파싱
        logger.info("STEP 1: 배치 파싱 중...")
        parsed_records = await self.parse_kakao_export_txt(txt_content)
        logger.info(f"파싱 완료: {len(parsed_records)}개 레코드")

        # STEP 2: 유효성 검증
        logger.info("STEP 2: 유효성 검증 중...")
        validation_result = await self.validate_records(parsed_records)
        clean_records = validation_result.get("clean_records", [])
        logger.info(
            f"검증 완료: {validation_result['summary']['valid_records']}/{validation_result['summary']['total_records']}"
        )

        # STEP 3: 신규 단말 처리
        new_devices = validation_result.get("new_devices_detected", [])
        device_suggestions = []
        if new_devices:
            logger.info(f"STEP 3: 신규 단말 {len(new_devices)}개 제안 중...")
            device_suggestions = await self.suggest_device_master(new_devices)

        # STEP 4: CSV 변환
        logger.info("STEP 4: CSV 변환 중...")
        csv_content = await self.transform_to_csv(clean_records, source_file=source_name)

        logger.info("카카오톡 파이프라인 완료")

        return {
            "status": "success",
            "parsed_count": len(parsed_records),
            "valid_count": validation_result["summary"]["valid_records"],
            "invalid_count": validation_result["summary"]["invalid_records"],
            "issues": validation_result["issues"],
            "new_devices": new_devices,
            "device_suggestions": device_suggestions,
            "csv_content": csv_content,
            "clean_records": clean_records,
        }

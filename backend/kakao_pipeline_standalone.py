#!/usr/bin/env python3
"""
카카오톡 도매단가 파이프라인 (스탠드얼론 버전)
- 데이터베이스 의존성 제거
- Claude API만 사용
- 독립적으로 실행 가능

사용법:
  python3 kakao_pipeline_standalone.py --file chat.txt --output result.csv
"""

import asyncio
import argparse
import json
import sys
from datetime import datetime
from typing import Optional
from pathlib import Path

import anthropic


class StandaloneKakaoPipeline:
    """DB 없는 스탠드얼론 파이프라인"""

    def __init__(self, api_key: Optional[str] = None):
        if not api_key:
            import os
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY 환경변수 필수")

        self.client = anthropic.AsyncAnthropic(api_key=api_key)

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
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            print("응답:", response.content[0].text[:500])
            return []
        except Exception as e:
            print(f"❌ 배치 파싱 실패: {e}")
            return []

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
            print(f"❌ 유효성 검증 실패: {e}")
            return {
                "summary": {"total_records": 0, "valid_records": 0, "invalid_records": 0, "issues_found": 0},
                "issues": [],
                "new_devices_detected": [],
                "clean_records": [],
            }

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

CSV 헤더 포함. UTF-8. 문자열은 큰따옴표로 감싸기. 마크다운 블록(```)은 제거.
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
            print(f"❌ CSV 변환 실패: {e}")
            return ""

    async def suggest_device_master(self, new_device_names: list[str]) -> list[dict]:
        """신규 탐지 단말명 → 마스터 테이블 업데이트안"""
        prompt = f"""이동통신 단말기 표준명 마스터 관리자입니다.
아래 단말명들이 기존 마스터에 없는 신규 단말로 탐지되었습니다.

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
            print(f"❌ 신규 단말 제안 실패: {e}")
            return []

    async def process_kakao_file(self, txt_content: str, source_name: str = "카카오") -> dict:
        """전체 파이프라인 통합 실행"""
        print("\n" + "=" * 60)
        print(f"🚀 카카오톡 파이프라인 시작")
        print("=" * 60)

        # STEP 1: 배치 파싱
        print("📝 STEP 1: 배치 파싱 중...")
        parsed_records = await self.parse_kakao_export_txt(txt_content)
        print(f"   ✅ {len(parsed_records)}개 레코드 파싱됨")

        if not parsed_records:
            print("   ⚠️  파싱된 데이터가 없습니다")
            return {
                "status": "error",
                "parsed_count": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "csv_content": "",
            }

        # STEP 2: 유효성 검증
        print("🔍 STEP 2: 유효성 검증 중...")
        validation_result = await self.validate_records(parsed_records)
        clean_records = validation_result.get("clean_records", [])
        summary = validation_result.get("summary", {})
        print(f"   ✅ {summary.get('valid_records', 0)}/{summary.get('total_records', 0)} 유효")

        # STEP 3: 신규 단말 처리
        new_devices = validation_result.get("new_devices_detected", [])
        device_suggestions = []
        if new_devices:
            print(f"🆕 STEP 3: 신규 단말 {len(new_devices)}개 제안 중...")
            device_suggestions = await self.suggest_device_master(new_devices)
            for sugg in device_suggestions:
                print(f"   - {sugg['raw_name']} → {sugg['standard_name']}")

        # STEP 4: CSV 변환
        if clean_records:
            print("📊 STEP 4: CSV 변환 중...")
            csv_content = await self.transform_to_csv(clean_records, source_file=source_name)
            print(f"   ✅ CSV 생성 완료")
        else:
            print("   ⚠️  유효한 레코드가 없어 CSV 생성 스킵")
            csv_content = ""

        print("\n" + "=" * 60)
        print(f"✨ 파이프라인 완료")
        print("=" * 60)

        return {
            "status": "success",
            "parsed_count": len(parsed_records),
            "valid_count": summary.get("valid_records", 0),
            "invalid_count": summary.get("invalid_records", 0),
            "issues": validation_result.get("issues", []),
            "new_devices": new_devices,
            "device_suggestions": device_suggestions,
            "csv_content": csv_content,
            "clean_records": clean_records,
        }


async def main():
    parser = argparse.ArgumentParser(
        description="카카오톡 도매단가 파이프라인 (스탠드얼론)",
        epilog="""
예시:
  python3 kakao_pipeline_standalone.py --file chat.txt --output result.csv
  ANTHROPIC_API_KEY=sk-... python3 kakao_pipeline_standalone.py --file chat.txt
        """,
    )

    parser.add_argument("--file", "-f", required=True, help="카카오톡 .txt 파일")
    parser.add_argument("--output", "-o", default="output.csv", help="출력 CSV 파일 경로")
    parser.add_argument("--source", default="카카오", help="소스명 (기본: 카카오)")
    parser.add_argument("--api-key", help="ANTHROPIC_API_KEY (환경변수로도 가능)")

    args = parser.parse_args()

    # 파일 확인
    if not Path(args.file).exists():
        print(f"❌ 파일을 찾을 수 없습니다: {args.file}")
        sys.exit(1)

    # 파일 읽기
    try:
        with open(args.file, "r", encoding="utf-8") as f:
            txt_content = f.read()
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")
        sys.exit(1)

    # 파이프라인 실행
    try:
        service = StandaloneKakaoPipeline(api_key=args.api_key)
        result = await service.process_kakao_file(txt_content, args.source)

        # 결과 출력
        print(f"\n📊 결과:")
        print(f"  파싱: {result['parsed_count']}개")
        print(f"  유효: {result['valid_count']}개")
        print(f"  오류: {result['invalid_count']}개")

        if result["issues"]:
            print(f"\n⚠️  문제 사항 ({len(result['issues'])}개):")
            for issue in result["issues"][:3]:
                print(f"  - [{issue['issue_type']}] {issue['suggestion']}")
            if len(result["issues"]) > 3:
                print(f"  ... 외 {len(result['issues']) - 3}개")

        if result["new_devices"]:
            print(f"\n🆕 신규 단말:")
            for device in result["new_devices"]:
                print(f"  - {device}")

        # CSV 저장
        if result["csv_content"]:
            try:
                with open(args.output, "w", encoding="utf-8") as f:
                    f.write(result["csv_content"])
                print(f"\n✅ CSV 저장됨: {args.output}")

                # CSV 미리보기
                lines = result["csv_content"].split("\n")
                print(f"\n📄 CSV 미리보기:")
                print("  " + lines[0][:80] + ("..." if len(lines[0]) > 80 else ""))
                for line in lines[1:3]:
                    print("  " + line[:80] + ("..." if len(line) > 80 else ""))
                if len(lines) > 3:
                    print(f"  ... 외 {len(lines) - 3}행")

                sys.exit(0)
            except Exception as e:
                print(f"❌ CSV 저장 실패: {e}")
                sys.exit(1)
        else:
            print("❌ CSV 변환 실패")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n⏸️  사용자 중단")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

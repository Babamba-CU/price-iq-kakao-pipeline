#!/usr/bin/env python3
"""
카카오톡 도매단가 파이프라인 - DEMO 버전 (Mock 데이터)
API 크레딧 없이도 파이프라인 구조를 확인할 수 있습니다.
"""

import json
import csv
from datetime import datetime
from pathlib import Path


class DemoKakaoPipeline:
    """Mock 데이터로 파이프라인 구조 시연"""

    @staticmethod
    def demo_parse_kakao_export_txt(txt_content: str) -> list[dict]:
        """DEMO: 카카오톡 파싱 (Mock)"""
        print("  [PROMPT B] 배치 파싱 중...")

        # Mock 파싱 결과
        return [
            {
                "survey_date": "20240731",
                "batch_no": "1차",
                "carrier": "SKT",
                "contract_type": "공시",
                "subscription_type": "010",
                "device_model": "IPHONE 15 PRO",
                "wholesale_price": 30,
                "is_valid": True,
                "dealer_name": "홍길동",
                "channel": "카카오오픈채팅",
                "raw_text": "SKT 아이폰15프로 공시 기변 30만원"
            },
            {
                "survey_date": "20240731",
                "batch_no": "1차",
                "carrier": "KT",
                "contract_type": "선약",
                "subscription_type": "010",
                "device_model": "갤럭시 S24",
                "wholesale_price": 28,
                "is_valid": True,
                "dealer_name": "이순신",
                "channel": "카카오오픈채팅",
                "raw_text": "KT 갤럭시S24 선약 010 28만"
            },
            {
                "survey_date": "20240731",
                "batch_no": "1차",
                "carrier": "LGU+",
                "contract_type": "공시",
                "subscription_type": "MNP",
                "device_model": "갤럭시 Z플립6",
                "wholesale_price": 32,
                "is_valid": True,
                "dealer_name": "김유신",
                "channel": "카카오오픈채팅",
                "raw_text": "LGU+ 플립6 공시 MNP 32만원"
            },
            {
                "survey_date": "20240731",
                "batch_no": "오후",
                "carrier": "SKT",
                "contract_type": "공시",
                "subscription_type": "기변",
                "device_model": "갤럭시 Z폴드6",
                "wholesale_price": 42,
                "is_valid": True,
                "dealer_name": "을지문덕",
                "channel": "카카오오픈채팅",
                "raw_text": "SKT 폴드6 공시 기변 42만원"
            },
            {
                "survey_date": "20240731",
                "batch_no": "오후",
                "carrier": "KT",
                "contract_type": None,
                "subscription_type": "010",
                "device_model": "IPHONE 15",
                "wholesale_price": 25,
                "is_valid": True,
                "dealer_name": "정약용",
                "channel": "카카오오픈채팅",
                "raw_text": "KT 아이폰15 010 25만"
            },
            {
                "survey_date": "20240731",
                "batch_no": "저녁",
                "carrier": None,
                "contract_type": None,
                "subscription_type": None,
                "device_model": None,
                "wholesale_price": None,
                "is_valid": False,
                "dealer_name": "이황",
                "channel": "카카오오픈채팅",
                "raw_text": "요즘 단가 뭐야?"
            },
            {
                "survey_date": "20240731",
                "batch_no": "저녁",
                "carrier": "LGU+",
                "contract_type": None,
                "subscription_type": None,
                "device_model": "갤럭시 A35",
                "wholesale_price": 18,
                "is_valid": False,
                "dealer_name": "장보고",
                "channel": "카카오오픈채팅",
                "raw_text": "LGU+ 갤A35 18만 (이상값)"
            },
        ]

    @staticmethod
    def demo_validate_records(records: list[dict]) -> dict:
        """DEMO: 유효성 검증 (Mock)"""
        print("  [PROMPT C] 유효성 검증 중...")

        valid_records = [r for r in records if r["is_valid"] and r["carrier"]]

        return {
            "summary": {
                "total_records": len(records),
                "valid_records": len(valid_records),
                "invalid_records": len(records) - len(valid_records),
                "issues_found": 3
            },
            "issues": [
                {
                    "row_index": 5,
                    "issue_type": "missing_field",
                    "severity": "error",
                    "field": "carrier",
                    "current_value": None,
                    "suggestion": "통신사 정보 필수",
                    "raw_text": "요즘 단가 뭐야?"
                },
                {
                    "row_index": 6,
                    "issue_type": "outlier",
                    "severity": "warning",
                    "field": "wholesale_price",
                    "current_value": 18,
                    "suggestion": "20만원 이상 권장 (18은 이상값)",
                    "raw_text": "LGU+ 갤A35 18만"
                },
                {
                    "row_index": 1,
                    "issue_type": "new_device",
                    "severity": "info",
                    "field": "device_model",
                    "current_value": "갤럭시 Z플립6",
                    "suggestion": "신규 단말로 제안 필요",
                    "raw_text": "LGU+ 플립6 공시 MNP 32만원"
                }
            ],
            "new_devices_detected": ["갤럭시 Z플립6", "갤럭시 Z폴드6"],
            "clean_records": valid_records
        }

    @staticmethod
    def demo_suggest_device_master(new_device_names: list[str]) -> list[dict]:
        """DEMO: 신규 단말 제안 (Mock)"""
        print("  [PROMPT E] 신규 단말 제안 중...")

        suggestions_map = {
            "갤럭시 Z플립6": {
                "standard_name": "갤럭시 Z플립6",
                "manufacturer": "Samsung",
                "tier": "고가",
                "aliases": ["플립6", "Z플립6", "플립 6"]
            },
            "갤럭시 Z폴드6": {
                "standard_name": "갤럭시 Z폴드6",
                "manufacturer": "Samsung",
                "tier": "고가",
                "aliases": ["폴드6", "Z폴드6", "폴드 6"]
            }
        }

        result = []
        for device_name in new_device_names:
            if device_name in suggestions_map:
                result.append({
                    "raw_name": device_name,
                    "is_new": True,
                    "note": "2024년 신규 기종",
                    **suggestions_map[device_name]
                })

        return result

    @staticmethod
    def demo_transform_to_csv(records: list[dict], source_file: str = "카카오") -> str:
        """DEMO: CSV 변환 (Mock)"""
        print("  [PROMPT D] CSV 변환 중...")

        now = datetime.now().isoformat()
        headers = [
            "survey_date", "batch_no", "source_file", "carrier", "contract_type",
            "subscription_type", "price_tier", "device_model", "channel", "hq_unit",
            "dealer_code", "distribution_type", "dealer_name", "legal_dong_code",
            "legal_dong_name", "hq_name", "wholesale_price", "weight", "collected_at"
        ]

        rows = []
        for rec in records:
            price = rec.get("wholesale_price") or 0
            tier = "고가" if price >= 50 else "저가"

            rows.append({
                "survey_date": rec.get("survey_date", ""),
                "batch_no": rec.get("batch_no", ""),
                "source_file": f"{source_file}_{rec.get('survey_date', '')}",
                "carrier": rec.get("carrier", ""),
                "contract_type": rec.get("contract_type", ""),
                "subscription_type": rec.get("subscription_type", ""),
                "price_tier": tier,
                "device_model": rec.get("device_model", ""),
                "channel": rec.get("channel", ""),
                "hq_unit": "",
                "dealer_code": "",
                "distribution_type": "",
                "dealer_name": rec.get("dealer_name", ""),
                "legal_dong_code": "",
                "legal_dong_name": "",
                "hq_name": "",
                "wholesale_price": price,
                "weight": 1,
                "collected_at": now
            })

        # CSV 생성
        output = []
        output.append(",".join(headers))

        for row in rows:
            values = []
            for header in headers:
                val = row.get(header, "")
                if isinstance(val, str):
                    values.append(f'"{val}"')
                else:
                    values.append(str(val))
            output.append(",".join(values))

        return "\n".join(output)

    async def process_kakao_file(self, txt_content: str, source_name: str = "카카오") -> dict:
        """전체 파이프라인 (Mock)"""
        print("\n" + "=" * 60)
        print("🚀 카카오톡 파이프라인 (DEMO - Mock 데이터)")
        print("=" * 60)

        # STEP 1: 배치 파싱
        print("📝 STEP 1: 배치 파싱")
        parsed_records = self.demo_parse_kakao_export_txt(txt_content)
        print(f"   ✅ {len(parsed_records)}개 레코드 파싱됨")

        # STEP 2: 유효성 검증
        print("🔍 STEP 2: 유효성 검증")
        validation_result = self.demo_validate_records(parsed_records)
        clean_records = validation_result.get("clean_records", [])
        summary = validation_result.get("summary", {})
        print(f"   ✅ {summary.get('valid_records', 0)}/{summary.get('total_records', 0)} 유효")

        # STEP 3: 신규 단말
        new_devices = validation_result.get("new_devices_detected", [])
        device_suggestions = []
        if new_devices:
            print(f"🆕 STEP 3: 신규 단말 {len(new_devices)}개 제안")
            device_suggestions = self.demo_suggest_device_master(new_devices)
            for sugg in device_suggestions:
                print(f"   - {sugg['raw_name']} → {sugg['standard_name']}")

        # STEP 4: CSV 변환
        print("📊 STEP 4: CSV 변환")
        csv_content = self.demo_transform_to_csv(clean_records, source_file=source_name)
        print(f"   ✅ CSV 생성 완료")

        print("\n" + "=" * 60)
        print("✨ 파이프라인 완료")
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
    import asyncio

    # 파일 읽기
    try:
        with open("chat.txt", "r", encoding="utf-8") as f:
            txt_content = f.read()
    except FileNotFoundError:
        txt_content = "SKT 아이폰15프로 30만\nKT 갤럭시S24 28만\nLGU+ 플립6 32만"

    # 파이프라인 실행
    service = DemoKakaoPipeline()
    result = await service.process_kakao_file(txt_content, "카카오_DEMO")

    # 결과 출력
    print(f"\n📊 결과 요약:")
    print(f"  파싱: {result['parsed_count']}개")
    print(f"  유효: {result['valid_count']}개")
    print(f"  오류: {result['invalid_count']}개")

    if result["issues"]:
        print(f"\n⚠️  문제 사항 ({len(result['issues'])}개):")
        for issue in result["issues"][:3]:
            print(f"  - [{issue['issue_type']}] {issue['suggestion']}")

    if result["new_devices"]:
        print(f"\n🆕 신규 단말:")
        for device in result["new_devices"]:
            print(f"  - {device}")

    # CSV 저장
    if result["csv_content"]:
        with open("result.csv", "w", encoding="utf-8") as f:
            f.write(result["csv_content"])

        print(f"\n✅ CSV 저장됨: result.csv")

        # CSV 미리보기
        lines = result["csv_content"].split("\n")
        print(f"\n📄 CSV 미리보기 ({len(lines)-1}행):")
        print("  " + lines[0][:90] + "...")
        for line in lines[1:4]:
            print("  " + line[:90] + "...")

        return True

    return False


if __name__ == "__main__":
    import asyncio
    success = asyncio.run(main())
    exit(0 if success else 1)

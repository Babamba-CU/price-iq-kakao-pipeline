#!/usr/bin/env python3
"""
카카오톡 도매단가 파이프라인 CLI

사용법:
  python cli_kakao_pipeline.py --file input.txt --output output.csv --source "카카오"
  python cli_kakao_pipeline.py --text "메시지 내용..." --output output.csv
"""

import asyncio
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

from database import AsyncSessionLocal
from services.kakao_pipeline import KakaoPipelineService


async def process_file(file_path: str, output_path: str, source_name: str = "카카오"):
    """파일 처리"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            txt_content = f.read()
    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
        return False
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")
        return False

    async with AsyncSessionLocal() as db:
        service = KakaoPipelineService(db)
        result = await service.process_kakao_file(txt_content, source_name)

    print("\n" + "=" * 60)
    print(f"📊 카카오톡 파이프라인 처리 완료")
    print("=" * 60)
    print(f"✅ 파싱됨: {result['parsed_count']}")
    print(f"✅ 유효함: {result['valid_count']}")
    print(f"❌ 오류: {result['invalid_count']}")

    if result["issues"]:
        print(f"\n⚠️  문제 사항 ({len(result['issues'])}개):")
        for issue in result["issues"][:5]:  # 처음 5개만 표시
            print(
                f"  - [{issue['issue_type']}] "
                f"{issue['field']}: {issue['current_value']} "
                f"→ {issue['suggestion']}"
            )
        if len(result["issues"]) > 5:
            print(f"  ... 외 {len(result['issues']) - 5}개")

    if result["new_devices"]:
        print(f"\n🆕 신규 단말 {len(result['new_devices'])}개:")
        for device in result["new_devices"]:
            print(f"  - {device}")
        if result["device_suggestions"]:
            print("\n💡 제안된 표준명:")
            for sugg in result["device_suggestions"]:
                print(
                    f"  - {sugg['raw_name']} → {sugg['standard_name']} "
                    f"({sugg['manufacturer']}/{sugg['tier']})"
                )

    # CSV 저장
    if result["csv_content"]:
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result["csv_content"])
            print(f"\n📁 CSV 저장됨: {output_path}")
            return True
        except Exception as e:
            print(f"❌ CSV 저장 실패: {e}")
            return False
    else:
        print("❌ CSV 변환 실패")
        return False


async def process_text(text: str, output_path: str, source_name: str = "카카오"):
    """텍스트 직접 처리"""
    async with AsyncSessionLocal() as db:
        service = KakaoPipelineService(db)
        result = await service.process_kakao_file(text, source_name)

    print("\n" + "=" * 60)
    print(f"📊 카카오톡 파이프라인 처리 완료 (텍스트 입력)")
    print("=" * 60)
    print(f"✅ 파싱됨: {result['parsed_count']}")
    print(f"✅ 유효함: {result['valid_count']}")
    print(f"❌ 오류: {result['invalid_count']}")

    if result["csv_content"]:
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result["csv_content"])
            print(f"\n📁 CSV 저장됨: {output_path}")
            return True
        except Exception as e:
            print(f"❌ CSV 저장 실패: {e}")
            return False
    else:
        print("❌ CSV 변환 실패")
        return False


async def parse_message(message: str, message_date: str = None, sender: str = None):
    """단일 메시지 파싱"""
    if not message_date:
        message_date = datetime.now().strftime("%Y-%m-%d")

    async with AsyncSessionLocal() as db:
        service = KakaoPipelineService(db)
        records = await service.parse_single_message(message, message_date, sender)

    print("\n" + "=" * 60)
    print(f"📝 메시지 파싱 결과")
    print("=" * 60)
    print(json.dumps(records, ensure_ascii=False, indent=2))
    return records


async def validate_only(input_file: str):
    """유효성 검증만"""
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            if input_file.endswith(".json"):
                records = json.load(f)
            else:
                print("❌ JSON 파일만 지원합니다")
                return False
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")
        return False

    async with AsyncSessionLocal() as db:
        service = KakaoPipelineService(db)
        result = await service.validate_records(records)

    print("\n" + "=" * 60)
    print(f"🔍 유효성 검증 결과")
    print("=" * 60)
    print(f"전체: {result['summary']['total_records']}")
    print(f"유효: {result['summary']['valid_records']}")
    print(f"오류: {result['summary']['invalid_records']}")
    print(f"문제: {result['summary']['issues_found']}")

    if result["issues"]:
        print(f"\n⚠️  문제 사항:")
        for issue in result["issues"]:
            print(f"  - [{issue['issue_type']}] {issue['suggestion']}")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="카카오톡 도매단가 파이프라인 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # .txt 파일 처리
  python cli_kakao_pipeline.py --file chat.txt --output data.csv

  # 텍스트 직접 입력
  python cli_kakao_pipeline.py --text "SKT 아이폰15 30만" --output data.csv

  # 단일 메시지 파싱
  python cli_kakao_pipeline.py --message "KT 갤럭시S24 28만" --date 2024-07-31 --sender 홍길동

  # 검증만 수행
  python cli_kakao_pipeline.py --validate parsed.json
        """,
    )

    parser.add_argument("--file", "-f", help="카카오톡 내보내기 .txt 파일")
    parser.add_argument("--text", "-t", help="직접 입력할 텍스트 (여러 줄 가능)")
    parser.add_argument("--message", "-m", help="단일 메시지")
    parser.add_argument("--date", "-d", help="메시지 날짜 (YYYY-MM-DD)", default=None)
    parser.add_argument("--sender", "-s", help="발신자명", default=None)
    parser.add_argument("--output", "-o", help="출력 CSV 파일 경로", default="output.csv")
    parser.add_argument("--validate", "-v", help="유효성 검증만 (JSON 파일)")
    parser.add_argument("--source", help="소스명 (기본: 카카오)", default="카카오")

    args = parser.parse_args()

    if args.validate:
        success = asyncio.run(validate_only(args.validate))
    elif args.file:
        success = asyncio.run(process_file(args.file, args.output, args.source))
    elif args.text:
        success = asyncio.run(process_text(args.text, args.output, args.source))
    elif args.message:
        asyncio.run(parse_message(args.message, args.date, args.sender))
        success = True
    else:
        parser.print_help()
        success = False

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

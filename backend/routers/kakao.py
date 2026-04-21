import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth import get_current_user
from services.kakao_pipeline import KakaoPipelineService
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/kakao", tags=["kakao"])


# ========== 단일 메시지 파싱 ==========
@router.post("/parse-message")
async def parse_single_message(
    message_text: str,
    message_date: str,
    sender_name: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """단일 카카오톡 메시지 파싱 (PROMPT A)"""
    service = KakaoPipelineService(db)
    records = await service.parse_single_message(message_text, message_date, sender_name)

    return {
        "status": "success",
        "records": records,
        "count": len(records),
    }


# ========== .txt 파일 배치 파싱 ==========
@router.post("/parse-file")
async def parse_kakao_file(
    file: UploadFile = File(...),
    source_name: str = "카카오",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """카카오톡 내보내기 .txt 파일 전체 처리 (PROMPT A~D 통합)"""
    try:
        content = await file.read()
        txt_content = content.decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파일 읽기 실패: {str(e)}")

    service = KakaoPipelineService(db)
    result = await service.process_kakao_file(txt_content, source_name)

    return result


# ========== 텍스트 직접 입력 (배치) ==========
@router.post("/parse-text")
async def parse_text_batch(
    text_content: str,
    source_name: str = "카카오",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """텍스트 직접 입력으로 배치 파싱"""
    service = KakaoPipelineService(db)
    result = await service.process_kakao_file(text_content, source_name)

    return result


# ========== 유효성 검증만 ==========
@router.post("/validate")
async def validate_records(
    records: list[dict],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """파싱된 레코드 유효성 검증 (PROMPT C)"""
    service = KakaoPipelineService(db)
    validation_result = await service.validate_records(records)

    return validation_result


# ========== CSV 변환만 ==========
@router.post("/to-csv")
async def records_to_csv(
    records: list[dict],
    source_name: str = "카카오",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """검증된 레코드 → Long Format CSV (PROMPT D)"""
    service = KakaoPipelineService(db)
    csv_content = await service.transform_to_csv(records, source_file=source_name)

    if not csv_content:
        raise HTTPException(status_code=500, detail="CSV 변환 실패")

    return {
        "status": "success",
        "csv_content": csv_content,
    }


# ========== 신규 단말 제안 ==========
@router.post("/suggest-devices")
async def suggest_new_devices(
    device_names: list[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """신규 단말명 → 마스터 테이블 제안 (PROMPT E)"""
    if not device_names:
        raise HTTPException(status_code=400, detail="device_names는 필수입니다")

    service = KakaoPipelineService(db)
    suggestions = await service.suggest_device_master(device_names)

    return {
        "status": "success",
        "suggestions": suggestions,
        "count": len(suggestions),
    }

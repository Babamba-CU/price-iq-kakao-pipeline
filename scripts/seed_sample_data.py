"""샘플 집계 데이터 생성 스크립트 (시각화 데모용)."""
import asyncio
import random
from datetime import date
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from database import AsyncSessionLocal
from models.price_aggregated import PriceAggregated
from models.device_meta import DeviceMeta
from sqlalchemy import select, delete

random.seed(42)

# ── 지역 데이터 ──────────────────────────────────────────────────────────────

# SKT 단가 우위/열세 계수 (1.0 기준, 높을수록 SKT 우위)
SIDO_SKT_FACTOR = {
    "서울특별시":       1.045,
    "경기도":           1.038,
    "강원특별자치도":   1.022,
    "충청남도":         1.018,
    "충청북도":         1.012,
    "세종특별자치시":   1.003,
    "인천광역시":       0.998,
    "대전광역시":       0.995,
    "제주특별자치도":   0.990,
    "광주광역시":       0.982,
    "전북특별자치도":   0.975,
    "전라남도":         0.968,
    "울산광역시":       0.962,
    "경상북도":         0.955,
    "대구광역시":       0.948,
    "경상남도":         0.938,
    "부산광역시":       0.928,
}

SIGUNGU_BY_SIDO = {
    "서울특별시": [
        "강남구","서초구","송파구","마포구","강서구","노원구",
        "성북구","은평구","강동구","동작구","영등포구","용산구",
        "종로구","중구","광진구","성동구","중랑구","도봉구",
    ],
    "부산광역시": [
        "해운대구","부산진구","동래구","남구","북구","사하구",
        "금정구","연제구","수영구","사상구","기장군",
    ],
    "인천광역시": [
        "미추홀구","연수구","남동구","부평구","계양구","서구","강화군",
    ],
    "경기도": [
        "수원시","성남시","용인시","고양시","화성시","안산시",
        "안양시","남양주시","평택시","의정부시","파주시","시흥시",
    ],
    "강원특별자치도": ["춘천시","원주시","강릉시","동해시","속초시","횡성군"],
    "충청남도": ["천안시","아산시","논산시","공주시","서산시","당진시"],
    "충청북도": ["청주시","충주시","제천시","음성군","진천군"],
    "세종특별자치시": ["세종시"],
    "대전광역시": ["서구","유성구","중구","동구","대덕구"],
    "경상북도": ["포항시","경주시","구미시","안동시","경산시","칠곡군"],
    "대구광역시": ["수성구","달서구","북구","동구","중구","달성군"],
    "울산광역시": ["남구","북구","중구","동구","울주군"],
    "전북특별자치도": ["전주시","익산시","군산시","정읍시","남원시"],
    "광주광역시": ["북구","광산구","서구","남구","동구"],
    "전라남도": ["여수시","순천시","목포시","광양시","나주시","무안군"],
    "경상남도": ["창원시","진주시","김해시","통영시","거제시","양산시"],
    "제주특별자치도": ["제주시","서귀포시"],
}

DONG_BY_SIGUNGU = {
    "강남구":  ["역삼동","삼성동","논현동","청담동","대치동","개포동","도곡동"],
    "서초구":  ["서초동","방배동","반포동","양재동","잠원동"],
    "송파구":  ["잠실동","방이동","풍납동","거여동","마천동","오금동"],
    "해운대구":["우동","중동","좌동","재송동","반여동","송정동"],
    "수원시":  ["영통동","권선동","팔달동","장안동","매탄동","망포동"],
    "성남시":  ["분당구","수정구","중원구"],
    "창원시":  ["성산구","의창구","마산합포구","마산회원구","진해구"],
}

CARRIERS = ["SKT", "KT", "LGU"]
# KT baseline=1.0, LGU slightly below, SKT varies by region
CARRIER_BASE = {"SKT": 1.0, "KT": 1.0, "LGU": 0.985}
BASE_RATIO = 0.47  # 출고가 대비 도매 단가 비율


def make_row(agg_date, agg_round, level, region_key, device_id, carrier, avg_price, sample_count):
    noise = random.uniform(0.97, 1.03)
    avg = int(avg_price * noise)
    top30 = int(avg * random.uniform(1.10, 1.16))
    max_p = int(avg * random.uniform(1.22, 1.32))
    return PriceAggregated(
        agg_date=agg_date, agg_round=agg_round,
        agg_level=level, region_key=region_key,
        carrier=carrier, device_id=device_id,
        sub_type="MNP", support_type="선약",
        plan_condition=None,
        sample_count=sample_count,
        avg_price=avg, top30_price=top30, max_price=max_p,
    )


async def seed():
    async with AsyncSessionLocal() as db:
        # 기존 샘플 데이터 삭제
        await db.execute(delete(PriceAggregated))
        await db.commit()
        print("기존 집계 데이터 삭제 완료")

        result = await db.execute(select(DeviceMeta).where(DeviceMeta.is_active == True))
        devices = result.scalars().all()
        if not devices:
            print("단말 데이터 없음. seed_devices.py 먼저 실행하세요.")
            return

        today = date.today()
        agg_round = 1
        rows = []

        for device in devices:
            base = device.release_price * BASE_RATIO

            # 전국 레벨
            for carrier in CARRIERS:
                avg = base * CARRIER_BASE[carrier]
                rows.append(make_row(today, agg_round, "national", None,
                                     device.id, carrier, avg, random.randint(50, 150)))

            # 시도 레벨
            for sido, skt_factor in SIDO_SKT_FACTOR.items():
                for carrier in CARRIERS:
                    if carrier == "SKT":
                        avg = base * skt_factor
                    else:
                        avg = base * CARRIER_BASE[carrier] * random.uniform(0.98, 1.02)
                    rows.append(make_row(today, agg_round, "sido", sido,
                                         device.id, carrier, avg, random.randint(15, 60)))

            # 시군구 레벨
            for sido, sigugngu_list in SIGUNGU_BY_SIDO.items():
                sido_skt = SIDO_SKT_FACTOR[sido]
                for sigungu in sigugngu_list:
                    local_skt = sido_skt + random.uniform(-0.025, 0.025)
                    for carrier in CARRIERS:
                        if carrier == "SKT":
                            avg = base * local_skt
                        else:
                            avg = base * CARRIER_BASE[carrier] * random.uniform(0.97, 1.03)
                        rows.append(make_row(today, agg_round, "sigungu", sigungu,
                                             device.id, carrier, avg, random.randint(5, 30)))

            # 동 레벨
            for sigungu, dong_list in DONG_BY_SIGUNGU.items():
                # 부모 시도의 skt factor 찾기
                parent_skt = next(
                    (f for s, sl in SIGUNGU_BY_SIDO.items() if sigungu in sl
                     for k, f in [(s, SIDO_SKT_FACTOR[s])]), 1.0
                )
                for dong in dong_list:
                    local_skt = parent_skt + random.uniform(-0.035, 0.035)
                    for carrier in CARRIERS:
                        if carrier == "SKT":
                            avg = base * local_skt
                        else:
                            avg = base * CARRIER_BASE[carrier] * random.uniform(0.96, 1.04)
                        rows.append(make_row(today, agg_round, "dong", dong,
                                             device.id, carrier, avg, random.randint(3, 15)))

        # 배치 insert
        BATCH = 500
        for i in range(0, len(rows), BATCH):
            db.add_all(rows[i:i + BATCH])
            await db.flush()

        await db.commit()
        print(f"샘플 데이터 생성 완료: {len(rows)}건")
        print(f"  - 단말: {len(devices)}개")
        print(f"  - 시도: {len(SIDO_SKT_FACTOR)}개")
        print(f"  - 시군구: {sum(len(v) for v in SIGUNGU_BY_SIDO.values())}개")
        print(f"  - 동: {sum(len(v) for v in DONG_BY_SIGUNGU.values())}개")


if __name__ == "__main__":
    asyncio.run(seed())

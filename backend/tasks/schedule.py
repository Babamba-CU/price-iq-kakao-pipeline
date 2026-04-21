from celery import Celery
from celery.schedules import crontab

from config import settings

celery_app = Celery("priceiq", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.timezone = "Asia/Seoul"
celery_app.conf.beat_schedule = {
    "aggregate-round1": {
        "task": "tasks.schedule.aggregate_task",
        "schedule": crontab(hour=12, minute=0),
        "args": (1,),
    },
    "aggregate-round2": {
        "task": "tasks.schedule.aggregate_task",
        "schedule": crontab(hour=17, minute=0),
        "args": (2,),
    },
}


@celery_app.task(name="tasks.schedule.aggregate_task")
def aggregate_task(agg_round: int) -> None:
    import asyncio
    from datetime import date
    from database import AsyncSessionLocal
    from services.aggregator import run_aggregation
    from services.alert import check_alerts

    async def _run():
        async with AsyncSessionLocal() as db:
            today = date.today()
            await run_aggregation(db, today, agg_round)
            alerts = await check_alerts(db, today, agg_round)
            if alerts:
                import logging
                logging.getLogger(__name__).info(f"알림 {len(alerts)}건 발생")

    asyncio.run(_run())

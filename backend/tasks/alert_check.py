from tasks.schedule import celery_app


@celery_app.task(name="tasks.alert_check.run_alert_check")
def run_alert_check(agg_date: str, agg_round: int) -> list:
    import asyncio
    from datetime import date
    from database import AsyncSessionLocal
    from services.alert import check_alerts

    async def _run():
        async with AsyncSessionLocal() as db:
            d = date.fromisoformat(agg_date)
            return await check_alerts(db, d, agg_round)

    return asyncio.run(_run())

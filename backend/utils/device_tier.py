def get_tier(release_price: int) -> str:
    if release_price >= 1500000:
        return "premium"
    elif release_price >= 900000:
        return "high"
    elif release_price >= 500000:
        return "mid"
    return "low"


TIER_LABELS: dict[str, str] = {
    "premium": "프리미엄",
    "high": "고가",
    "mid": "중가",
    "low": "저가",
}

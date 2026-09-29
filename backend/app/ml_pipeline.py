from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from typing import Any

from .jobs import baseline_score


def build_feature_row(event: Mapping[str, Any]) -> dict[str, float]:
    """Build stable chronological features from one event without leaking future labels."""
    return {
        "velocity": float(event.get("velocity", 0)),
        "telemetry_anomaly": float(event.get("telemetry_anomaly", 0)),
        "amount": float(event.get("amount", 0)),
        "hour": float(event.get("hour", 0)),
        "account_age_days": float(event.get("account_age_days", 0)),
    }


def chronological_feature_rows(events: Iterable[Mapping[str, Any]]) -> list[dict[str, float]]:
    return [build_feature_row(event) for event in sorted(events, key=lambda item: str(item.get("timestamp", "")))]


def train_baseline(rows: Iterable[Mapping[str, Any]]) -> dict[str, Any]:
    rows_list = list(rows)
    return {"model": "baseline-v1", "rows": len(rows_list), "predict": baseline_score}


def train_lgbm(rows: Any, labels: Any, **kwargs: Any) -> Any:
    try:
        import lightgbm as lgb
    except ImportError:
        return train_baseline(rows)
    return lgb.LGBMClassifier(**kwargs).fit(rows, labels)


def calibrate_scores(scores: Iterable[float], labels: Iterable[int], method: str = "temperature") -> dict[str, Any]:
    score_values = [min(max(float(score), 1e-6), 1 - 1e-6) for score in scores]
    label_values = [int(label) for label in labels]
    if not score_values:
        return {"method": "identity", "temperature": 1.0}
    if method == "temperature":
        positives = sum(label_values) / max(len(label_values), 1)
        return {"method": "temperature", "temperature": 1.0, "base_rate": positives}
    try:
        from sklearn.isotonic import IsotonicRegression
        return {"method": "isotonic", "model": IsotonicRegression(out_of_bounds="clip").fit(score_values, label_values)}
    except ImportError:
        return {"method": "identity", "temperature": 1.0}


def _ndcg(scores: list[float], labels: list[int], k: int) -> float:
    order = sorted(range(len(scores)), key=lambda index: scores[index], reverse=True)[:k]
    dcg = sum((2 ** labels[index] - 1) / math.log2(position + 2) for position, index in enumerate(order))
    ideal = sorted(labels, reverse=True)[:k]
    idcg = sum((2 ** label - 1) / math.log2(position + 2) for position, label in enumerate(ideal))
    return dcg / idcg if idcg else 0.0


def evaluate(scores: Iterable[float], labels: Iterable[int], top_k: int = 40) -> dict[str, float]:
    score_values = list(map(float, scores))
    label_values = list(map(int, labels))
    if not score_values:
        return {"recall_at_40": 0.0, "top_k": 0.0, "ndcg": 0.0, "brier": 0.0}
    order = sorted(range(len(score_values)), key=lambda index: score_values[index], reverse=True)
    selected = order[:top_k]
    positives = sum(label_values)
    recall = sum(label_values[index] for index in selected) / positives if positives else 0.0
    brier = sum((score_values[index] - label_values[index]) ** 2 for index in range(len(score_values))) / len(score_values)
    return {"recall_at_40": recall, "top_k": float(len(selected)), "ndcg": _ndcg(score_values, label_values, top_k), "brier": brier}


def explain_prediction(model: Any, row: Any, feature_names: list[str] | None = None) -> dict[str, Any]:
    try:
        import shap
        values = shap.TreeExplainer(model).shap_values(row)
        return {"adapter": "shap", "values": values.tolist() if hasattr(values, "tolist") else values, "features": feature_names or []}
    except (ImportError, AttributeError, TypeError, ValueError):
        values = row if isinstance(row, Mapping) else {}
        return {"adapter": "baseline", "values": dict(values), "features": feature_names or list(values)}

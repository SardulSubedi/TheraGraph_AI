from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


class SupabaseError(Exception):
    """Raised when a Supabase operation fails; routers map to HTTP errors."""


def _get_client() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise SupabaseError("Supabase is not configured (SUPABASE_URL / SUPABASE_KEY missing)")
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def _wrap(fn_name: str, exc: Exception) -> SupabaseError:
    return SupabaseError(f"Supabase {fn_name} failed: {exc}")


def _row_to_patient(row: dict[str, Any]) -> dict[str, Any]:
    dob = row.get("dob")
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "dob": str(dob) if dob is not None else None,
        "mrn": row.get("mrn"),
        "created_at": row.get("created_at"),
    }


def list_patients() -> list[dict[str, Any]]:
    try:
        resp = _get_client().table("patients").select("*").order("created_at", desc=True).execute()
        return [_row_to_patient(r) for r in (resp.data or [])]
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("list_patients", exc) from exc


def create_patient(name: str, dob: str | None, mrn: str | None) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = {"name": name}
        if dob is not None:
            payload["dob"] = dob
        if mrn is not None:
            payload["mrn"] = mrn
        resp = _get_client().table("patients").insert(payload).execute()
        if not resp.data:
            raise SupabaseError("create_patient returned no data")
        return _row_to_patient(resp.data[0])
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("create_patient", exc) from exc


def get_patient(patient_id: str) -> dict[str, Any]:
    try:
        resp = (
            _get_client()
            .table("patients")
            .select("*")
            .eq("id", patient_id)
            .limit(1)
            .execute()
        )
        if not resp.data:
            raise SupabaseError(f"Patient {patient_id} not found")
        return _row_to_patient(resp.data[0])
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("get_patient", exc) from exc


def delete_patient(patient_id: str) -> None:
    try:
        _get_client().table("patients").delete().eq("id", patient_id).execute()
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("delete_patient", exc) from exc


def upload_document(patient_id: str, filename: str, data: bytes) -> str:
    """Upload to patient-documents bucket; returns storage_path."""
    storage_path = f"{patient_id}/{filename}"
    try:
        _get_client().storage.from_("patient-documents").upload(
            storage_path,
            data,
            {"content-type": "application/octet-stream", "upsert": "true"},
        )
        return storage_path
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("upload_document", exc) from exc


def record_document(
    patient_id: str,
    filename: str,
    storage_path: str,
    status: str,
) -> None:
    try:
        _get_client().table("documents").insert(
            {
                "patient_id": patient_id,
                "filename": filename,
                "storage_path": storage_path,
                "ingest_status": status,
            }
        ).execute()
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("record_document", exc) from exc


def record_formulation(patient_id: str, indication: str, payload: dict) -> None:
    try:
        _get_client().table("formulations").insert(
            {
                "patient_id": patient_id,
                "indication": indication,
                "payload": payload,
            }
        ).execute()
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("record_formulation", exc) from exc


def record_feedback(patient_id: str, observation: str) -> None:
    try:
        _get_client().table("feedback").insert(
            {
                "patient_id": patient_id,
                "observation": observation,
            }
        ).execute()
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("record_feedback", exc) from exc


def list_feedback(patient_id: str) -> list[dict[str, Any]]:
    try:
        resp = (
            _get_client()
            .table("feedback")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [
            {
                "id": str(r["id"]),
                "patient_id": str(r["patient_id"]),
                "observation": r["observation"],
                "created_at": r["created_at"],
            }
            for r in (resp.data or [])
        ]
    except SupabaseError:
        raise
    except Exception as exc:
        raise _wrap("list_feedback", exc) from exc

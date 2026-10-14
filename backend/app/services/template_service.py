"""Template business logic: CRUD with document validation and defaults."""
import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import TemplateRow
from ..schemas import TemplateDocument


class TemplateNotFoundError(Exception):
    pass


class DuplicateNameError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate(document: TemplateDocument) -> str:
    return document.model_dump_json()


def list_templates(db: Session) -> list[TemplateRow]:
    return list(db.scalars(select(TemplateRow).order_by(TemplateRow.updated_at.desc())))


def get_template(db: Session, template_id: str) -> TemplateRow:
    row = db.get(TemplateRow, template_id)
    if row is None:
        raise TemplateNotFoundError(template_id)
    return row


def get_default_template(db: Session) -> TemplateRow | None:
    return db.scalar(select(TemplateRow).where(TemplateRow.is_default.is_(True)))


def create_template(db: Session, document: TemplateDocument) -> TemplateRow:
    row = TemplateRow(
        name=document.name,
        is_default=document.is_default,
        document=_validate(document),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_template(db: Session, template_id: str, document: TemplateDocument) -> TemplateRow:
    row = get_template(db, template_id)
    # Keep the stored template separate from project overrides: the document
    # IS the template; edits replace it wholesale after validation.
    TemplateDocument.model_validate(document)  # explicit validation point
    row.name = document.name
    row.is_default = document.is_default
    row.document = document.model_dump_json()
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def duplicate_template(db: Session, template_id: str, new_name: str | None = None) -> TemplateRow:
    row = get_template(db, template_id)
    doc = TemplateDocument.model_validate_json(row.document)
    doc.name = new_name or f"{doc.name} (copy)"
    doc.is_default = False
    return create_template(db, doc)


def rename_template(db: Session, template_id: str, new_name: str) -> TemplateRow:
    row = get_template(db, template_id)
    row.name = new_name
    doc = TemplateDocument.model_validate_json(row.document)
    doc.name = new_name
    row.document = doc.model_dump_json()
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row



def delete_template(db: Session, template_id: str) -> None:
    row = get_template(db, template_id)
    db.delete(row)
    db.commit()


def set_default_template(db: Session, template_id: str) -> TemplateRow:
    row = get_template(db, template_id)
    for other in db.scalars(select(TemplateRow).where(TemplateRow.is_default.is_(True))):
        other.is_default = False
    row.is_default = True
    db.commit()
    db.refresh(row)
    return row


def reset_template(db: Session, template_id: str) -> TemplateRow:
    """Reset to factory defaults, preserving id, name and default flag."""
    row = get_template(db, template_id)
    defaults = TemplateDocument(name=row.name, is_default=row.is_default)
    row.document = defaults.model_dump_json()
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def template_document(row: TemplateRow) -> TemplateDocument:
    return TemplateDocument.model_validate_json(row.document)

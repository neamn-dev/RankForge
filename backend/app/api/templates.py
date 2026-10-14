from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import TemplateDocument
from ..services import template_service as svc

router = APIRouter(prefix="/api/templates", tags=["templates"])


class RenameRequest(BaseModel):
    name: str


def _doc_or_404(row) -> TemplateDocument:
    try:
        return svc.template_document(row)
    except ValueError:
        raise HTTPException(status_code=500, detail="Stored template failed validation")


@router.get("")
def list_templates(db: Session = Depends(get_db)):
    return [
        {
            "id": r.id, "name": r.name, "isDefault": r.is_default,
            "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
            "document": _doc_or_404(r).model_dump(by_alias=True),
        }
        for r in svc.list_templates(db)
    ]


@router.post("", status_code=201)
def create_template(document: TemplateDocument, db: Session = Depends(get_db)):
    row = svc.create_template(db, document)
    return {"id": row.id}


@router.get("/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db)):
    row = svc.get_template(db, template_id)
    return {
        "id": row.id, "name": row.name, "isDefault": row.is_default,
        "document": _doc_or_404(row).model_dump(by_alias=True),
    }


@router.put("/{template_id}")
def update_template(template_id: str, document: TemplateDocument, db: Session = Depends(get_db)):
    try:
        row = svc.update_template(db, template_id, document)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"id": row.id}


@router.post("/{template_id}/duplicate", status_code=201)
def duplicate_template(template_id: str, db: Session = Depends(get_db)):
    try:
        row = svc.duplicate_template(db, template_id)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"id": row.id}


@router.post("/{template_id}/reset")
def reset_template(template_id: str, db: Session = Depends(get_db)):
    try:
        row = svc.reset_template(db, template_id)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"id": row.id}


@router.post("/{template_id}/default")
def set_default(template_id: str, db: Session = Depends(get_db)):
    try:
        row = svc.set_default_template(db, template_id)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"id": row.id}


@router.patch("/{template_id}/rename")
def rename_template(template_id: str, body: RenameRequest, db: Session = Depends(get_db)):
    try:
        row = svc.rename_template(db, template_id, body.name)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"id": row.id}


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    try:
        svc.delete_template(db, template_id)
    except svc.TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return Response(status_code=204)

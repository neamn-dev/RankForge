from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProjectRow
from ..schemas import ProjectDocument

router = APIRouter(prefix="/api/projects", tags=["projects"])


class RenameRequest(BaseModel):
    name: str


def _row_to_dict(row: ProjectRow) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "templateId": row.template_id,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        "document": ProjectDocument.model_validate_json(row.document).model_dump(by_alias=True),
    }


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(ProjectRow).order_by(ProjectRow.updated_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.post("", status_code=201)
def create_project(document: ProjectDocument, db: Session = Depends(get_db)):
    row = ProjectRow(name=document.name, document=document.model_dump_json())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _row_to_dict(row)


@router.put("/{project_id}")
def update_project(project_id: str, document: ProjectDocument, db: Session = Depends(get_db)):
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    row.name = document.name
    row.document = document.model_dump_json()
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.post("/{project_id}/duplicate", status_code=201)
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = ProjectDocument.model_validate_json(row.document)
    doc.name = f"{doc.name} (copy)"
    copy = ProjectRow(name=doc.name, template_id=row.template_id,
                      document=doc.model_dump_json())
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return {"id": copy.id}


@router.patch("/{project_id}/rename")
def rename_project(project_id: str, body: RenameRequest, db: Session = Depends(get_db)):
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    row.name = body.name
    db.commit()
    return {"id": row.id}


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)

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
    row = ProjectRow(
        name=document.name,
        template_id=document.template_id,
        document=document.model_dump_json(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.post("/from-template/{template_id}", status_code=201)
def create_project_from_template(template_id: str, db: Session = Depends(get_db)):
    import uuid
    from ..models import TemplateRow
    from ..schemas import TemplateDocument
    from ..schemas.project import Clip, ClipRanking, ExportSettings, Timeline, Track

    template_row = db.get(TemplateRow, template_id)
    if template_row is None:
        raise HTTPException(status_code=404, detail="Template not found")

    template_doc = TemplateDocument.model_validate_json(template_row.document)

    count = template_doc.ranking.count
    is_desc = template_doc.ranking.order == "descending"
    positions = [count - i for i in range(count)] if is_desc else list(range(1, count + 1))

    video_clips = []
    default_clip_ticks = 9000  # 3 seconds default at 3000 ticks/sec
    timeline_current_ticks = 0

    for pos in positions:
        clip_id = str(uuid.uuid4())
        label_text = template_doc.labels.texts.get(str(pos), "")
        clip = Clip(
            id=clip_id,
            asset_id=None,
            source_in_ticks=0,
            source_out_ticks=default_clip_ticks,
            timeline_start_ticks=timeline_current_ticks,
            duration_ticks=default_clip_ticks,
            ranking=ClipRanking(position=pos, label=label_text),
        )
        video_clips.append(clip)
        timeline_current_ticks += default_clip_ticks

    video_track = Track(
        id=str(uuid.uuid4()),
        type="video",
        name="Main Ranking",
        order=0,
        clips=video_clips,
    )
    audio_track = Track(
        id=str(uuid.uuid4()),
        type="audio",
        name="Background Audio",
        order=1,
        clips=[],
    )

    doc = ProjectDocument(
        name=f"My {template_row.name} Video",
        template_id=template_id,
        timeline=Timeline(
            width=template_doc.canvas.width,
            height=template_doc.canvas.height,
            fps=template_doc.canvas.fps,
            ticks_per_second=3000,
            duration_ticks=timeline_current_ticks,
        ),
        assets=[],
        tracks=[video_track, audio_track],
        export=ExportSettings(
            width=template_doc.canvas.width,
            height=template_doc.canvas.height,
            fps=template_doc.canvas.fps,
        ),
    )

    row = ProjectRow(
        name=doc.name,
        template_id=template_id,
        document=doc.model_dump_json(),
    )
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

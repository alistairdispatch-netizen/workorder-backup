from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from io import BytesIO
import os

router = APIRouter(prefix="/api/orders", tags=["pdf"])

def get_order_pdf(order_id: int, db: Session):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="工單不存在")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)
    
    # 中文字型（使用 CIDFont）
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
    
    styles = {
        'title': ParagraphStyle('title', fontName='STSong-Light', fontSize=16, alignment=TA_CENTER, spaceAfter=5*mm),
        'subtitle': ParagraphStyle('subtitle', fontName='STSong-Light', fontSize=10, alignment=TA_CENTER, textColor=colors.grey),
        'section': ParagraphStyle('section', fontName='STSong-Light', fontSize=11, alignment=TA_LEFT, spaceAfter=3*mm),
        'body': ParagraphStyle('body', fontName='STSong-Light', fontSize=10, alignment=TA_LEFT, leading=14),
        'footer': ParagraphStyle('footer', fontName='STSong-Light', fontSize=8, alignment=TA_CENTER, textColor=colors.grey),
    }
    
    story = []
    
    # ===== 抬頭 =====
    story.append(Paragraph("三好工業工作管理系統", styles['title']))
    story.append(Paragraph("工單詳情", styles['subtitle']))
    story.append(Spacer(1, 8*mm))
    
    # ===== 基本資料表格 =====
    info_data = [
        ["工單編號", order.order_number or "-"],
        ["處理狀態", order.status or "-"],
        ["單位", order.unit or "-"],
        ["地點", order.location or "-"],
        ["故障類別", ", ".join(order.fault_categories) if order.fault_categories else "-"],
    ]
    info_table = Table(info_data, colWidths=[50*mm, 120*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'STSong-Light'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TEXTCOLOR', (0,0), (0,-1), colors.grey),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6*mm))
    
    # ===== 故障描述 =====
    story.append(Paragraph("故障描述", styles['section']))
    story.append(Paragraph(order.fault_description or "-", styles['body']))
    story.append(Spacer(1, 6*mm))
    
    # ===== 處理方式 =====
    story.append(Paragraph("處理方式", styles['section']))
    story.append(Paragraph(order.treatment or "-", styles['body']))
    story.append(Spacer(1, 8*mm))
    
    # ===== 施工前照片 =====
    before_photos = [p for p in order.photos if p.photo_type == 'before' and not p.is_deleted]
    if before_photos:
        story.append(Paragraph("施工前照片", styles['section']))
        # 以縮圖方式呈現
        for photo in before_photos[:4]:  # 最多4張
            path = photo.path.replace('/app/', '/home/devop/workorder-system/backend/')
            if os.path.exists(path):
                try:
                    img = Image(path, width=40*mm, height=30*mm)
                    story.append(img)
                except:
                    pass
        story.append(Spacer(1, 6*mm))
    
    # ===== 施工後照片 =====
    after_photos = [p for p in order.photos if p.photo_type == 'after' and not p.is_deleted]
    if after_photos:
        story.append(Paragraph("施工後照片", styles['section']))
        for photo in after_photos[:4]:
            path = photo.path.replace('/app/', '/home/devop/workorder-system/backend/')
            if os.path.exists(path):
                try:
                    img = Image(path, width=40*mm, height=30*mm)
                    story.append(img)
                except:
                    pass
    
    # ===== 表尾 =====
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("OneThree Studio · 2026 · v1.0.0", styles['footer']))
    
    doc.build(story)
    buffer.seek(0)
    return buffer

@router.get("/{order_id}/pdf")
def export_order_pdf(order_id: int, db: Session = Depends(get_db)):
    pdf_buffer = get_order_pdf(order_id, db)
    from fastapi.responses import Response
    return Response(
        content=pdf_buffer.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=order_{order_id}.pdf"}
    )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import KeepTogether
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
        'title': ParagraphStyle('title', fontName='STSong-Light', fontSize=20, alignment=TA_CENTER, spaceAfter=2*mm, textColor=colors.HexColor('#222222'), fontWeight='bold'),
        'subtitle': ParagraphStyle('subtitle', fontName='STSong-Light', fontSize=12, alignment=TA_CENTER, spaceAfter=4*mm, textColor=colors.HexColor('#555555'), fontWeight='bold'),
        'section': ParagraphStyle('section', fontName='STSong-Light', fontSize=11, alignment=TA_LEFT, spaceAfter=3*mm, textColor=colors.HexColor('#333333'), fontWeight='bold'),
        'body': ParagraphStyle('body', fontName='STSong-Light', fontSize=10, alignment=TA_LEFT, leading=14),
        'footer': ParagraphStyle('footer', fontName='STSong-Light', fontSize=8, alignment=TA_CENTER, textColor=colors.grey),
        'caption': ParagraphStyle('caption', fontName='STSong-Light', fontSize=8, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=2*mm),
        'field_label': ParagraphStyle('field_label', fontName='STSong-Light', fontSize=10, alignment=TA_LEFT, fontWeight='bold', textColor=colors.HexColor('#444444')),
        'field_value': ParagraphStyle('field_value', fontName='STSong-Light', fontSize=10, alignment=TA_LEFT),
    }

    story = []

    # ===== 頂部水平分隔線 =====
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#333333'), spaceAfter=4*mm))

    # ===== 抬頭 =====
    story.append(Paragraph("三好工業工作管理系統", styles['title']))
    story.append(Paragraph("工單詳情", styles['subtitle']))

    # ===== 基本資料表格（帶外框 + 標題列背景） =====
    # 可用內容寬度 = A4(210mm) - 左右margin(20mm×2) = 170mm
    # 比例：標籤 30% ≈ 51mm，內容 70% ≈ 119mm
    info_data = [
        [Paragraph("<b>工單編號</b>", styles['field_label']), Paragraph(order.order_number or "-", styles['field_value'])],
        [Paragraph("<b>處理狀態</b>", styles['field_label']), Paragraph(order.status or "-", styles['field_value'])],
        [Paragraph("<b>單位</b>", styles['field_label']), Paragraph(order.unit or "-", styles['field_value'])],
        [Paragraph("<b>地點</b>", styles['field_label']), Paragraph(order.location or "-", styles['field_value'])],
        [Paragraph("<b>故障類別</b>", styles['field_label']), Paragraph(", ".join(order.fault_categories) if order.fault_categories else "-", styles['field_value'])],
    ]
    info_table = Table(info_data, colWidths=[51*mm, 119*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'STSong-Light'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 4*mm),
        # 外框
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#BBBBBB')),
        # 標題列背景
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0F0F0')),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, colors.HexColor('#DDDDDD')),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6*mm))

    # ===== 故障描述（卡片式） =====
    fault_block = [
        [Paragraph("故障描述", styles['section'])],
        [Paragraph(order.fault_description or "-", styles['body'])],
    ]
    fault_table = Table(fault_block, colWidths=[170*mm])
    fault_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'STSong-Light'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 4*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4*mm),
        # 頂部裝飾線
        ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#555555')),
        # 外框
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F7F7F7')),
    ]))
    story.append(KeepTogether([fault_table]))
    story.append(Spacer(1, 5*mm))

    # ===== 處理方式（卡片式） =====
    treatment_block = [
        [Paragraph("處理方式", styles['section'])],
        [Paragraph(order.treatment or "-", styles['body'])],
    ]
    treatment_table = Table(treatment_block, colWidths=[170*mm])
    treatment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'STSong-Light'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 4*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4*mm),
        # 頂部裝飾線
        ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#555555')),
        # 外框
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F7F7F7')),
    ]))
    story.append(KeepTogether([treatment_table]))
    story.append(Spacer(1, 5*mm))

    # ===== 施工前照片 =====
    before_photos = [p for p in order.photos if p.photo_type == 'before' and not p.is_deleted]
    if before_photos:
        story.append(Paragraph("施工前照片", styles['section']))
        _render_photo_grid(story, before_photos[:4])
        story.append(Spacer(1, 5*mm))

    # ===== 施工後照片 =====
    after_photos = [p for p in order.photos if p.photo_type == 'after' and not p.is_deleted]
    if after_photos:
        story.append(Paragraph("施工後照片", styles['section']))
        _render_photo_grid(story, after_photos[:4])

    # ===== 表尾 =====
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CCCCCC'), spaceAfter=3*mm))
    story.append(Paragraph("三好工業工作管理系統 © 2026", styles['footer']))

    doc.build(story)
    buffer.seek(0)
    return buffer


def _render_photo_grid(story, photos):
    """將照片以 2x2 grid 方式呈現（每張照片帶邊框、說明），填滿可用內容寬度 170mm"""
    # 可用內容寬度 170mm，扣掉左右各 2mm padding → 每格可用 83mm
    photo_w = 81 * mm
    photo_h = 61 * mm  # 4:3 ratio
    col_w = photo_w + 4 * mm  # 85mm per column（含 padding）

    available_w = 170 * mm

    if len(photos) == 1:
        # 單張：置中於可用寬度內，圖片維持 81×61mm
        _add_photo_card(story, photos[0], photo_w, photo_h)
    elif len(photos) == 2:
        row = []
        for p in photos[:2]:
            row.append(_make_photo_cell(p, photo_w, photo_h))
        # 總寬 170mm = 85+85，完整填滿
        grid_table = Table([row], colWidths=[col_w, col_w])
        grid_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
        ]))
        story.append(grid_table)
    else:
        # 2x2 grid：總寬 170mm，完整填滿
        rows = []
        for i in range(0, len(photos), 2):
            row = []
            for p in photos[i:i+2]:
                row.append(_make_photo_cell(p, photo_w, photo_h))
            while len(row) < 2:
                row.append(Spacer(1, 1))
            rows.append(row)
        grid_table = Table(rows, colWidths=[col_w, col_w])
        grid_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
        ]))
        story.append(grid_table)


def _make_photo_cell(photo, width, height):
    """產生一個照片 Cell（含圖片 + 說明），用 Table 包住帶圓角效果"""
    path = photo.path.replace('/app/', '/home/devop/workorder-system/backend/')

    caption_style = ParagraphStyle('caption', fontName='STSong-Light', fontSize=8,
                                   alignment=TA_CENTER, textColor=colors.grey)
    caption_text = f"拍攝時間：{photo.created_at.strftime('%Y-%m-%d %H:%M')}" if photo.created_at else ""

    cell_content = []
    if os.path.exists(path):
        try:
            img = Image(path, width=width, height=height)
            cell_content.append(img)
        except Exception:
            cell_content.append(Paragraph("[圖片載入失敗]", caption_style))
    else:
        cell_content.append(Paragraph("[圖片不存在]", caption_style))

    if caption_text:
        cell_content.append(Paragraph(caption_text, caption_style))

    inner_table = Table([[item] for item in cell_content], colWidths=[width])
    inner_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        # 圓角外框（lightgrey）
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
        # 內距
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
    ]))

    return inner_table


def _add_photo_card(story, photo, width, height):
    """單張照片（與 _make_photo_cell 相同，但直接 append）"""
    story.append(_make_photo_cell(photo, width, height))


@router.get("/{order_id}/pdf")
def export_order_pdf(order_id: int, db: Session = Depends(get_db)):
    pdf_buffer = get_order_pdf(order_id, db)
    from fastapi.responses import Response
    return Response(
        content=pdf_buffer.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=order_{order_id}.pdf"}
    )

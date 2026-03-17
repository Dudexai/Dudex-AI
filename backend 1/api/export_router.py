from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from services.report_generator import get_report_data
from services.report_narrative import generate_investor_narrative
from services.pdf_exporter import export_markdown_to_pdf
import tempfile
import os

router = APIRouter(prefix="/export", tags=["export"])

@router.post("/investor-report/{plan_id}")
async def export_investor_report(plan_id: str):
    """
    POST /api/export/investor-report/:planId
    Generates and returns an investor-ready PDF report with structured error handling.
    """
    
    stage = "load"
    try:
        # 1. Load Plan & Build Summary
        summary_data = get_report_data(plan_id)
        if not summary_data:
             return {"stage": "load", "message": "Plan not found"}
        
        stage = "narrative"
        # 2. Generate AI Narrative
        narrative_md = await generate_investor_narrative(summary_data)
        
        stage = "pdf"
        # 3. Create PDF
        # Use temp file for fpdf2 output, then read into BytesIO
        fd, path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd) # Close handle so fpdf2 can write
        
        try:
            export_markdown_to_pdf(narrative_md, path)
            
            with open(path, "rb") as f:
                pdf_bytes = f.read()
                
            # Cleanup temp file
            if os.path.exists(path):
                os.remove(path)
                
            stage = "return"
            # 4. Return StreamingResponse
            filename = f"Investor_Report_{summary_data.get('title', 'Project').replace(' ', '_')}.pdf"
            
            return StreamingResponse(
                BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        except Exception as pdf_err:
             if os.path.exists(path):
                os.remove(path)
             raise pdf_err

    except Exception as e:
        print(f"EXPORT ERROR at {stage}: {str(e)}")
        return {
            "stage": stage,
            "message": str(e)
        }
    
@router.post("/investor-report/{plan_id}/debug")
async def debug_report_narrative(plan_id: str):
    """
    Returns the raw markdown narrative for debugging.
    """
    summary_data = get_report_data(plan_id)
    if not summary_data:
        return {"error": "not found"}
    narrative_md = await generate_investor_narrative(summary_data)
    return {"markdown": narrative_md}

from fpdf import FPDF
import re

class PDFReport(FPDF):
    def header(self):
        # Setting font for title
        self.set_font('helvetica', 'B', 15)
        # Move to the center/right
        self.cell(0, 10, 'Investor Execution Report', border=0, ln=1, align='R')
        self.set_draw_color(200, 200, 200)
        self.line(10, 20, 200, 20)
        self.ln(10)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def strip_markdown(text: str) -> str:
    """
    Strips markdown symbols to return clean plain text.
    """
    # Remove headers
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # Remove bold/italic markers
    text = text.replace('**', '').replace('__', '').replace('*', '').replace('_', '')
    # Remove list items
    text = re.sub(r'^\s*[-*]\s+', '', text, flags=re.MULTILINE)
    # Remove backticks
    text = text.replace('`', '')
    return text

def export_markdown_to_pdf(markdown_content: str, output_path: str):
    """
    Strips markdown and generates a clean plain-text PDF.
    """
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Pre-process content: Strip markdown symbols
    plain_text = strip_markdown(markdown_content)
    
    # Split by double newlines for paragraphs
    paragraphs = plain_text.split('\n\n')
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        pdf.set_font('helvetica', '', 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 7, para)
        pdf.ln(5)

    pdf.output(output_path)
    return output_path

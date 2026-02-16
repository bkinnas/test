import copy
import os
import re

from docx import Document


# Pattern to find placeholders like {{field_name}} in templates
PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")

# Maps placeholder names to human-readable labels
FIELD_LABELS = {
    "employee_name": "Employee Full Name",
    "first_name": "First Name",
    "last_name": "Last Name",
    "employee_id": "Employee ID",
    "email": "Email Address",
    "department": "Department",
    "position": "Position / Job Title",
    "hire_date": "Hire Date",
    "manager_name": "Manager Name",
    "address": "Address",
    "phone": "Phone Number",
    "salary": "Salary",
    "new_salary": "New Salary",
    "previous_salary": "Previous Salary",
    "raise_amount": "Raise Amount",
    "raise_percentage": "Raise Percentage",
    "effective_date": "Effective Date",
    "date": "Date",
    "reason": "Reason",
    "company_name": "Company Name",
}

# Fields that can be auto-filled from existing employee data
EMPLOYEE_FIELDS = {
    "employee_name", "first_name", "last_name", "employee_id",
    "email", "department", "position", "hire_date",
    "manager_name", "address", "phone",
}

# Fields related to salary that need special handling
SALARY_FIELDS = {
    "salary", "new_salary", "previous_salary", "raise_amount", "raise_percentage",
}


def extract_placeholders(filepath: str) -> list[str]:
    """Extract all unique {{placeholder}} names from a .docx file.

    Scans paragraphs, tables, headers, and footers.
    """
    doc = Document(filepath)
    placeholders = set()

    # Check paragraphs
    for para in doc.paragraphs:
        full_text = "".join(run.text for run in para.runs)
        matches = PLACEHOLDER_PATTERN.findall(full_text)
        placeholders.update(matches)

    # Check tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    full_text = "".join(run.text for run in para.runs)
                    matches = PLACEHOLDER_PATTERN.findall(full_text)
                    placeholders.update(matches)

    # Check headers and footers
    for section in doc.sections:
        for header_footer in [section.header, section.footer]:
            if header_footer is not None:
                for para in header_footer.paragraphs:
                    full_text = "".join(run.text for run in para.runs)
                    matches = PLACEHOLDER_PATTERN.findall(full_text)
                    placeholders.update(matches)

    return sorted(placeholders)


def _replace_in_paragraph(paragraph, replacements: dict):
    """Replace {{placeholder}} tokens in a paragraph while preserving formatting.

    Handles cases where the placeholder might be split across multiple runs.
    """
    full_text = "".join(run.text for run in paragraph.runs)
    if "{{" not in full_text:
        return

    new_text = full_text
    for key, value in replacements.items():
        new_text = new_text.replace("{{" + key + "}}", str(value))

    if new_text == full_text:
        return

    # Rebuild runs: put all text in the first run, clear the rest
    if paragraph.runs:
        paragraph.runs[0].text = new_text
        for run in paragraph.runs[1:]:
            run.text = ""


def fill_template(template_path: str, output_path: str, field_values: dict) -> str:
    """Fill a .docx template with values and save the result.

    Args:
        template_path: Path to the .docx template file.
        output_path: Path where the filled document will be saved.
        field_values: Dict mapping placeholder names to their values.

    Returns:
        The output file path.
    """
    doc = Document(template_path)

    # Fill paragraphs
    for para in doc.paragraphs:
        _replace_in_paragraph(para, field_values)

    # Fill tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    _replace_in_paragraph(para, field_values)

    # Fill headers and footers
    for section in doc.sections:
        for header_footer in [section.header, section.footer]:
            if header_footer is not None:
                for para in header_footer.paragraphs:
                    _replace_in_paragraph(para, field_values)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def get_field_label(field_name: str) -> str:
    """Get a human-readable label for a placeholder field name."""
    return FIELD_LABELS.get(field_name, field_name.replace("_", " ").title())


def classify_fields(placeholders: list[str]) -> dict:
    """Classify placeholder fields into categories.

    Returns dict with keys:
        - employee_fields: fields that can be auto-filled from employee record
        - salary_fields: salary-related fields
        - other_fields: everything else
    """
    return {
        "employee_fields": [p for p in placeholders if p in EMPLOYEE_FIELDS],
        "salary_fields": [p for p in placeholders if p in SALARY_FIELDS],
        "other_fields": [p for p in placeholders if p not in EMPLOYEE_FIELDS and p not in SALARY_FIELDS],
    }

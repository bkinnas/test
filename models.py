from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """Application user for authentication."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Employee(db.Model):
    """Employee record with personal and job information."""
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200))
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    hire_date = db.Column(db.String(20))
    manager_name = db.Column(db.String(200))
    address = db.Column(db.String(300))
    phone = db.Column(db.String(30))

    # Current salary is stored encrypted
    current_salary_encrypted = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    salary_history = db.relationship("SalaryHistory", backref="employee",
                                     lazy=True, order_by="SalaryHistory.effective_date.desc()")
    form_submissions = db.relationship("FormSubmission", backref="employee", lazy=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class SalaryHistory(db.Model):
    """Tracks salary changes over time for each employee."""
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employee.id"), nullable=False)
    salary_encrypted = db.Column(db.Text, nullable=False)
    previous_salary_encrypted = db.Column(db.Text)
    raise_amount_encrypted = db.Column(db.Text)
    raise_percentage = db.Column(db.String(10))
    effective_date = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class FormTemplate(db.Model):
    """Uploaded .docx form templates with detected placeholders."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    filename = db.Column(db.String(300), nullable=False)
    placeholders = db.Column(db.Text)  # JSON list of placeholder names
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    form_submissions = db.relationship("FormSubmission", backref="template", lazy=True)


class FormSubmission(db.Model):
    """Record of a completed form for an employee."""
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employee.id"), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey("form_template.id"), nullable=False)
    field_data_encrypted = db.Column(db.Text)  # JSON of filled fields, encrypted
    generated_filename = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

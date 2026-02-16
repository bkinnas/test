import json
import os
from datetime import datetime, timezone

from flask import (Flask, abort, flash, redirect, render_template, request,
                   send_file, url_for)
from flask_login import (LoginManager, current_user, login_required,
                          login_user, logout_user)
from werkzeug.utils import secure_filename

from config import Config
from docx_handler import (SALARY_FIELDS, classify_fields,
                           extract_placeholders, fill_template,
                           get_field_label)
from encryption import SalaryEncryptor
from models import (Employee, FormSubmission, FormTemplate, SalaryHistory,
                     User, db)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = "login"
    login_manager.login_message = "Please log in to access this application."
    login_manager.init_app(app)

    encryptor = SalaryEncryptor(app.config["ENCRYPTION_KEY"])

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # ── Jinja Filters ──────────────────────────────────────────────

    @app.template_filter("mask_salary")
    def mask_salary_filter(encrypted_value):
        """Decrypt then mask a salary value for display."""
        if not encrypted_value:
            return "N/A"
        try:
            decrypted = encryptor.decrypt(encrypted_value)
            return encryptor.mask(decrypted)
        except Exception:
            return "****"

    @app.template_filter("decrypt_salary")
    def decrypt_salary_filter(encrypted_value):
        """Decrypt a salary value (used when reveal is toggled)."""
        if not encrypted_value:
            return "N/A"
        try:
            return encryptor.decrypt(encrypted_value)
        except Exception:
            return "Error"

    @app.template_filter("field_label")
    def field_label_filter(field_name):
        return get_field_label(field_name)

    @app.template_filter("from_json")
    def from_json_filter(value):
        """Parse a JSON string."""
        if not value:
            return []
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return []

    # ── Auth Routes ────────────────────────────────────────────────

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))

        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            user = User.query.filter_by(username=username).first()

            if user and user.check_password(password):
                login_user(user, remember=True)
                next_page = request.args.get("next")
                return redirect(next_page or url_for("dashboard"))

            flash("Invalid username or password.", "error")

        return render_template("login.html")

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        flash("You have been logged out.", "info")
        return redirect(url_for("login"))

    @app.route("/change-password", methods=["GET", "POST"])
    @login_required
    def change_password():
        if request.method == "POST":
            current_pw = request.form.get("current_password", "")
            new_pw = request.form.get("new_password", "")
            confirm_pw = request.form.get("confirm_password", "")

            if not current_user.check_password(current_pw):
                flash("Current password is incorrect.", "error")
            elif new_pw != confirm_pw:
                flash("New passwords do not match.", "error")
            elif len(new_pw) < 8:
                flash("Password must be at least 8 characters.", "error")
            else:
                current_user.set_password(new_pw)
                db.session.commit()
                flash("Password changed successfully.", "success")
                return redirect(url_for("dashboard"))

        return render_template("change_password.html")

    # ── Dashboard ──────────────────────────────────────────────────

    @app.route("/")
    @login_required
    def dashboard():
        templates = FormTemplate.query.order_by(FormTemplate.uploaded_at.desc()).all()
        employee_count = Employee.query.count()
        submission_count = FormSubmission.query.count()
        return render_template("dashboard.html", templates=templates,
                               employee_count=employee_count,
                               submission_count=submission_count)

    # ── Template Management ────────────────────────────────────────

    @app.route("/templates/upload", methods=["GET", "POST"])
    @login_required
    def upload_template():
        if request.method == "POST":
            if "file" not in request.files:
                flash("No file selected.", "error")
                return redirect(request.url)

            file = request.files["file"]
            if file.filename == "":
                flash("No file selected.", "error")
                return redirect(request.url)

            if not file.filename.lower().endswith(".docx"):
                flash("Only .docx files are supported.", "error")
                return redirect(request.url)

            template_name = request.form.get("name", "").strip()
            if not template_name:
                template_name = os.path.splitext(file.filename)[0]

            filename = secure_filename(file.filename)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
            file.save(filepath)

            # Extract placeholders
            placeholders = extract_placeholders(filepath)

            template = FormTemplate(
                name=template_name,
                filename=filename,
                placeholders=json.dumps(placeholders),
            )
            db.session.add(template)
            db.session.commit()

            flash(f"Template '{template_name}' uploaded with {len(placeholders)} field(s) detected.", "success")
            return redirect(url_for("dashboard"))

        return render_template("upload_template.html")

    @app.route("/templates/<int:template_id>/delete", methods=["POST"])
    @login_required
    def delete_template(template_id):
        template = db.session.get(FormTemplate, template_id)
        if not template:
            abort(404)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], template.filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(template)
        db.session.commit()
        flash("Template deleted.", "info")
        return redirect(url_for("dashboard"))

    # ── Form Filling ───────────────────────────────────────────────

    @app.route("/fill/<int:template_id>", methods=["GET", "POST"])
    @login_required
    def fill_form(template_id):
        template = db.session.get(FormTemplate, template_id)
        if not template:
            abort(404)

        placeholders = json.loads(template.placeholders) if template.placeholders else []
        classified = classify_fields(placeholders)
        employees = Employee.query.order_by(Employee.last_name).all()

        if request.method == "POST":
            # Determine if existing or new employee
            employee_mode = request.form.get("employee_mode", "new")
            employee = None

            if employee_mode == "existing":
                emp_id = request.form.get("employee_select")
                if emp_id:
                    employee = db.session.get(Employee, int(emp_id))
            else:
                # Create new employee from form data
                employee = Employee(
                    employee_id=request.form.get("employee_id", "").strip(),
                    first_name=request.form.get("first_name", "").strip(),
                    last_name=request.form.get("last_name", "").strip(),
                    email=request.form.get("email", "").strip(),
                    department=request.form.get("department", "").strip(),
                    position=request.form.get("position", "").strip(),
                    hire_date=request.form.get("hire_date", "").strip(),
                    manager_name=request.form.get("manager_name", "").strip(),
                    address=request.form.get("address", "").strip(),
                    phone=request.form.get("phone", "").strip(),
                )
                db.session.add(employee)

            if not employee:
                flash("Please select or create an employee.", "error")
                return redirect(request.url)

            # Collect all field values for template filling
            field_values = {}

            # Auto-fill employee fields from record
            field_map = {
                "employee_name": employee.full_name,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "employee_id": employee.employee_id,
                "email": employee.email or "",
                "department": employee.department or "",
                "position": employee.position or "",
                "hire_date": employee.hire_date or "",
                "manager_name": employee.manager_name or "",
                "address": employee.address or "",
                "phone": employee.phone or "",
            }
            for field in classified["employee_fields"]:
                field_values[field] = field_map.get(field, request.form.get(field, ""))

            # Handle salary fields
            new_salary = request.form.get("new_salary", "").strip() or \
                         request.form.get("salary", "").strip()
            previous_salary = ""
            raise_amount = ""
            raise_pct = ""

            if employee.current_salary_encrypted:
                previous_salary = encryptor.decrypt(employee.current_salary_encrypted)

            if new_salary:
                # Calculate raise if we have a previous salary
                if previous_salary:
                    try:
                        prev = float(previous_salary.replace(",", ""))
                        new = float(new_salary.replace(",", ""))
                        raise_amt = new - prev
                        raise_amount = f"{raise_amt:,.2f}"
                        if prev > 0:
                            raise_pct = f"{(raise_amt / prev) * 100:.1f}%"
                    except ValueError:
                        pass

                # Update employee salary
                employee.current_salary_encrypted = encryptor.encrypt(new_salary)

                # Record salary history
                history = SalaryHistory(
                    employee=employee,
                    salary_encrypted=encryptor.encrypt(new_salary),
                    previous_salary_encrypted=encryptor.encrypt(previous_salary) if previous_salary else None,
                    raise_amount_encrypted=encryptor.encrypt(raise_amount) if raise_amount else None,
                    raise_percentage=raise_pct,
                    effective_date=request.form.get("effective_date", "")
                                   or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    reason=request.form.get("reason", "").strip(),
                )
                db.session.add(history)

            # Set salary-related fields for template
            field_values["salary"] = new_salary or previous_salary
            field_values["new_salary"] = new_salary
            field_values["previous_salary"] = previous_salary
            field_values["raise_amount"] = raise_amount
            field_values["raise_percentage"] = raise_pct

            # Collect other fields directly from form
            for field in classified["other_fields"]:
                field_values[field] = request.form.get(field, "")

            # Fill the date field if present
            if "date" in placeholders:
                field_values["date"] = request.form.get("date", "") \
                    or datetime.now(timezone.utc).strftime("%Y-%m-%d")

            # Generate the filled document
            template_path = os.path.join(app.config["UPLOAD_FOLDER"], template.filename)
            output_filename = f"{employee.employee_id}_{template.name}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.docx"
            output_filename = secure_filename(output_filename)
            output_path = os.path.join(app.config["GENERATED_FOLDER"], output_filename)

            fill_template(template_path, output_path, field_values)

            # Save submission record
            submission = FormSubmission(
                employee=employee,
                template=template,
                field_data_encrypted=encryptor.encrypt(json.dumps(field_values)),
                generated_filename=output_filename,
            )
            db.session.add(submission)
            db.session.commit()

            flash("Form generated successfully!", "success")
            return redirect(url_for("download_form", submission_id=submission.id))

        return render_template("fill_form.html", template=template,
                               placeholders=placeholders, classified=classified,
                               employees=employees)

    @app.route("/fill/<int:template_id>/employee-data/<int:employee_id>")
    @login_required
    def get_employee_data(template_id, employee_id):
        """AJAX endpoint: return employee data for auto-fill."""
        employee = db.session.get(Employee, employee_id)
        if not employee:
            return {"error": "Employee not found"}, 404

        data = {
            "employee_name": employee.full_name,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "employee_id": employee.employee_id,
            "email": employee.email or "",
            "department": employee.department or "",
            "position": employee.position or "",
            "hire_date": employee.hire_date or "",
            "manager_name": employee.manager_name or "",
            "address": employee.address or "",
            "phone": employee.phone or "",
            "has_salary": bool(employee.current_salary_encrypted),
        }
        return data

    @app.route("/download/<int:submission_id>")
    @login_required
    def download_form(submission_id):
        submission = db.session.get(FormSubmission, submission_id)
        if not submission:
            abort(404)
        filepath = os.path.join(app.config["GENERATED_FOLDER"], submission.generated_filename)
        if not os.path.exists(filepath):
            flash("Generated file not found.", "error")
            return redirect(url_for("dashboard"))
        return send_file(filepath, as_attachment=True,
                         download_name=submission.generated_filename)

    # ── Employee Salary Dashboard ──────────────────────────────────

    @app.route("/employees")
    @login_required
    def employee_list():
        employees = Employee.query.order_by(Employee.last_name).all()
        # Check if user wants to reveal salaries (requires re-auth)
        show_salary = request.args.get("reveal") == "true"
        return render_template("employees.html", employees=employees,
                               show_salary=show_salary, encryptor=encryptor)

    @app.route("/employees/reveal", methods=["POST"])
    @login_required
    def reveal_salaries():
        """Re-authenticate to reveal salary values."""
        password = request.form.get("password", "")
        if current_user.check_password(password):
            return redirect(url_for("employee_list", reveal="true"))
        flash("Incorrect password. Salaries remain hidden.", "error")
        return redirect(url_for("employee_list"))

    @app.route("/employees/<int:employee_id>")
    @login_required
    def employee_detail(employee_id):
        employee = db.session.get(Employee, employee_id)
        if not employee:
            abort(404)
        show_salary = request.args.get("reveal") == "true"
        submissions = FormSubmission.query.filter_by(employee_id=employee_id)\
            .order_by(FormSubmission.created_at.desc()).all()
        return render_template("employee_detail.html", employee=employee,
                               show_salary=show_salary, encryptor=encryptor,
                               submissions=submissions)

    @app.route("/employees/<int:employee_id>/reveal", methods=["POST"])
    @login_required
    def reveal_employee_salary(employee_id):
        password = request.form.get("password", "")
        if current_user.check_password(password):
            return redirect(url_for("employee_detail", employee_id=employee_id, reveal="true"))
        flash("Incorrect password.", "error")
        return redirect(url_for("employee_detail", employee_id=employee_id))

    # ── Form History ───────────────────────────────────────────────

    @app.route("/history")
    @login_required
    def form_history():
        submissions = FormSubmission.query.order_by(
            FormSubmission.created_at.desc()).all()
        return render_template("history.html", submissions=submissions)

    # ── Initialize DB ──────────────────────────────────────────────

    with app.app_context():
        db.create_all()

        # Create default admin user if none exists
        if not User.query.first():
            admin = User(username="admin")
            admin.set_password("changeme123")
            db.session.add(admin)
            db.session.commit()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)

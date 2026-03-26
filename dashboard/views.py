import pandas as pd
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib import messages
from django.db.models import Avg
from .models import StudentPerformance


def index(request):
    """Main dashboard view - shows upload form, data preview, and charts."""
    students = StudentPerformance.objects.all()
    total_students = students.count()

    # Discover all subject names from the first record
    subject_names = []
    subject_averages = []
    avg_overall = 0

    if total_students > 0:
        first_student = students.first()
        if first_student and first_student.subjects:
            subject_names = list(first_student.subjects.keys())

        # Calculate per-subject averages across all students
        for subj in subject_names:
            scores = []
            for s in students:
                val = s.subjects.get(subj)
                if val is not None:
                    scores.append(float(val))
            avg = round(sum(scores) / len(scores), 2) if scores else 0
            subject_averages.append({'label': subj, 'value': avg})

        overall_stats = students.aggregate(avg_overall=Avg('average_score'))
        avg_overall = round(overall_stats['avg_overall'] or 0, 2)

    context = {
        'students': students[:50],
        'total_students': total_students,
        'subject_names': subject_names,
        'subject_averages': subject_averages,
        'avg_overall': avg_overall,
        'has_data': total_students > 0,
    }
    return render(request, 'dashboard/index.html', context)


def upload_csv(request):
    """Handle CSV file upload and parse with pandas."""
    if request.method == 'POST' and request.FILES.get('csv_file'):
        csv_file = request.FILES['csv_file']

        # Validate file type
        if not csv_file.name.endswith('.csv'):
            messages.error(request, 'Please upload a valid CSV file.')
            return redirect('dashboard:index')

        try:
            df = pd.read_csv(csv_file)

            # Normalize column names: strip whitespace, title case
            df.columns = df.columns.str.strip()

            # We need at least 'Name' and 'Gender' columns; the rest are subjects
            col_lower = [c.lower() for c in df.columns]
            if 'name' not in col_lower or 'gender' not in col_lower:
                messages.error(
                    request,
                    'CSV must contain at least "Name" and "Gender" columns. '
                    f'Found: {", ".join(df.columns)}'
                )
                return redirect('dashboard:index')

            # Identify subject columns (everything except Name and Gender)
            name_col = df.columns[col_lower.index('name')]
            gender_col = df.columns[col_lower.index('gender')]
            subject_cols = [c for c in df.columns if c.lower() not in ('name', 'gender')]

            if len(subject_cols) == 0:
                messages.error(request, 'CSV must contain at least one subject column besides Name and Gender.')
                return redirect('dashboard:index')

            # Clear previous data before loading new dataset
            StudentPerformance.objects.all().delete()

            # Populate database
            records = []
            for _, row in df.iterrows():
                subjects_dict = {}
                for col in subject_cols:
                    try:
                        subjects_dict[col] = float(row[col])
                    except (ValueError, TypeError):
                        subjects_dict[col] = 0.0

                scores = list(subjects_dict.values())
                avg = round(sum(scores) / len(scores), 2) if scores else 0

                records.append(StudentPerformance(
                    name=str(row[name_col]).strip(),
                    gender=str(row[gender_col]).strip().capitalize(),
                    subjects=subjects_dict,
                    average_score=avg,
                ))

            StudentPerformance.objects.bulk_create(records)

            messages.success(
                request,
                f'Successfully uploaded {len(records)} student records '
                f'with {len(subject_cols)} subjects: {", ".join(subject_cols)}!'
            )

        except Exception as e:
            messages.error(request, f'Error processing file: {str(e)}')

    return redirect('dashboard:index')


def chart_data(request):
    """API endpoint returning aggregated chart data as JSON."""
    students = StudentPerformance.objects.all()

    if not students.exists():
        return JsonResponse({'has_data': False})

    # Discover subject names from first record
    first = students.first()
    subject_names = list(first.subjects.keys()) if first and first.subjects else []

    # --- 1. Gender-based performance (Bar chart) ---
    gender_groups = {}
    for s in students:
        g = s.gender
        if g not in gender_groups:
            gender_groups[g] = {subj: [] for subj in subject_names}
        for subj in subject_names:
            val = s.subjects.get(subj)
            if val is not None:
                gender_groups[g][subj].append(float(val))

    gender_labels = list(gender_groups.keys())
    # Build a dict: { "Math": [avg_male, avg_female, ...], "Science": [...], ... }
    gender_datasets = {}
    for subj in subject_names:
        gender_datasets[subj] = []
        for g in gender_labels:
            scores = gender_groups[g].get(subj, [])
            avg = round(sum(scores) / len(scores), 2) if scores else 0
            gender_datasets[subj].append(avg)

    # --- 2. Subject-wise class averages (Pie / Bar chart) ---
    subject_averages = []
    for subj in subject_names:
        scores = [float(s.subjects.get(subj, 0)) for s in students]
        avg = round(sum(scores) / len(scores), 2) if scores else 0
        subject_averages.append(avg)

    # --- 3. Individual student averages (Line chart – top 20) ---
    top_students = students.order_by('name')[:20]
    student_names_list = [s.name for s in top_students]
    student_averages_list = [float(s.average_score) for s in top_students]

    # --- 4. Gender distribution count (Doughnut) ---
    male_count = students.filter(gender='Male').count()
    female_count = students.filter(gender='Female').count()
    other_count = students.exclude(gender__in=['Male', 'Female']).count()

    data = {
        'has_data': True,
        'subject_names': subject_names,
        'gender': {
            'labels': gender_labels,
            'datasets': gender_datasets,
        },
        'subjects': {
            'labels': subject_names,
            'averages': subject_averages,
        },
        'students': {
            'names': student_names_list,
            'averages': student_averages_list,
        },
        'gender_distribution': {
            'labels': ['Male', 'Female', 'Other'],
            'counts': [male_count, female_count, other_count],
        },
    }

    return JsonResponse(data)


def clear_data(request):
    """Clear all student records from the database."""
    if request.method == 'POST':
        StudentPerformance.objects.all().delete()
        messages.success(request, 'All student data has been cleared.')
    return redirect('dashboard:index')
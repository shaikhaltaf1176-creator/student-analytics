from django.contrib import admin
from .models import StudentPerformance


@admin.register(StudentPerformance)
class StudentPerformanceAdmin(admin.ModelAdmin):
    list_display = ('name', 'gender', 'average_score', 'uploaded_at')
    list_filter = ('gender',)
    search_fields = ('name',)
    ordering = ('-uploaded_at',)
    readonly_fields = ('average_score',)

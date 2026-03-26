from django.db import models


class StudentPerformance(models.Model):
    """
    Stores a student record with dynamic subject scores.
    The 'subjects' JSONField holds a dict like {"Math": 85, "Physics": 72, ...}
    so it works with ANY subject names from the CSV.
    """
    name = models.CharField(max_length=200)
    gender = models.CharField(max_length=20)
    subjects = models.JSONField(default=dict, help_text="Dict of subject_name: score")
    average_score = models.FloatField(default=0, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.subjects:
            scores = list(self.subjects.values())
            self.average_score = round(sum(scores) / len(scores), 2)
        super().save(*args, **kwargs)

    def get_subject_list(self):
        """Returns list of (subject_name, score) tuples for template rendering."""
        return list(self.subjects.items())

    def __str__(self):
        return f"{self.name} ({self.gender})"

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Student Performance"
        verbose_name_plural = "Student Performances"

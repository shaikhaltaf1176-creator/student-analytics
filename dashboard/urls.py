from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.index, name='index'),
    path('upload/', views.upload_csv, name='upload_csv'),
    path('api/chart-data/', views.chart_data, name='chart_data'),
    path('clear/', views.clear_data, name='clear_data'),
]

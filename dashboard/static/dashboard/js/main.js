/* ============================================================
   Student Performance Analytics – Client-Side Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- File Upload UX ----
    const dropZone  = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const fileName  = document.getElementById('file-name-display');
    const uploadBtn = document.getElementById('btn-upload');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
                fileInput.click();
            }
        });

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                showFileName(files[0].name);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                showFileName(fileInput.files[0].name);
            }
        });

        function showFileName(name) {
            if (fileName) fileName.textContent = `📄 ${name}`;
            if (uploadBtn) uploadBtn.disabled = false;
        }
    }

    // ---- Animate Stat Numbers ----
    const statValues = document.querySelectorAll('.stat-value[data-target]');
    const observerOptions = { threshold: 0.4 };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateValue(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    statValues.forEach(el => counterObserver.observe(el));

    function animateValue(el) {
        const target = parseFloat(el.dataset.target);
        const isFloat = target % 1 !== 0;
        const duration = 1200;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            el.textContent = isFloat ? current.toFixed(2) : Math.round(current);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ---- Chart.js Rendering ----
    if (typeof CHART_DATA_URL !== 'undefined') {
        fetch(CHART_DATA_URL)
            .then(res => res.json())
            .then(data => {
                if (!data.has_data) return;
                renderGenderChart(data.gender, data.subject_names);
                renderSubjectChart(data.subjects);
                renderLineChart(data.students);
                renderGenderDistChart(data.gender_distribution);
            })
            .catch(err => console.error('Chart data fetch error:', err));
    }

    // -- Shared chart defaults --
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';

    // Color palette for dynamic subjects
    const SUBJECT_COLORS = [
        { bg: 'rgba(99, 102, 241, 0.75)',  border: '#6366f1' },   // Indigo
        { bg: 'rgba(16, 185, 129, 0.75)',  border: '#10b981' },   // Emerald
        { bg: 'rgba(245, 158, 11, 0.75)',  border: '#f59e0b' },   // Amber
        { bg: 'rgba(236, 72, 153, 0.75)',  border: '#ec4899' },   // Pink
        { bg: 'rgba(6, 182, 212, 0.75)',   border: '#06b6d4' },   // Cyan
        { bg: 'rgba(168, 85, 247, 0.75)',  border: '#a855f7' },   // Purple
        { bg: 'rgba(239, 68, 68, 0.75)',   border: '#ef4444' },   // Red
        { bg: 'rgba(34, 197, 94, 0.75)',   border: '#22c55e' },   // Green
        { bg: 'rgba(251, 146, 60, 0.75)',  border: '#fb923c' },   // Orange
        { bg: 'rgba(56, 189, 248, 0.75)',  border: '#38bdf8' },   // Sky
    ];

    function getColor(index) {
        return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    }

    const tooltipStyle = {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
    };

    /* 1. Gender-Based Performance – Grouped Bar Chart (dynamic subjects) */
    function renderGenderChart(genderData, subjectNames) {
        const ctx = document.getElementById('genderChart');
        if (!ctx) return;

        // genderData.datasets is { "Math": [avg_male, avg_female], "Science": [...], ... }
        const datasets = subjectNames.map((subj, i) => {
            const color = getColor(i);
            return {
                label: subj,
                data: genderData.datasets[subj] || [],
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 1,
                borderRadius: 6,
            };
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: genderData.labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: tooltipStyle,
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { weight: 600 } },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        max: 100,
                    },
                },
            },
        });
    }

    /* 2. Subject-Wise Averages – Bar Chart (dynamic) */
    function renderSubjectChart(subjectData) {
        const ctx = document.getElementById('subjectChart');
        if (!ctx) return;

        const bgColors = subjectData.labels.map((_, i) => getColor(i).bg);
        const borderColors = subjectData.labels.map((_, i) => getColor(i).border);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: subjectData.labels,
                datasets: [{
                    label: 'Class Average',
                    data: subjectData.averages,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.x.toFixed(2)} avg`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        max: 100,
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { weight: 600 } },
                    },
                },
            },
        });
    }

    /* 3. Student Average Marks – Line Chart */
    function renderLineChart(studentData) {
        const ctx = document.getElementById('lineChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: studentData.names,
                datasets: [{
                    label: 'Average Score',
                    data: studentData.averages,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#a855f7',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 2.5,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: tooltipStyle,
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { maxRotation: 45, font: { size: 11 } },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        max: 100,
                    },
                },
            },
        });
    }

    /* 4. Gender Distribution – Doughnut Chart */
    function renderGenderDistChart(distData) {
        const ctx = document.getElementById('genderDistChart');
        if (!ctx) return;

        const baseColors = ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(148, 163, 184, 0.8)'];
        const baseBorders = ['#3b82f6', '#ec4899', '#94a3b8'];
        const filteredLabels = [];
        const filteredCounts = [];
        const filteredColors = [];
        const filteredBorders = [];

        distData.labels.forEach((label, i) => {
            if (distData.counts[i] > 0) {
                filteredLabels.push(label);
                filteredCounts.push(distData.counts[i]);
                filteredColors.push(baseColors[i]);
                filteredBorders.push(baseBorders[i]);
            }
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: filteredLabels,
                datasets: [{
                    data: filteredCounts,
                    backgroundColor: filteredColors,
                    borderColor: filteredBorders,
                    borderWidth: 2,
                    hoverOffset: 12,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '58%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} students`,
                        },
                    },
                },
            },
        });
    }

});

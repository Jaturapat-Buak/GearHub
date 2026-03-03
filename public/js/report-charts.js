document.addEventListener('DOMContentLoaded', function () {
    //กราฟแท่งแนวตั้ง (Bar Chart)
    const barCtx = document.getElementById('reportBarChart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: barData.map(item => item.category_name),
            datasets: [{
                data: barData.map(item => item.qty),
                backgroundColor: '#0ea5e9',
                borderRadius: 12,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return `${label}: ${value.toLocaleString()} ชิ้น`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    //กราฟวงกลม (Pie Chart)
    const pieCtx = document.getElementById('reportPieChart').getContext('2d');
    new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: pieData.map(item => item.category_name),
            datasets: [{
                data: pieData.map(item => item.qty),
                backgroundColor: [
                    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { 
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
});
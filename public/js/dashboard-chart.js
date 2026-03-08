document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const colorPalette = [
        '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'
    ];

    const datasets = chartData.map((item, index) => {
        const percentage = totalInventory > 0 ? ((item.total_stock / totalInventory) * 100).toFixed(1) : 0;

        return {
            label: item.category_name,
            data: [parseFloat(percentage)],
            backgroundColor: colorPalette[index % colorPalette.length]
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [''], 
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, max: 100, display: false },
                y: { stacked: true, display: false }
            },
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    color: '#fff',
                    anchor: 'center',
                    align: 'center',
                    font: {
                        weight: 'bold',
                        size: 11,
                        family: 'Prompt'
                    },
                    formatter: (value) => {
                        return value > 5 ? value + '%' : '';
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });

    const legendContainer = document.getElementById('custom-legend');
    chartData.forEach((item, index) => {
        const percentage = totalInventory > 0 ? ((item.total_stock / totalInventory) * 100).toFixed(1) : 0;
        
        const legendItem = document.createElement('div');
        legendItem.className = 'd-flex justify-content-between align-items-center mb-2';
        legendItem.innerHTML = `
            <div class="d-flex align-items-center">
                <div style="width: 12px; height: 12px; background-color: ${colorPalette[index % colorPalette.length]}; border-radius: 50%; margin-right: 10px;"></div>
                <span class="small text-secondary">${item.category_name}</span>
            </div>
            <div class="text-end">
                <span class="fw-bold small">${percentage}%</span>
                <div class="text-muted" style="font-size: 0.7rem;">${item.total_stock.toLocaleString()} ชิ้น</div>
            </div>
        `;
        legendContainer.appendChild(legendItem);
    });
});
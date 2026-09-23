/**
 * PASSIVE SHELTER DESIGNER - Charts & Visualizations
 * Chart.js configurations for 24-Hour Diurnal Curves, Component Heat Breakdown, and Design Comparisons.
 */

class ShelterChartsManager {
  constructor() {
    this.tempChart = null;
    this.breakdownChart = null;
    this.comparisonChart = null;
  }

  /**
   * Render or update 24-Hour Temperature Profile Chart
   */
  render24HourTempChart(canvasId, timeSeries, comfortLimits) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = timeSeries.map(d => d.timeLabel);
    const outdoorTemps = timeSeries.map(d => d.outdoorTemp);
    const indoorTemps = timeSeries.map(d => d.indoorTemp);
    const solAirTemps = timeSeries.map(d => d.solAirRoofTemp);

    const lowerComfort = Array(24).fill(comfortLimits.lower);
    const upperComfort = Array(24).fill(comfortLimits.upper);

    if (this.tempChart) {
      this.tempChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.tempChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Outdoor Ambient Temp (°C)',
            data: outdoorTemps,
            borderColor: '#94a3b8',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.35,
            order: 2
          },
          {
            label: 'Indoor Temp (°C) [Estimated]',
            data: indoorTemps,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            fill: false,
            borderWidth: 3.5,
            pointRadius: 3,
            pointBackgroundColor: '#38bdf8',
            pointHoverRadius: 6,
            tension: 0.35,
            order: 1
          },
          {
            label: 'Sol-Air Roof Temp (°C)',
            data: solAirTemps,
            borderColor: '#f97316',
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            tension: 0.35,
            order: 3
          },
          {
            label: 'Upper Comfort Limit (80% Acceptability)',
            data: upperComfort,
            borderColor: 'rgba(74, 222, 128, 0.6)',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: '+1',
            backgroundColor: 'rgba(74, 222, 128, 0.07)',
            order: 4
          },
          {
            label: 'Lower Comfort Limit',
            data: lowerComfort,
            borderColor: 'rgba(74, 222, 128, 0.6)',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            order: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: "'Inter', sans-serif", size: 11 },
              boxWidth: 14,
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            padding: 10,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: '#94a3b8',
              font: { size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });
  }

  /**
   * Render Component Heat Gain & Loss Breakdown Chart
   */
  renderHeatBreakdownChart(canvasId, energyBreakdown) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.breakdownChart) {
      this.breakdownChart.destroy();
    }

    const categories = ['Roof', 'Walls', 'Windows & Glazing', 'Ventilation / Infiltration', 'Ground Floor'];
    const gains = [
      energyBreakdown.gains.roof,
      energyBreakdown.gains.walls,
      energyBreakdown.gains.windows,
      energyBreakdown.gains.ventilation,
      energyBreakdown.gains.floor
    ];
    const losses = [
      -energyBreakdown.losses.roof,
      -energyBreakdown.losses.walls,
      -energyBreakdown.losses.windows,
      -energyBreakdown.losses.ventilation,
      -energyBreakdown.losses.floor
    ];

    const ctx = canvas.getContext('2d');
    this.breakdownChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Heat Influx / Gain (kWh/day)',
            data: gains,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Heat Dissipation / Loss (kWh/day)',
            data: losses,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bars for clean component comparison
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const val = Math.abs(context.parsed.x).toFixed(2);
                return `${context.dataset.label}: ${val} kWh/day`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Heat Exchange (kWh / day)',
              color: '#94a3b8',
              font: { size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: {
              color: '#94a3b8',
              callback: (value) => Math.abs(value).toFixed(1)
            }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e2e8f0', font: { size: 11 } }
          }
        }
      }
    });
  }

  /**
   * Render Multi-Design Comparison Chart
   */
  renderComparisonChart(canvasId, outdoorTemps, savedConfigs, comfortLimits) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.comparisonChart) {
      this.comparisonChart.destroy();
    }

    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const palette = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899'];

    const datasets = [
      {
        label: 'Outdoor Ambient',
        data: outdoorTemps,
        borderColor: '#64748b',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.35
      }
    ];

    savedConfigs.forEach((config, idx) => {
      datasets.push({
        label: `${config.name} (Tmean: ${config.kpis.meanIndoorTemp}°C)`,
        data: config.timeSeries.map(d => d.indoorTemp),
        borderColor: palette[idx % palette.length],
        borderWidth: 3,
        pointRadius: 2,
        tension: 0.35
      });
    });

    // Comfort limits
    if (comfortLimits) {
      datasets.push({
        label: 'Comfort Band',
        data: Array(24).fill(comfortLimits.upper),
        borderColor: 'rgba(34, 197, 94, 0.4)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        fill: '+1',
        backgroundColor: 'rgba(34, 197, 94, 0.05)'
      });
      datasets.push({
        label: 'Lower Limit',
        data: Array(24).fill(comfortLimits.lower),
        borderColor: 'rgba(34, 197, 94, 0.4)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false
      });
    }

    const ctx = canvas.getContext('2d');
    this.comparisonChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1', font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: { color: '#94a3b8' }
          },
          y: {
            title: { display: true, text: 'Indoor Temperature (°C)', color: '#94a3b8' },
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
}

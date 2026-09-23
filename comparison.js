/**
 * PASSIVE SHELTER DESIGNER - Design Comparison Module
 * Stores, manages, and evaluates multiple shelter configurations side-by-side.
 */

class DesignComparisonManager {
  constructor() {
    this.configurations = [];
    this.maxConfigs = 4;
    this.initDefaultPresets();
  }

  initDefaultPresets() {
    // We will initialize with 2 realistic baseline engineering variants after initial simulation
  }

  saveConfiguration(name, climate, geometry, materials, simulationResults) {
    if (this.configurations.length >= this.maxConfigs) {
      this.configurations.shift(); // Remove oldest if at max
    }

    const configId = 'cfg_' + Date.now();
    const config = {
      id: configId,
      name: name || `Design Variant ${this.configurations.length + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      climate: JSON.parse(JSON.stringify(climate)),
      geometry: JSON.parse(JSON.stringify(geometry)),
      materials: JSON.parse(JSON.stringify(materials)),
      kpis: simulationResults.kpis,
      envelopes: simulationResults.envelopes,
      energyBreakdown: simulationResults.energyBreakdown,
      timeSeries: simulationResults.timeSeries
    };

    this.configurations.push(config);
    return config;
  }

  removeConfiguration(configId) {
    this.configurations = this.configurations.filter(c => c.id !== configId);
  }

  clearAll() {
    this.configurations = [];
  }

  getConfigurations() {
    return this.configurations;
  }

  /**
   * Generates comparison table HTML
   */
  generateComparisonTableHTML() {
    if (this.configurations.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h4>No Design Variants Saved Yet</h4>
          <p>Run a simulation and click <strong>"Save to Comparison"</strong> to compare different shelter designs, envelope materials, or orientations side-by-side.</p>
        </div>
      `;
    }

    // Find best performing metrics for highlight
    const minMaxTemp = Math.min(...this.configurations.map(c => c.kpis.maxIndoorTemp));
    const minSwing = Math.min(...this.configurations.map(c => c.kpis.tempSwing));
    const maxComfort = Math.max(...this.configurations.map(c => c.kpis.comfortHours));
    const minSolarGain = Math.min(...this.configurations.map(c => c.kpis.solarHeatGainKWh));

    let html = `
      <div class="table-responsive">
        <table class="engineering-table comparison-matrix">
          <thead>
            <tr>
              <th style="min-width: 180px;">Design Parameter / KPI</th>
    `;

    this.configurations.forEach(cfg => {
      html += `
        <th class="cfg-header">
          <div class="cfg-title">${cfg.name}</div>
          <div class="cfg-subtitle">Saved: ${cfg.timestamp}</div>
          <button class="btn-icon btn-remove-cfg" onclick="window.app.removeConfig('${cfg.id}')" title="Delete Variant">✕</button>
        </th>
      `;
    });

    html += `
            </tr>
          </thead>
          <tbody>
            <tr class="section-divider"><td colspan="${this.configurations.length + 1}">Envelope & Geometry Specifications</td></tr>
            <tr>
              <td class="param-name">Wall Construction & U-Value</td>
              ${this.configurations.map(c => `<td><strong>${MATERIALS_DATABASE.walls[c.materials.wallMaterial]?.name || c.materials.wallMaterial}</strong><br><span class="unit-pill">U: ${c.envelopes.U_wall} W/m²K</span></td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Roof Construction & U-Value</td>
              ${this.configurations.map(c => `<td><strong>${MATERIALS_DATABASE.roofs[c.materials.roofMaterial]?.name || c.materials.roofMaterial}</strong><br><span class="unit-pill">U: ${c.envelopes.U_roof} W/m²K</span></td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Orientation & Roof Type</td>
              ${this.configurations.map(c => `<td>Orientation: ${c.geometry.orientation}°<br>Roof: ${c.geometry.roofType.toUpperCase()}</td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Window-to-Wall Ratio (WWR)</td>
              ${this.configurations.map(c => `<td>Area: ${c.geometry.windowArea} m²<br>WWR: ${((c.geometry.windowArea / (c.envelopes.totalWallArea + Number(c.geometry.windowArea))) * 100).toFixed(1)}%</td>`).join('')}
            </tr>

            <tr class="section-divider"><td colspan="${this.configurations.length + 1}">Thermal Performance (Estimated / Model-Based)</td></tr>
            <tr>
              <td class="param-name">Peak Indoor Temp (Tmax)</td>
              ${this.configurations.map(c => {
                const isBest = c.kpis.maxIndoorTemp === minMaxTemp;
                return `<td class="${isBest ? 'best-val' : ''}">${c.kpis.maxIndoorTemp} °C ${isBest ? '<span class="best-badge">⭐ Lowest</span>' : ''}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td class="param-name">Minimum Indoor Temp (Tmin)</td>
              ${this.configurations.map(c => `<td>${c.kpis.minIndoorTemp} °C</td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Mean Indoor Temp (Tmean)</td>
              ${this.configurations.map(c => `<td><strong>${c.kpis.meanIndoorTemp} °C</strong></td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Diurnal Temp Swing (ΔTin)</td>
              ${this.configurations.map(c => {
                const isBest = c.kpis.tempSwing === minSwing;
                return `<td class="${isBest ? 'best-val' : ''}">±${c.kpis.tempSwing} °C (f = ${c.kpis.decrementFactor}) ${isBest ? '<span class="best-badge">⭐ Most Stable</span>' : ''}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td class="param-name">Daily Comfort Hours</td>
              ${this.configurations.map(c => {
                const isBest = c.kpis.comfortHours === maxComfort && maxComfort > 0;
                return `<td class="${isBest ? 'best-val' : ''}"><strong>${c.kpis.comfortHours} / 24 hrs</strong><br><span class="badge ${c.kpis.comfortStatusClass}">${c.kpis.comfortStatus}</span> ${isBest ? '<span class="best-badge">⭐ Best</span>' : ''}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td class="param-name">Solar Heat Gain (Glazing)</td>
              ${this.configurations.map(c => {
                const isBest = c.kpis.solarHeatGainKWh === minSolarGain;
                return `<td class="${isBest ? 'best-val' : ''}">${c.kpis.solarHeatGainKWh} kWh/day</td>`;
              }).join('')}
            </tr>
            <tr>
              <td class="param-name">Total Daily Heat Gain</td>
              ${this.configurations.map(c => `<td>${c.kpis.totalHeatGainKWh} kWh/day</td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Total Daily Heat Loss</td>
              ${this.configurations.map(c => `<td>${c.kpis.totalHeatLossKWh} kWh/day</td>`).join('')}
            </tr>
            <tr>
              <td class="param-name">Thermal Time Lag (ϕ)</td>
              ${this.configurations.map(c => `<td>${c.kpis.timeLag} hours shift</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    return html;
  }
}

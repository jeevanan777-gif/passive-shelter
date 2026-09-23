/**
 * PASSIVE SHELTER DESIGNER - Main Application Coordinator
 * Handles user interactions, reactive UI updates, 3D synchronization,
 * thermal simulation triggers, export features, and state persistence.
 */

class PassiveShelterApp {
  constructor() {
    this.viewer3D = null;
    this.chartsManager = null;
    this.comparisonManager = null;
    this.lastSimulationResults = null;

    // Active state
    this.climate = { ...CLIMATE_PRESETS.hot_dry };
    this.geometry = {
      length: 5.0,
      width: 4.0,
      height: 3.0,
      wallThickness: 0.23,
      roofThickness: 0.15,
      windowArea: 2.2,
      doorArea: 1.8,
      orientation: 0,
      roofType: 'flat'
    };
    this.materials = {
      wallMaterial: 'brick_common',
      roofMaterial: 'rcc_slab',
      floorMaterial: 'concrete_ground',
      glazingType: 'single_clear'
    };

    this.activeSection = 'dashboard';
  }

  init() {
    console.log("Initializing PASSIVE SHELTER DESIGNER...");

    // Initialize sub-systems
    this.viewer3D = new ShelterViewer3D('viewer3d-container');
    this.chartsManager = new ShelterChartsManager();
    this.comparisonManager = new DesignComparisonManager();

    // Populate dropdowns & forms
    this.populateSelectOptions();
    this.syncFormFieldsWithState();
    this.bindEvents();

    // Pre-populate comparison baseline configurations for instant evaluation
    this.seedDefaultComparisonVariants();

    // Run initial baseline simulation
    this.runThermalAnalysis();

    // Setup tab navigation
    this.setupNavigation();

    // Trigger canvas size sync once DOM layout is settled
    setTimeout(() => {
      if (this.viewer3D) this.viewer3D.onWindowResize();
    }, 250);
  }

  populateSelectOptions() {
    // Wall materials
    const wallSelect = document.getElementById('wall-material');
    if (wallSelect) {
      wallSelect.innerHTML = Object.entries(MATERIALS_DATABASE.walls).map(([key, mat]) => `
        <option value="${key}">${mat.name} (k: ${mat.k}, ρ: ${mat.rho})</option>
      `).join('');
      wallSelect.value = this.materials.wallMaterial;
    }

    // Roof materials
    const roofSelect = document.getElementById('roof-material');
    if (roofSelect) {
      roofSelect.innerHTML = Object.entries(MATERIALS_DATABASE.roofs).map(([key, mat]) => `
        <option value="${key}">${mat.name} (α: ${mat.alpha}, k: ${mat.k})</option>
      `).join('');
      roofSelect.value = this.materials.roofMaterial;
    }

    // Floor materials
    const floorSelect = document.getElementById('floor-material');
    if (floorSelect) {
      floorSelect.innerHTML = Object.entries(MATERIALS_DATABASE.floors).map(([key, mat]) => `
        <option value="${key}">${mat.name} (k: ${mat.k})</option>
      `).join('');
      floorSelect.value = this.materials.floorMaterial;
    }

    // Glazing types
    const glazingSelect = document.getElementById('glazing-type');
    if (glazingSelect) {
      glazingSelect.innerHTML = Object.entries(MATERIALS_DATABASE.glazing).map(([key, g]) => `
        <option value="${key}">${g.name} (U: ${g.uValue}, SHGC: ${g.shgc})</option>
      `).join('');
      glazingSelect.value = this.materials.glazingType;
    }

    // Climate presets
    const climateSelect = document.getElementById('climate-preset');
    if (climateSelect) {
      climateSelect.innerHTML = Object.entries(CLIMATE_PRESETS).map(([key, preset]) => `
        <option value="${key}">${preset.name}</option>
      `).join('');
      climateSelect.value = 'hot_dry';
    }
  }

  syncFormFieldsWithState() {
    // Climate inputs
    this.setInputValue('ambient-temp', this.climate.ambientTemp);
    this.setInputValue('diurnal-range', this.climate.diurnalRange);
    this.setInputValue('solar-radiation', this.climate.peakSolarRadiation);
    this.setInputValue('relative-humidity', this.climate.relativeHumidity);
    this.setInputValue('wind-speed', this.climate.windSpeed);
    this.setInputValue('location-name', this.climate.location);

    // Geometry inputs (numbers and sliders)
    this.syncNumberAndRange('geom-length', 'geom-length-range', this.geometry.length);
    this.syncNumberAndRange('geom-width', 'geom-width-range', this.geometry.width);
    this.syncNumberAndRange('geom-height', 'geom-height-range', this.geometry.height);
    this.syncNumberAndRange('geom-wall-thick', 'geom-wall-thick-range', this.geometry.wallThickness);
    this.syncNumberAndRange('geom-roof-thick', 'geom-roof-thick-range', this.geometry.roofThickness);
    this.syncNumberAndRange('geom-window-area', 'geom-window-area-range', this.geometry.windowArea);
    this.syncNumberAndRange('geom-door-area', 'geom-door-area-range', this.geometry.doorArea);
    this.syncNumberAndRange('geom-orientation', 'geom-orientation-range', this.geometry.orientation);

    // Roof type radio / select
    const roofTypeSelect = document.getElementById('geom-roof-type');
    if (roofTypeSelect) roofTypeSelect.value = this.geometry.roofType;

    this.updateMaterialPropertyBadges();
  }

  syncNumberAndRange(numId, rangeId, value) {
    const numEl = document.getElementById(numId);
    const rangeEl = document.getElementById(rangeId);
    if (numEl) numEl.value = value;
    if (rangeEl) rangeEl.value = value;
  }

  setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  bindEvents() {
    // 1. Climate Preset change
    const climateSelect = document.getElementById('climate-preset');
    if (climateSelect) {
      climateSelect.addEventListener('change', (e) => {
        const preset = CLIMATE_PRESETS[e.target.value];
        if (preset) {
          this.climate = { ...preset };
          this.syncFormFieldsWithState();
          this.showToast(`Applied Climate Preset: ${preset.name}`);
          this.runThermalAnalysis();
        }
      });
    }

    // Climate manual inputs
    const climateInputs = ['ambient-temp', 'diurnal-range', 'solar-radiation', 'relative-humidity', 'wind-speed', 'location-name'];
    climateInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.readClimateFromInputs();
          const presetSelect = document.getElementById('climate-preset');
          if (presetSelect && presetSelect.value !== 'custom') {
            presetSelect.value = 'custom';
          }
        });
      }
    });

    // 2. Geometry inputs (two-way sync between number and range sliders)
    const geomPairs = [
      { num: 'geom-length', range: 'geom-length-range', key: 'length' },
      { num: 'geom-width', range: 'geom-width-range', key: 'width' },
      { num: 'geom-height', range: 'geom-height-range', key: 'height' },
      { num: 'geom-wall-thick', range: 'geom-wall-thick-range', key: 'wallThickness' },
      { num: 'geom-roof-thick', range: 'geom-roof-thick-range', key: 'roofThickness' },
      { num: 'geom-window-area', range: 'geom-window-area-range', key: 'windowArea' },
      { num: 'geom-door-area', range: 'geom-door-area-range', key: 'doorArea' },
      { num: 'geom-orientation', range: 'geom-orientation-range', key: 'orientation' }
    ];

    geomPairs.forEach(({ num, range, key }) => {
      const numEl = document.getElementById(num);
      const rangeEl = document.getElementById(range);
      if (numEl && rangeEl) {
        numEl.addEventListener('input', () => {
          let val = parseFloat(numEl.value);
          if (isNaN(val)) val = 1;
          rangeEl.value = val;
          this.geometry[key] = val;
          this.onGeometryUpdated();
        });
        rangeEl.addEventListener('input', () => {
          const val = parseFloat(rangeEl.value);
          numEl.value = val;
          this.geometry[key] = val;
          this.onGeometryUpdated();
        });
      }
    });

    // Roof Type selector
    const roofTypeSelect = document.getElementById('geom-roof-type');
    if (roofTypeSelect) {
      roofTypeSelect.addEventListener('change', (e) => {
        this.geometry.roofType = e.target.value;
        this.onGeometryUpdated();
      });
    }

    // 3. Materials selector change
    const matSelectors = [
      { id: 'wall-material', key: 'wallMaterial' },
      { id: 'roof-material', key: 'roofMaterial' },
      { id: 'floor-material', key: 'floorMaterial' },
      { id: 'glazing-type', key: 'glazingType' }
    ];

    matSelectors.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.materials[key] = e.target.value;
          this.updateMaterialPropertyBadges();
          if (this.viewer3D) {
            this.viewer3D.rebuildShelter(this.geometry, this.materials);
          }
        });
      }
    });

    // 4. Prominent Run Thermal Analysis Button
    const runBtn = document.getElementById('btn-run-simulation');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this.animateSimulationRun();
      });
    }

    // Top action bar Run button
    const runBtnTop = document.getElementById('btn-run-simulation-top');
    if (runBtnTop) {
      runBtnTop.addEventListener('click', () => {
        this.animateSimulationRun();
      });
    }

    // Reset Button
    const resetBtn = document.getElementById('btn-reset-defaults');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }

    // Save to Comparison Button
    const saveCfgBtn = document.getElementById('btn-save-comparison');
    if (saveCfgBtn) {
      saveCfgBtn.addEventListener('click', () => {
        this.promptSaveConfiguration();
      });
    }

    // Export CSV Button
    const exportBtn = document.getElementById('btn-export-results');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportResultsCSV();
      });
    }

    // Print Report Button
    const printBtn = document.getElementById('btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // 3D Viewport Controls
    const btnHeatmap = document.getElementById('btn-toggle-heatmap');
    if (btnHeatmap) {
      btnHeatmap.addEventListener('click', () => {
        if (this.viewer3D) {
          const isHeatmap = this.viewer3D.toggleHeatmapMode();
          btnHeatmap.classList.toggle('active', isHeatmap);
          btnHeatmap.textContent = isHeatmap ? '🔥 Heatmap Active' : '🌡️ Heatmap Mode';
        }
      });
    }

    const btnCameraReset = document.getElementById('btn-camera-reset');
    if (btnCameraReset) {
      btnCameraReset.addEventListener('click', () => {
        if (this.viewer3D) this.viewer3D.setCameraView('isometric');
      });
    }

    const btnCameraTop = document.getElementById('btn-camera-top');
    if (btnCameraTop) {
      btnCameraTop.addEventListener('click', () => {
        if (this.viewer3D) this.viewer3D.setCameraView('top');
      });
    }

    const btnCameraFront = document.getElementById('btn-camera-front');
    if (btnCameraFront) {
      btnCameraFront.addEventListener('click', () => {
        if (this.viewer3D) this.viewer3D.setCameraView('front');
      });
    }

    // Solar time slider for 3D sun direction
    const sunSlider = document.getElementById('sun-hour-slider');
    const sunLabel = document.getElementById('sun-hour-label');
    if (sunSlider) {
      sunSlider.addEventListener('input', (e) => {
        const hour = parseInt(e.target.value);
        if (sunLabel) sunLabel.textContent = `${String(hour).padStart(2, '0')}:00`;
        this.updateSunPosition(hour);
      });
    }
  }

  readClimateFromInputs() {
    this.climate.ambientTemp = parseFloat(document.getElementById('ambient-temp')?.value) || 35.0;
    this.climate.diurnalRange = parseFloat(document.getElementById('diurnal-range')?.value) || 12.0;
    this.climate.peakSolarRadiation = parseFloat(document.getElementById('solar-radiation')?.value) || 850;
    this.climate.relativeHumidity = parseFloat(document.getElementById('relative-humidity')?.value) || 30;
    this.climate.windSpeed = parseFloat(document.getElementById('wind-speed')?.value) || 3.0;
    this.climate.location = document.getElementById('location-name')?.value || "Custom Site";
    this.climate.groundTemp = this.climate.ambientTemp - 2.5;
  }

  onGeometryUpdated() {
    if (this.viewer3D) {
      this.viewer3D.rebuildShelter(this.geometry, this.materials);
    }
    this.updateMaterialPropertyBadges();
  }

  updateSunPosition(hour) {
    if (!this.viewer3D) return;
    const solarData = get24HourSolarIrradiance(this.climate.latitude || 25, this.climate.peakSolarRadiation || 800, this.geometry.orientation, this.geometry.roofType);
    const curr = solarData[hour] || solarData[12];
    this.viewer3D.setSolarTime(hour, curr.solarAzimuthDeg, curr.betaDeg);
  }

  updateMaterialPropertyBadges() {
    const U_wall = calculateOpaqueUValue(this.materials.wallMaterial, 'walls', this.geometry.wallThickness);
    const U_roof = calculateOpaqueUValue(this.materials.roofMaterial, 'roofs', this.geometry.roofThickness);
    const U_floor = calculateOpaqueUValue(this.materials.floorMaterial, 'floors', 0.1);
    const glazing = MATERIALS_DATABASE.glazing[this.materials.glazingType] || MATERIALS_DATABASE.glazing.single_clear;

    const wallBadge = document.getElementById('badge-u-wall');
    const roofBadge = document.getElementById('badge-u-roof');
    const floorBadge = document.getElementById('badge-u-floor');
    const winBadge = document.getElementById('badge-u-win');

    if (wallBadge) wallBadge.textContent = `U: ${U_wall} W/m²K`;
    if (roofBadge) roofBadge.textContent = `U: ${U_roof} W/m²K`;
    if (floorBadge) floorBadge.textContent = `U: ${U_floor} W/m²K`;
    if (winBadge) winBadge.textContent = `U: ${glazing.uValue} W/m²K (SHGC: ${glazing.shgc})`;

    // Material Details Card
    const wallMat = MATERIALS_DATABASE.walls[this.materials.wallMaterial];
    const roofMat = MATERIALS_DATABASE.roofs[this.materials.roofMaterial];
    const detailBox = document.getElementById('material-details-summary');
    if (detailBox && wallMat && roofMat) {
      detailBox.innerHTML = `
        <div class="prop-row"><span>Wall Material:</span><strong>${wallMat.name}</strong></div>
        <div class="prop-row"><span>Conductivity (k):</span><strong>${wallMat.k} W/m·K</strong></div>
        <div class="prop-row"><span>Density (ρ):</span><strong>${wallMat.rho} kg/m³</strong></div>
        <div class="prop-row"><span>Specific Heat (cp):</span><strong>${wallMat.cp} J/kg·K</strong></div>
        <div class="prop-row"><span>Roof Absorptivity (α):</span><strong>${roofMat.alpha}</strong> (${roofMat.alpha <= 0.3 ? 'Cool Reflective' : 'Standard Dark'})</div>
      `;
    }
  }

  animateSimulationRun() {
    const btn = document.getElementById('btn-run-simulation');
    const btnTop = document.getElementById('btn-run-simulation-top');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Solving Energy Balance...`;
    }
    if (btnTop) {
      btnTop.disabled = true;
    }

    setTimeout(() => {
      this.readClimateFromInputs();
      this.runThermalAnalysis();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `🚀 RUN THERMAL ANALYSIS`;
      }
      if (btnTop) {
        btnTop.disabled = false;
      }
      this.showToast(`Simulation complete: Periodic steady-state reached.`);
    }, 250);
  }

  runThermalAnalysis() {
    this.readClimateFromInputs();
    const results = ThermalSimulationEngine.runSimulation(this.climate, this.geometry, this.materials);
    this.lastSimulationResults = results;

    // Update KPI Cards
    this.updateKPICards(results.kpis);

    // Update Charts
    if (this.chartsManager) {
      this.chartsManager.render24HourTempChart('chart-24h-temp', results.timeSeries, {
        lower: results.kpis.comfortLowerLimit,
        upper: results.kpis.comfortUpperLimit
      });

      this.chartsManager.renderHeatBreakdownChart('chart-heat-breakdown', results.energyBreakdown);

      const configs = this.comparisonManager.getConfigurations();
      const outdoorTemps = results.timeSeries.map(d => d.outdoorTemp);
      this.chartsManager.renderComparisonChart('chart-comparison', outdoorTemps, configs, {
        lower: results.kpis.comfortLowerLimit,
        upper: results.kpis.comfortUpperLimit
      });
    }

    // Update Adaptive Comfort Indicator & Insights
    this.updateComfortDisplay(results.kpis, results.envelopes);

    // Update 3D Solar at noon
    this.updateSunPosition(12);

    // Update Comparison table
    this.renderComparisonTable();

    return results;
  }

  updateKPICards(kpis) {
    this.setText('kpi-mean-temp', `${kpis.meanIndoorTemp} °C`);
    this.setText('kpi-max-temp', `${kpis.maxIndoorTemp} °C`);
    this.setText('kpi-min-temp', `${kpis.minIndoorTemp} °C`);
    this.setText('kpi-temp-swing', `±${kpis.tempSwing} °C`);
    this.setText('kpi-decrement-factor', `Decrement factor: f = ${kpis.decrementFactor}`);
    this.setText('kpi-solar-gain', `${kpis.solarHeatGainKWh} kWh/d`);
    this.setText('kpi-total-gain', `${kpis.totalHeatGainKWh} kWh/d`);
    this.setText('kpi-total-loss', `${kpis.totalHeatLossKWh} kWh/d`);
    this.setText('kpi-comfort-hours', `${kpis.comfortHours} hrs/day`);
    this.setText('kpi-comfort-badge', kpis.comfortStatus);

    const badge = document.getElementById('kpi-comfort-badge');
    if (badge) {
      badge.className = `kpi-badge ${kpis.comfortStatusClass}`;
    }
  }

  updateComfortDisplay(kpis, envelopes) {
    const comfortBox = document.getElementById('comfort-assessment-summary');
    if (!comfortBox) return;

    let advice = "";
    if (kpis.comfortHours >= 18) {
      advice = "The building envelope possesses high thermal inertia and sufficient damping. Day-night temperature fluctuation is effectively moderated within the adaptive comfort envelope.";
    } else if (kpis.warmHours > 8) {
      advice = "Overheating observed during peak solar hours. Recommendations: reduce solar absorptivity with a Cool Roof coating (α ≤ 0.25), enhance nocturnal cross-ventilation, and add exterior window shading.";
    } else if (kpis.coldHours > 8) {
      advice = "Under-heating observed. Recommendations: increase south-facing direct solar glazing, improve envelope insulation (lower U-value), and minimize uncontrolled draft infiltration.";
    } else {
      advice = "Moderate thermal conditions. Diurnal temperature swing is partially damped. Fine-tune window-to-wall ratio and wall thickness to expand comfort duration.";
    }

    comfortBox.innerHTML = `
      <div class="comfort-header">
        <div class="comfort-score">${kpis.comfortHours} / 24 <span class="unit">Comfort Hours</span></div>
        <div class="kpi-badge ${kpis.comfortStatusClass}">${kpis.comfortStatus}</div>
      </div>
      <div class="comfort-limits-bar">
        <span>Adaptive Neutral: <strong>${kpis.neutralComfortTemp}°C</strong></span>
        <span>Acceptable Comfort Range: <strong>${kpis.comfortLowerLimit}°C — ${kpis.comfortUpperLimit}°C</strong></span>
      </div>
      <p class="comfort-description">${advice}</p>
      <div class="meta-metrics-grid">
        <div class="meta-item"><label>Thermal Time Lag (ϕ):</label> <strong>${kpis.timeLag} hours</strong></div>
        <div class="meta-item"><label>Decrement Factor (f):</label> <strong>${kpis.decrementFactor}</strong></div>
        <div class="meta-item"><label>Effective Mass Heat Cap:</label> <strong>${envelopes.thermalCapacitanceMJ} MJ/K</strong></div>
        <div class="meta-item"><label>Ventilation Rate:</label> <strong>${envelopes.totalACH} ACH</strong></div>
      </div>
    `;
  }

  promptSaveConfiguration() {
    if (!this.lastSimulationResults) return;
    const defaultName = `Shelter Variant ${this.comparisonManager.getConfigurations().length + 1} (${MATERIALS_DATABASE.walls[this.materials.wallMaterial]?.name.split(' ')[0]} + ${this.geometry.roofType})`;
    const name = prompt("Enter a descriptive name for this shelter design configuration:", defaultName);
    if (name) {
      this.comparisonManager.saveConfiguration(name, this.climate, this.geometry, this.materials, this.lastSimulationResults);
      this.renderComparisonTable();
      this.updateComparisonChart();
      this.showToast(`Saved configuration: "${name}" to comparison matrix.`);
    }
  }

  seedDefaultComparisonVariants() {
    // 1. Baseline Standard Brick with RCC Roof
    const resA = ThermalSimulationEngine.runSimulation(this.climate, this.geometry, {
      wallMaterial: 'brick_common',
      roofMaterial: 'rcc_slab',
      floorMaterial: 'concrete_ground',
      glazingType: 'single_clear'
    });
    this.comparisonManager.saveConfiguration("Baseline 1: Standard Brick + RCC Slab", this.climate, this.geometry, {
      wallMaterial: 'brick_common',
      roofMaterial: 'rcc_slab',
      floorMaterial: 'concrete_ground',
      glazingType: 'single_clear'
    }, resA);

    // 2. High Performance Passive: CSEB + Cool Roof + Low-E
    const resB = ThermalSimulationEngine.runSimulation(this.climate, { ...this.geometry, wallThickness: 0.28, roofType: 'flat' }, {
      wallMaterial: 'cseb',
      roofMaterial: 'cool_roof',
      floorMaterial: 'concrete_ground',
      glazingType: 'low_e_double'
    });
    this.comparisonManager.saveConfiguration("Passive Optimized: CSEB + Cool Roof (High Mass)", this.climate, { ...this.geometry, wallThickness: 0.28, roofType: 'flat' }, {
      wallMaterial: 'cseb',
      roofMaterial: 'cool_roof',
      floorMaterial: 'concrete_ground',
      glazingType: 'low_e_double'
    }, resB);
  }

  removeConfig(configId) {
    this.comparisonManager.removeConfiguration(configId);
    this.renderComparisonTable();
    this.updateComparisonChart();
  }

  renderComparisonTable() {
    const container = document.getElementById('comparison-table-container');
    if (container) {
      container.innerHTML = this.comparisonManager.generateComparisonTableHTML();
    }
  }

  updateComparisonChart() {
    if (!this.chartsManager || !this.lastSimulationResults) return;
    const configs = this.comparisonManager.getConfigurations();
    const outdoorTemps = this.lastSimulationResults.timeSeries.map(d => d.outdoorTemp);
    this.chartsManager.renderComparisonChart('chart-comparison', outdoorTemps, configs, {
      lower: this.lastSimulationResults.kpis.comfortLowerLimit,
      upper: this.lastSimulationResults.kpis.comfortUpperLimit
    });
  }

  resetToDefaults() {
    if (!confirm("Reset all geometry, material, and climate parameters to baseline values?")) return;
    this.climate = { ...CLIMATE_PRESETS.hot_dry };
    this.geometry = {
      length: 5.0,
      width: 4.0,
      height: 3.0,
      wallThickness: 0.23,
      roofThickness: 0.15,
      windowArea: 2.2,
      doorArea: 1.8,
      orientation: 0,
      roofType: 'flat'
    };
    this.materials = {
      wallMaterial: 'brick_common',
      roofMaterial: 'rcc_slab',
      floorMaterial: 'concrete_ground',
      glazingType: 'single_clear'
    };

    const presetSelect = document.getElementById('climate-preset');
    if (presetSelect) presetSelect.value = 'hot_dry';

    this.syncFormFieldsWithState();
    if (this.viewer3D) {
      this.viewer3D.rebuildShelter(this.geometry, this.materials);
    }
    this.runThermalAnalysis();
    this.showToast("Parameters reset to engineering baseline.");
  }

  exportResultsCSV() {
    if (!this.lastSimulationResults) return;
    const res = this.lastSimulationResults;

    let csv = "PASSIVE SHELTER DESIGNER - THERMAL ANALYSIS REPORT\n";
    csv += "Project: Software Based Model Development for Design of Area-Specific Shelter for Thermal Comfort Maintenance\n";
    csv += `Timestamp,${res.metadata.timestamp}\n`;
    csv += `Location / Climate,${this.climate.location} (Ambient: ${this.climate.ambientTemp} C, Swing: ${this.climate.diurnalRange} C)\n`;
    csv += `Shelter Dimensions,L=${this.geometry.length}m x W=${this.geometry.width}m x H=${this.geometry.height}m (Vol=${res.envelopes.volume} m3)\n`;
    csv += `Wall Construction,${MATERIALS_DATABASE.walls[this.materials.wallMaterial]?.name} (U=${res.envelopes.U_wall} W/m2K)\n`;
    csv += `Roof Construction,${MATERIALS_DATABASE.roofs[this.materials.roofMaterial]?.name} (U=${res.envelopes.U_roof} W/m2K)\n`;
    csv += `Glazing,${MATERIALS_DATABASE.glazing[this.materials.glazingType]?.name} (U=${res.envelopes.U_win} W/m2K)\n\n`;

    csv += "KEY PERFORMANCE INDICATORS (Model-based Estimated Results)\n";
    csv += `Mean Indoor Temp (C),${res.kpis.meanIndoorTemp}\n`;
    csv += `Max Indoor Temp (C),${res.kpis.maxIndoorTemp}\n`;
    csv += `Min Indoor Temp (C),${res.kpis.minIndoorTemp}\n`;
    csv += `Temperature Swing (C),${res.kpis.tempSwing}\n`;
    csv += `Decrement Factor (f),${res.kpis.decrementFactor}\n`;
    csv += `Thermal Time Lag (hrs),${res.kpis.timeLag}\n`;
    csv += `Solar Heat Gain (Glazing) (kWh/day),${res.kpis.solarHeatGainKWh}\n`;
    csv += `Total Daily Heat Gain (kWh/day),${res.kpis.totalHeatGainKWh}\n`;
    csv += `Total Daily Heat Loss (kWh/day),${res.kpis.totalHeatLossKWh}\n`;
    csv += `Adaptive Thermal Comfort Hours / 24 hrs,${res.kpis.comfortHours}\n`;
    csv += `Comfort Status,${res.kpis.comfortStatus}\n\n`;

    csv += "24-HOUR HOURLY SIMULATION TIME SERIES\n";
    csv += "Hour,Time,Outdoor Temp (C),Indoor Temp (C),Sol-Air Roof Temp (C),Roof Heat Flow (W),Walls Heat Flow (W),Floor Heat Flow (W),Windows Heat Flow (W),Ventilation Flow (W),Net Heat Flow (W)\n";

    res.timeSeries.forEach(r => {
      csv += `${r.hour},${r.timeLabel},${r.outdoorTemp},${r.indoorTemp},${r.solAirRoofTemp},${r.heatGainRoof},${r.heatGainWalls},${r.heatGainFloor},${r.heatGainWindows},${r.heatGainVentilation},${r.netHeatGain}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Passive_Shelter_Thermal_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Exported simulation dataset to CSV.");
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = item.getAttribute('data-target');
        if (targetSection) {
          this.switchSection(targetSection);
        }
      });
    });
  }

  switchSection(sectionId) {
    this.activeSection = sectionId;
    
    // Update active nav link
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-target') === sectionId);
    });

    // Update visible section card
    document.querySelectorAll('.app-panel-section').forEach(sec => {
      if (sec.id === `section-${sectionId}`) {
        sec.classList.remove('hidden');
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // In full dashboard view, keep all visible or filter depending on section
        // Here we highlight and smooth scroll to section
      }
    });

    // If 3D view is visible, trigger resize refresh
    if (this.viewer3D) {
      setTimeout(() => this.viewer3D.onWindowResize(), 100);
    }
  }

  showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast-show';
    setTimeout(() => {
      toast.className = '';
    }, 3200);
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

// Global instance initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PassiveShelterApp();
  window.app.init();
});

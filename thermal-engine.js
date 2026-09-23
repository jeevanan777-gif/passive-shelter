/**
 * PASSIVE SHELTER DESIGNER - Thermal Simulation Engine
 * Transparent lumped-parameter dynamic energy balance model.
 * 
 * DISCLAIMER:
 * This is an academic engineering prototype model based on first-principles
 * building physics (ASHRAE Fundamentals / ISO 13792). All outputs are 
 * labeled as "Estimated / Model-based Results" and are intended for 
 * passive design optimization and comparative analysis.
 */

class ThermalSimulationEngine {
  /**
   * Run full dynamic 24-hour thermal simulation
   * @param {Object} climate - Climate parameters
   * @param {Object} geometry - Shelter dimensions and openings
   * @param {Object} materials - Selected material keys and thicknesses
   * @returns {Object} Comprehensive simulation results, time-series, and KPIs
   */
  static runSimulation(climate, geometry, materials) {
    // 1. Unpack and validate geometry
    const length = Math.max(1, Number(geometry.length) || 5.0);
    const width = Math.max(1, Number(geometry.width) || 4.0);
    const height = Math.max(1.8, Number(geometry.height) || 3.0);
    const orientation = (Number(geometry.orientation) || 0) % 360;
    const roofType = geometry.roofType || 'flat';
    const windowArea = Math.min(Number(geometry.windowArea) || 2.0, (length * height) * 0.7);
    const doorArea = Math.min(Number(geometry.doorArea) || 1.8, (width * height) * 0.5);

    // Derived geometric quantities
    const floorArea = length * width; // m²
    const volume = floorArea * height; // m³
    
    // Wall areas based on orientation
    // Front and Back walls have length L; Left and Right walls have width W
    const areaFront = length * height - (windowArea * 0.7 + doorArea * 0.5);
    const areaBack = length * height - (windowArea * 0.3);
    const areaRight = width * height;
    const areaLeft = width * height - (doorArea * 0.5);
    const totalWallArea = 2 * (length + width) * height - (windowArea + doorArea);

    // Roof area adjusted for pitch
    let roofArea = floorArea;
    if (roofType === 'gable') {
      roofArea = floorArea / Math.cos(25 * Math.PI / 180); // 25 deg pitch
    } else if (roofType === 'shed') {
      roofArea = floorArea / Math.cos(15 * Math.PI / 180); // 15 deg pitch
    }

    // 2. Unpack Materials & Thermophysical Properties
    const wallMat = MATERIALS_DATABASE.walls[materials.wallMaterial] || MATERIALS_DATABASE.walls.brick_common;
    const roofMat = MATERIALS_DATABASE.roofs[materials.roofMaterial] || MATERIALS_DATABASE.roofs.rcc_slab;
    const floorMat = MATERIALS_DATABASE.floors[materials.floorMaterial] || MATERIALS_DATABASE.floors.concrete_ground;
    const glazing = MATERIALS_DATABASE.glazing[materials.glazingType || 'single_clear'] || MATERIALS_DATABASE.glazing.single_clear;

    const wallThickness = Number(geometry.wallThickness) || wallMat.defaultThickness;
    const roofThickness = Number(geometry.roofThickness) || roofMat.defaultThickness;
    const floorThickness = floorMat.defaultThickness;

    // Calculate overall U-values (W/m²·K)
    const U_wall = calculateOpaqueUValue(materials.wallMaterial, 'walls', wallThickness);
    const U_roof = calculateOpaqueUValue(materials.roofMaterial, 'roofs', roofThickness);
    const U_floor = calculateOpaqueUValue(materials.floorMaterial, 'floors', floorThickness);
    const U_win = glazing.uValue;
    const SHGC = glazing.shgc;

    const alpha_wall = wallMat.alpha;
    const alpha_roof = roofMat.alpha;
    const h_o = 22.7; // Exterior surface convection + radiation coefficient (W/m²·K)

    // 3. Thermal Capacitance (Thermal Mass)
    // Active internal thermal mass layer (effective depth approx. 100mm or half thickness)
    const d_eff_wall = Math.min(wallThickness / 2, 0.10);
    const d_eff_roof = Math.min(roofThickness / 2, 0.08);
    const d_eff_floor = Math.min(floorThickness, 0.08);

    const massWall = totalWallArea * d_eff_wall * wallMat.rho;
    const massRoof = roofArea * d_eff_roof * roofMat.rho;
    const massFloor = floorArea * d_eff_floor * floorMat.rho;

    const C_envelope = (massWall * wallMat.cp) + (massRoof * roofMat.cp) + (massFloor * floorMat.cp); // J/K
    const C_air = volume * 1.204 * 1005; // Air: density 1.204 kg/m³, cp 1005 J/kg·K
    
    // Effective lumped room capacitance (active participation factor)
    const C_eff = C_air + 0.30 * C_envelope; // Joules per Kelvin

    // 4. Climate & Diurnal Profile
    const ambientMean = Number(climate.ambientTemp);
    const diurnalRange = Number(climate.diurnalRange);
    const peakSolar = Number(climate.peakSolarRadiation);
    const windSpeed = Number(climate.windSpeed);
    const groundTemp = Number(climate.groundTemp) || (ambientMean - 2.0);

    const outdoorTemps = get24HourOutdoorTemperatures(ambientMean, diurnalRange);
    const solarData = get24HourSolarIrradiance(climate.latitude || 25.0, peakSolar, orientation, roofType);

    // Ventilation calculation
    // Air changes per hour: Base infiltration + wind-driven ventilation through openable area
    const openableWindowArea = windowArea * 0.5; // Assume 50% openable operable sash
    const Cv = 0.35; // Effectiveness of opening for natural cross ventilation
    const naturalACH = (Cv * openableWindowArea * windSpeed * 3600) / Math.max(volume, 10);
    const baseInfiltrationACH = 0.5; // Background infiltration ACH
    const totalACH = Math.min(25.0, baseInfiltrationACH + naturalACH); // Limit to realistic 25 ACH max

    const mdot_cp_vent = (1.204 * 1005 * (totalACH * volume)) / 3600; // W/K

    // 5. Dynamic Numerical Integration (3 consecutive 24-hr cycles to reach periodic steady-state)
    const timeStepsPerHour = 4; // 15-minute dt
    const dt = 3600 / timeStepsPerHour; // 900 seconds
    const totalSteps = 24 * timeStepsPerHour;
    const numCycles = 3; // 3 days spin-up

    let T_in = ambientMean; // Initial guess

    // Hourly arrays for reporting (last cycle)
    const results24 = [];
    let prevHour = -1;

    for (let cycle = 0; cycle < numCycles; cycle++) {
      for (let step = 0; step < totalSteps; step++) {
        const hour = Math.floor(step / timeStepsPerHour);
        const fractionOfHour = (step % timeStepsPerHour) / timeStepsPerHour;
        
        // Linear interpolation for current step outdoor temp and solar
        const nextHour = (hour + 1) % 24;
        const T_out_curr = outdoorTemps[hour] + fractionOfHour * (outdoorTemps[nextHour] - outdoorTemps[hour]);
        
        const solHour = solarData[hour];
        const solNext = solarData[nextHour];
        
        const I_roof_curr = solHour.roofIrradiance + fractionOfHour * (solNext.roofIrradiance - solHour.roofIrradiance);
        const I_front_curr = solHour.frontWallIrradiance + fractionOfHour * (solNext.frontWallIrradiance - solHour.frontWallIrradiance);
        const I_back_curr = solHour.backWallIrradiance + fractionOfHour * (solNext.backWallIrradiance - solHour.backWallIrradiance);
        const I_right_curr = solHour.rightWallIrradiance + fractionOfHour * (solNext.rightWallIrradiance - solHour.rightWallIrradiance);
        const I_left_curr = solHour.leftWallIrradiance + fractionOfHour * (solNext.leftWallIrradiance - solHour.leftWallIrradiance);

        // Sol-Air Temperatures
        // Long-wave radiation loss to night sky: ~4°C for horizontal surfaces, 0°C for vertical walls
        const skyRadiationDepressionRoof = (solHour.roofIrradiance > 50) ? 1.0 : 4.0;
        const T_sol_roof = T_out_curr + (alpha_roof * I_roof_curr) / h_o - skyRadiationDepressionRoof;
        const T_sol_front = T_out_curr + (alpha_wall * I_front_curr) / h_o;
        const T_sol_back = T_out_curr + (alpha_wall * I_back_curr) / h_o;
        const T_sol_right = T_out_curr + (alpha_wall * I_right_curr) / h_o;
        const T_sol_left = T_out_curr + (alpha_wall * I_left_curr) / h_o;

        // Instantaneous Heat Flows (Watts)
        const Q_roof = U_roof * roofArea * (T_sol_roof - T_in);
        const Q_walls = (U_wall * areaFront * (T_sol_front - T_in)) +
                        (U_wall * areaBack * (T_sol_back - T_in)) +
                        (U_wall * areaRight * (T_sol_right - T_in)) +
                        (U_wall * areaLeft * (T_sol_left - T_in));
        
        const Q_floor = U_floor * floorArea * (groundTemp - T_in);
        
        // Window transmitted solar gain + conduction
        // Window assumed on front wall
        const Q_sol_win = windowArea * SHGC * I_front_curr;
        const Q_cond_win = U_win * windowArea * (T_out_curr - T_in);
        const Q_win_total = Q_sol_win + Q_cond_win;

        // Ventilation & Infiltration
        const Q_vent = mdot_cp_vent * (T_out_curr - T_in);

        // Internal Casual Heat Gain (1-2 occupants, low power LED, approx 150 W)
        const Q_internal = 150;

        // Net Heat Gain (W)
        const Q_net = Q_roof + Q_walls + Q_floor + Q_win_total + Q_vent + Q_internal;

        // Dynamic Temperature Step
        const dT_in = (Q_net / C_eff) * dt;
        T_in += dT_in;

        // On the final 24-hr cycle, record hourly results
        if (cycle === numCycles - 1 && hour !== prevHour && fractionOfHour === 0) {
          prevHour = hour;
          results24.push({
            hour,
            timeLabel: `${String(hour).padStart(2, '0')}:00`,
            outdoorTemp: Number(T_out_curr.toFixed(2)),
            indoorTemp: Number(T_in.toFixed(2)),
            solAirRoofTemp: Number(T_sol_roof.toFixed(2)),
            heatGainRoof: Number(Q_roof.toFixed(1)),
            heatGainWalls: Number(Q_walls.toFixed(1)),
            heatGainFloor: Number(Q_floor.toFixed(1)),
            heatGainWindows: Number(Q_win_total.toFixed(1)),
            solarGainWindows: Number(Q_sol_win.toFixed(1)),
            heatGainVentilation: Number(Q_vent.toFixed(1)),
            heatGainInternal: Q_internal,
            netHeatGain: Number(Q_net.toFixed(1))
          });
        }
      }
    }

    // 6. Aggregate KPIs and Thermal Comfort Analysis
    const indoorTemps = results24.map(r => r.indoorTemp);
    const maxIndoorTemp = Math.max(...indoorTemps);
    const minIndoorTemp = Math.min(...indoorTemps);
    const meanIndoorTemp = Number((indoorTemps.reduce((a, b) => a + b, 0) / 24).toFixed(2));
    const tempSwing = Number((maxIndoorTemp - minIndoorTemp).toFixed(2));

    // Decrement Factor (damping ratio f = Tin_swing / Tout_swing)
    const decrementFactor = diurnalRange > 0 ? Number((tempSwing / diurnalRange).toFixed(2)) : 1.0;

    // Time Lag calculation: hour of peak outdoor vs hour of peak indoor
    const maxOutdoorIndex = outdoorTemps.indexOf(Math.max(...outdoorTemps));
    const maxIndoorIndex = indoorTemps.indexOf(maxIndoorTemp);
    let timeLag = maxIndoorIndex - maxOutdoorIndex;
    if (timeLag < 0) timeLag += 24;

    // Energy integration (Wh -> kWh per day)
    let totalSolarGainKWh = 0;
    let totalHeatGainKWh = 0;
    let totalHeatLossKWh = 0;

    let roofGainKWh = 0, wallsGainKWh = 0, winGainKWh = 0, ventGainKWh = 0, floorGainKWh = 0;
    let roofLossKWh = 0, wallsLossKWh = 0, winLossKWh = 0, ventLossKWh = 0, floorLossKWh = 0;

    results24.forEach(r => {
      // Solar direct through window
      totalSolarGainKWh += (r.solarGainWindows * 1.0) / 1000;

      // Net component tracking
      if (r.heatGainRoof > 0) roofGainKWh += (r.heatGainRoof / 1000); else roofLossKWh += Math.abs(r.heatGainRoof / 1000);
      if (r.heatGainWalls > 0) wallsGainKWh += (r.heatGainWalls / 1000); else wallsLossKWh += Math.abs(r.heatGainWalls / 1000);
      if (r.heatGainWindows > 0) winGainKWh += (r.heatGainWindows / 1000); else winLossKWh += Math.abs(r.heatGainWindows / 1000);
      if (r.heatGainVentilation > 0) ventGainKWh += (r.heatGainVentilation / 1000); else ventLossKWh += Math.abs(r.heatGainVentilation / 1000);
      if (r.heatGainFloor > 0) floorGainKWh += (r.heatGainFloor / 1000); else floorLossKWh += Math.abs(r.heatGainFloor / 1000);

      if (r.netHeatGain > 0) {
        totalHeatGainKWh += (r.netHeatGain / 1000);
      } else {
        totalHeatLossKWh += (Math.abs(r.netHeatGain) / 1000);
      }
    });

    // 7. Adaptive Thermal Comfort Evaluation
    // Based on ASHRAE Standard 55 Adaptive Model & Indian Model for Adaptive Comfort (IMAC)
    // T_comf = 17.8 + 0.31 * T_outdoor_mean
    const neutralComfortTemp = Number((17.8 + 0.31 * ambientMean).toFixed(1));
    const comfortLowerLimit = Number((neutralComfortTemp - 3.5).toFixed(1));
    const comfortUpperLimit = Number((neutralComfortTemp + 3.5).toFixed(1));

    let comfortHours = 0;
    let warmHours = 0;
    let coldHours = 0;

    indoorTemps.forEach(t => {
      if (t >= comfortLowerLimit && t <= comfortUpperLimit) {
        comfortHours++;
      } else if (t > comfortUpperLimit) {
        warmHours++;
      } else {
        coldHours++;
      }
    });

    // Comfort Status Badge Description
    let comfortStatus = "Comfortable";
    let comfortStatusClass = "badge-success";
    if (comfortHours >= 18) {
      comfortStatus = "High Thermal Comfort";
      comfortStatusClass = "badge-success";
    } else if (comfortHours >= 12) {
      comfortStatus = "Moderate Thermal Comfort";
      comfortStatusClass = "badge-warning";
    } else if (warmHours > coldHours) {
      comfortStatus = "Overheating Concern";
      comfortStatusClass = "badge-danger";
    } else {
      comfortStatus = "Cold Discomfort";
      comfortStatusClass = "badge-info";
    }

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        calculationType: "Estimated / Model-based Results (Lumped First-Principles Heat Balance)"
      },
      kpis: {
        meanIndoorTemp,
        maxIndoorTemp: Number(maxIndoorTemp.toFixed(2)),
        minIndoorTemp: Number(minIndoorTemp.toFixed(2)),
        tempSwing,
        decrementFactor,
        timeLag,
        solarHeatGainKWh: Number(totalSolarGainKWh.toFixed(2)),
        totalHeatGainKWh: Number(totalHeatGainKWh.toFixed(2)),
        totalHeatLossKWh: Number(totalHeatLossKWh.toFixed(2)),
        comfortHours,
        warmHours,
        coldHours,
        comfortStatus,
        comfortStatusClass,
        neutralComfortTemp,
        comfortLowerLimit,
        comfortUpperLimit
      },
      envelopes: {
        U_wall,
        U_roof,
        U_floor,
        U_win,
        totalWallArea: Number(totalWallArea.toFixed(1)),
        roofArea: Number(roofArea.toFixed(1)),
        floorArea: Number(floorArea.toFixed(1)),
        volume: Number(volume.toFixed(1)),
        totalACH: Number(totalACH.toFixed(2)),
        thermalCapacitanceMJ: Number((C_eff / 1e6).toFixed(2))
      },
      energyBreakdown: {
        gains: {
          roof: Number(roofGainKWh.toFixed(2)),
          walls: Number(wallsGainKWh.toFixed(2)),
          windows: Number(winGainKWh.toFixed(2)),
          ventilation: Number(ventGainKWh.toFixed(2)),
          floor: Number(floorGainKWh.toFixed(2))
        },
        losses: {
          roof: Number(roofLossKWh.toFixed(2)),
          walls: Number(wallsLossKWh.toFixed(2)),
          windows: Number(winLossKWh.toFixed(2)),
          ventilation: Number(ventLossKWh.toFixed(2)),
          floor: Number(floorLossKWh.toFixed(2))
        }
      },
      timeSeries: results24
    };
  }
}

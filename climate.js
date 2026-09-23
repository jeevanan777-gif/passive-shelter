/**
 * PASSIVE SHELTER DESIGNER - Climate & Solar Radiation Module
 * Provides area-specific climatic presets and hourly solar geometry calculations.
 */

const CLIMATE_PRESETS = {
  hot_dry: {
    id: "hot_dry",
    name: "Hot & Dry (e.g., Jodhpur / Jaisalmer / Phoenix)",
    location: "Arid Desert Zone",
    latitude: 26.3, // deg N
    ambientTemp: 41.5, // °C peak summer design day
    diurnalRange: 14.5, // °C day-night swing
    relativeHumidity: 22, // %
    peakSolarRadiation: 880, // W/m² global horizontal
    windSpeed: 3.2, // m/s
    groundTemp: 27.0, // °C undisturbed ground temperature at 1.5m
    description: "High daytime solar radiation, large diurnal temperature swing, low humidity. High thermal mass and night flush ventilation are prime passive strategies."
  },
  warm_humid: {
    id: "warm_humid",
    name: "Warm & Humid (e.g., Chennai / Mumbai / Kochi)",
    location: "Coastal Tropical Zone",
    latitude: 13.1,
    ambientTemp: 34.5,
    diurnalRange: 6.5,
    relativeHumidity: 78,
    peakSolarRadiation: 750,
    windSpeed: 4.5,
    groundTemp: 29.0,
    description: "High relative humidity with low diurnal temperature swing. Thermal mass provides little benefit; continuous cross-ventilation, shading, and lightweight construction are critical."
  },
  composite: {
    id: "composite",
    name: "Composite (e.g., New Delhi / Nagpur / Jaipur)",
    location: "Continental Transition Zone",
    latitude: 28.6,
    ambientTemp: 39.0,
    diurnalRange: 11.5,
    relativeHumidity: 45,
    peakSolarRadiation: 820,
    windSpeed: 2.8,
    groundTemp: 26.5,
    description: "Experiences both hot-dry summers and cold winters. Requires versatile passive strategies: high thermal mass for summer swing damping and solar heat gain during cooler months."
  },
  cold: {
    id: "cold",
    name: "Cold & High-Altitude (e.g., Leh / Shimla / Srinagar)",
    location: "Himalayan Alpine Zone",
    latitude: 34.2,
    ambientTemp: 14.0,
    diurnalRange: 15.0,
    relativeHumidity: 35,
    peakSolarRadiation: 920, // High clear-sky solar at high elevation
    windSpeed: 3.8,
    groundTemp: 8.0,
    description: "Low ambient temperatures with strong direct solar radiation. Prime passive strategies: direct solar gain through south-facing glazing, high insulation, and draft-proofing."
  },
  temperate: {
    id: "temperate",
    name: "Temperate / Moderate (e.g., Bengaluru / Pune)",
    location: "Plateau Highland Zone",
    latitude: 12.9,
    ambientTemp: 30.5,
    diurnalRange: 9.0,
    relativeHumidity: 55,
    peakSolarRadiation: 780,
    windSpeed: 3.0,
    groundTemp: 24.0,
    description: "Mild comfortable conditions throughout most of the year. Minimal heating or cooling required; natural ventilation and standard shading are sufficient."
  },
  custom: {
    id: "custom",
    name: "Custom Location / Site Conditions",
    location: "User Defined Site",
    latitude: 20.0,
    ambientTemp: 35.0,
    diurnalRange: 10.0,
    relativeHumidity: 50,
    peakSolarRadiation: 800,
    windSpeed: 3.0,
    groundTemp: 25.0,
    description: "Fully customizable parameters for specific regional microclimates or experimental weather station data."
  }
};

/**
 * Generates 24 hourly ambient outdoor temperatures (°C)
 * Standard ASHRAE sinusoidal diurnal model:
 * Minimum temp occurs near sunrise (~06:00), maximum temp occurs at ~15:00 (3 PM).
 */
function get24HourOutdoorTemperatures(meanTemp, diurnalRange) {
  const temps = [];
  const minTemp = meanTemp - (diurnalRange / 2);
  const maxTemp = meanTemp + (diurnalRange / 2);

  for (let hour = 0; hour < 24; hour++) {
    // Phase shift so minimum is at 6:00 and maximum is at 15:00
    // At hour 15: (15 - 9) * pi / 12 = 6 * pi / 12 = pi / 2 -> sin(pi/2) = 1 (Max)
    // At hour 6:  (6 - 9) * pi / 12 = -3 * pi / 12 = -pi / 4 ...
    // Using standard standard meteorological diurnal approximation:
    const angle = (2 * Math.PI * (hour - 9)) / 24;
    const t = meanTemp + (diurnalRange / 2) * Math.sin(angle);
    temps.push(Number(t.toFixed(2)));
  }
  return temps;
}

/**
 * Calculate solar position and hourly solar irradiance on oriented surfaces (W/m²)
 * @param {number} latitude - Latitude in degrees
 * @param {number} peakRadiation - Peak global horizontal radiation (W/m²)
 * @param {number} shelterOrientation - Degrees clockwise from North (0° = North, 90° = East, 180° = South, 270° = West)
 * @param {string} roofType - 'flat', 'gable', or 'shed'
 */
function get24HourSolarIrradiance(latitude, peakRadiation, shelterOrientation = 0, roofType = 'flat') {
  // Assume summer solstice design condition (Declination delta ~ +23.45° for peak cooling analysis)
  const delta = 23.45 * (Math.PI / 180);
  const phi = latitude * (Math.PI / 180);
  
  const hourlyData = [];

  for (let hour = 0; hour < 24; hour++) {
    // Solar hour angle omega: 12:00 = 0 rad, 15° per hour
    const omega = ((hour + 0.5) - 12) * 15 * (Math.PI / 180);

    // Solar altitude beta (angle above horizon)
    const sinBeta = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
    const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta))); // Solar altitude in radians
    
    // Solar azimuth gamma_s (measured from South in standard solar equations, converted to clockwise from North)
    let solarAzimuthDeg = 180; // Default south at noon
    if (beta > 0) {
      const cosGamma = (Math.sin(beta) * Math.sin(phi) - Math.sin(delta)) / (Math.cos(beta) * Math.cos(phi));
      const clampedCos = Math.max(-1, Math.min(1, cosGamma));
      let gammaRad = Math.acos(clampedCos);
      if (omega < 0) { // Morning (East of south)
        solarAzimuthDeg = 180 - (gammaRad * 180 / Math.PI);
      } else { // Afternoon (West of south)
        solarAzimuthDeg = 180 + (gammaRad * 180 / Math.PI);
      }
    }

    let globalHorizontal = 0;
    let directNormal = 0;
    let diffuseHorizontal = 0;

    if (beta > 0.05) { // Sun is above horizon
      // Sinusoidal bell curve for solar radiation matching peakRadiation
      const sunHeightFactor = Math.sin(beta);
      globalHorizontal = peakRadiation * Math.pow(sunHeightFactor, 1.15);
      diffuseHorizontal = globalHorizontal * (0.18 + 0.15 * (1 - sunHeightFactor));
      directNormal = (globalHorizontal - diffuseHorizontal) / Math.max(0.1, sunHeightFactor);
    }

    // Now calculate incident irradiance on each oriented vertical surface
    // Wall azimuths (relative to North) rotated by shelterOrientation:
    // Front Wall: shelterOrientation
    // Right Wall: shelterOrientation + 90
    // Back Wall: shelterOrientation + 180
    // Left Wall: shelterOrientation + 270

    const calcVerticalWallIrradiance = (surfaceAzimuthDeg) => {
      if (beta <= 0) return 0;
      // Incident angle theta
      const deltaAzimuth = (solarAzimuthDeg - surfaceAzimuthDeg) * (Math.PI / 180);
      const cosTheta = Math.cos(beta) * Math.cos(deltaAzimuth);
      const directOnWall = cosTheta > 0 ? directNormal * cosTheta : 0;
      // Ground reflected component (albedo ~ 0.20) + diffuse sky component
      const diffuseOnWall = diffuseHorizontal * 0.5 + globalHorizontal * 0.20 * 0.5;
      return Math.max(0, directOnWall + diffuseOnWall);
    };

    // Calculate for Cardinal directions (North: 0°, East: 90°, South: 180°, West: 270°)
    const northIrradiance = calcVerticalWallIrradiance(0);
    const eastIrradiance = calcVerticalWallIrradiance(90);
    const southIrradiance = calcVerticalWallIrradiance(180);
    const westIrradiance = calcVerticalWallIrradiance(270);

    // Calculate for shelter specific walls
    const frontWallIrradiance = calcVerticalWallIrradiance(shelterOrientation);
    const rightWallIrradiance = calcVerticalWallIrradiance((shelterOrientation + 90) % 360);
    const backWallIrradiance = calcVerticalWallIrradiance((shelterOrientation + 180) % 360);
    const leftWallIrradiance = calcVerticalWallIrradiance((shelterOrientation + 270) % 360);

    // Average wall irradiance weighted by exposure
    const avgWallIrradiance = (frontWallIrradiance + rightWallIrradiance + backWallIrradiance + leftWallIrradiance) / 4;

    // Roof irradiance
    let roofIrradiance = globalHorizontal;
    if (roofType === 'gable') {
      // 25 degree pitch gable
      const pitchRad = 25 * (Math.PI / 180);
      // Effective combination of two slopes
      roofIrradiance = globalHorizontal * Math.cos(pitchRad) + avgWallIrradiance * Math.sin(pitchRad) * 0.4;
    } else if (roofType === 'shed') {
      // 15 degree mono slope facing shelterOrientation
      const pitchRad = 15 * (Math.PI / 180);
      roofIrradiance = globalHorizontal * Math.cos(pitchRad) + frontWallIrradiance * Math.sin(pitchRad);
    }

    hourlyData.push({
      hour,
      betaDeg: Number((beta * 180 / Math.PI).toFixed(1)),
      solarAzimuthDeg: Number(solarAzimuthDeg.toFixed(1)),
      globalHorizontal: Number(globalHorizontal.toFixed(1)),
      diffuseHorizontal: Number(diffuseHorizontal.toFixed(1)),
      roofIrradiance: Number(roofIrradiance.toFixed(1)),
      avgWallIrradiance: Number(avgWallIrradiance.toFixed(1)),
      frontWallIrradiance: Number(frontWallIrradiance.toFixed(1)),
      rightWallIrradiance: Number(rightWallIrradiance.toFixed(1)),
      backWallIrradiance: Number(backWallIrradiance.toFixed(1)),
      leftWallIrradiance: Number(leftWallIrradiance.toFixed(1)),
      northIrradiance: Number(northIrradiance.toFixed(1)),
      southIrradiance: Number(southIrradiance.toFixed(1)),
      eastIrradiance: Number(eastIrradiance.toFixed(1)),
      westIrradiance: Number(westIrradiance.toFixed(1))
    });
  }

  return hourlyData;
}

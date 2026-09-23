/**
 * PASSIVE SHELTER DESIGNER - Materials Database
 * Realistic thermophysical properties for building envelope components.
 * 
 * Properties:
 * - k: Thermal conductivity (W/m·K)
 * - rho: Density (kg/m³)
 * - cp: Specific heat capacity (J/kg·K)
 * - alpha: Solar absorptivity (0 to 1, fraction of solar radiation absorbed)
 * - defaultThickness: Typical construction thickness in meters (m)
 * - description: Engineering description and typical application
 */

const MATERIALS_DATABASE = {
  walls: {
    brick_common: {
      name: "Standard Burnt Clay Brick",
      k: 0.81,
      rho: 1800,
      cp: 840,
      alpha: 0.70,
      defaultThickness: 0.23, // 230mm (9-inch wall)
      color: "#b2533e",
      description: "Traditional fired clay masonry with high thermal mass, common in composite and hot-dry climates."
    },
    cseb: {
      name: "Compressed Stabilized Earth Block (CSEB)",
      k: 0.95,
      rho: 1950,
      cp: 920,
      alpha: 0.60,
      defaultThickness: 0.24, // 240mm
      color: "#c29b6e",
      description: "Low embodied energy earth block stabilized with 5-8% cement. Excellent thermal inertia and humidity moderation."
    },
    adobe_mud: {
      name: "Traditional Adobe / Sun-Dried Mud",
      k: 0.55,
      rho: 1500,
      cp: 1050,
      alpha: 0.55,
      defaultThickness: 0.30, // 300mm thick traditional wall
      color: "#a88358",
      description: "High volumetric heat capacity earth construction. Delivers significant thermal lag in arid climates."
    },
    aac_block: {
      name: "Autoclaved Aerated Concrete (AAC)",
      k: 0.16,
      rho: 600,
      cp: 1000,
      alpha: 0.50,
      defaultThickness: 0.20, // 200mm
      color: "#cfd3d7",
      description: "Lightweight cellular block with high thermal resistance (low U-value) but lower thermal capacitance."
    },
    stone_masonry: {
      name: "Random Rubble Stone Masonry",
      k: 1.80,
      rho: 2400,
      cp: 880,
      alpha: 0.65,
      defaultThickness: 0.38, // 380mm thick stone wall
      color: "#8c8d8f",
      description: "Very high density natural stone. High thermal inertia, typical in mountainous or rocky regions."
    },
    cavity_insulated: {
      name: "Brick Cavity Wall with EPS Insulation",
      k: 0.12, // effective overall
      rho: 1400,
      cp: 900,
      alpha: 0.65,
      defaultThickness: 0.28, // 115mm brick + 50mm EPS + 115mm brick
      color: "#d97757",
      description: "High performance dual-leaf masonry with 50mm expanded polystyrene core, combining resistance and mass."
    },
    rammed_earth: {
      name: "Monolithic Rammed Earth",
      k: 0.85,
      rho: 2000,
      cp: 1000,
      alpha: 0.58,
      defaultThickness: 0.35, // 350mm
      color: "#b0895c",
      description: "Compacted subsoil wall with massive thermal damping, evening out day-night temperature swings."
    },
    bamboo_wattle: {
      name: "Bamboo / Wattle & Daub (Lightweight)",
      k: 0.25,
      rho: 750,
      cp: 1200,
      alpha: 0.45,
      defaultThickness: 0.10, // 100mm
      color: "#d6bc82",
      description: "Lightweight breathable organic envelope suitable for warm-humid tropical regions requiring high cross-ventilation."
    }
  },

  roofs: {
    rcc_slab: {
      name: "RCC Slab (Concrete 150mm)",
      k: 1.58,
      rho: 2400,
      cp: 880,
      alpha: 0.72,
      defaultThickness: 0.15,
      color: "#7e8287",
      description: "Standard reinforced concrete roof slab. High heat gain during peak sun without reflective coating."
    },
    cool_roof: {
      name: "RCC Slab with Cool Roof / High-Albedo Coating",
      k: 1.58,
      rho: 2400,
      cp: 880,
      alpha: 0.20, // High solar reflectance (albedo ~ 0.80)
      defaultThickness: 0.15,
      color: "#f8f9fa",
      description: "Concrete slab finished with white reflective coating. Drastically reduces sol-air temperature and solar peak loads."
    },
    clay_tiles: {
      name: "Mangalore Clay Tiles on Timber Rafters",
      k: 0.80,
      rho: 1900,
      cp: 800,
      alpha: 0.65,
      defaultThickness: 0.05,
      color: "#c05634",
      description: "Traditional sloping clay tile roofing with ventilated air cavity underneath."
    },
    cgi_sheet: {
      name: "Corrugated Galvanized Iron (CGI) Sheet (Uninsulated)",
      k: 50.0, // Sheet metal
      rho: 7800,
      cp: 480,
      alpha: 0.68,
      defaultThickness: 0.005, // 5mm sheet equivalent
      color: "#a4b0be",
      description: "Common low-cost roofing. Highly conductive with virtually zero thermal mass, prone to rapid indoor overheating."
    },
    insulated_sandwich: {
      name: "PIR Insulated Sandwich Panel (50mm)",
      k: 0.024,
      rho: 40,
      cp: 1400,
      alpha: 0.35,
      defaultThickness: 0.05,
      color: "#e2e8f0",
      description: "Engineered polyisocyanurate (PIR) modular roofing with excellent thermal insulation and low U-value."
    },
    thatch_bamboo: {
      name: "Traditional Thatch & Bamboo",
      k: 0.07,
      rho: 220,
      cp: 1800,
      alpha: 0.50,
      defaultThickness: 0.15,
      color: "#bfa15f",
      description: "Natural organic thatch roof with low thermal conductivity and porous breathing properties."
    }
  },

  floors: {
    concrete_ground: {
      name: "Concrete Slab on Grade (100mm)",
      k: 1.40,
      rho: 2300,
      cp: 880,
      defaultThickness: 0.10,
      description: "Direct ground-coupled concrete slab providing thermal sink cooling into subsoil."
    },
    mud_compacted: {
      name: "Compacted Earth / Mud Plaster Floor",
      k: 0.70,
      rho: 1600,
      cp: 1000,
      defaultThickness: 0.12,
      description: "Traditional breathable floor with moderate thermal coupling to ground."
    },
    stone_tiles: {
      name: "Natural Stone / Kota Stone Flooring",
      k: 2.10,
      rho: 2600,
      cp: 820,
      defaultThickness: 0.07,
      description: "Dense stone tile over sand-cement screed. Excellent thermal storage and cool feel underfoot."
    },
    raised_timber: {
      name: "Raised Timber Floor (Ventilated Subfloor)",
      k: 0.14,
      rho: 600,
      cp: 1600,
      defaultThickness: 0.05,
      description: "Elevated wooden deck, uncoupled from ground temperature, typical in humid stilt shelters."
    }
  },

  glazing: {
    single_clear: {
      name: "Single Glazing (4mm Clear Glass)",
      uValue: 5.7,
      shgc: 0.85, // Solar Heat Gain Coefficient
      vlt: 0.90   // Visible Light Transmittance
    },
    double_clear: {
      name: "Double Glazed Unit (6-12-6 Air)",
      uValue: 2.8,
      shgc: 0.70,
      vlt: 0.80
    },
    low_e_double: {
      name: "Double Glazed Low-E (Argon Filled)",
      uValue: 1.6,
      shgc: 0.40,
      vlt: 0.65
    }
  }
};

/**
 * Surface heat transfer coefficients (W/m²·K)
 * Standard building physics values (ISO 6946 / ASHRAE Fundamentals)
 */
const SURFACE_RESISTANCES = {
  Rsi_wall: 0.13,       // Inside surface resistance for horizontal heat flow
  Rso_wall: 0.04,       // Outside surface resistance (wind speed ~ 3-4 m/s)
  Rsi_roof_up: 0.10,    // Inside surface resistance for upward heat flow (cooling season)
  Rsi_roof_down: 0.17,  // Inside surface resistance for downward heat flow
  Rso_roof: 0.04,       // Outside roof surface resistance
  Rsi_floor: 0.17,      // Inside floor surface resistance
  R_ground: 0.50        // Effective sub-slab ground soil resistance
};

/**
 * Calculate overall thermal transmittance U-value (W/m²·K)
 * U = 1 / (Rsi + sum(d_i / k_i) + Rso)
 */
function calculateOpaqueUValue(materialKey, category, thicknessMeters) {
  const mat = MATERIALS_DATABASE[category][materialKey];
  if (!mat) return 1.5;

  const t = thicknessMeters || mat.defaultThickness;
  const R_material = t / Math.max(mat.k, 0.01);

  let R_total = 0;
  if (category === 'walls') {
    R_total = SURFACE_RESISTANCES.Rsi_wall + R_material + SURFACE_RESISTANCES.Rso_wall;
  } else if (category === 'roofs') {
    R_total = SURFACE_RESISTANCES.Rsi_roof_up + R_material + SURFACE_RESISTANCES.Rso_roof;
  } else if (category === 'floors') {
    R_total = SURFACE_RESISTANCES.Rsi_floor + R_material + SURFACE_RESISTANCES.R_ground;
  }

  return Number((1 / Math.max(R_total, 0.05)).toFixed(3));
}

/**
 * Calculate volumetric heat capacity (kJ/m³·K)
 */
function calculateVolumetricHeatCapacity(materialKey, category) {
  const mat = MATERIALS_DATABASE[category][materialKey];
  if (!mat) return 1500;
  return Number(((mat.rho * mat.cp) / 1000).toFixed(1));
}

# PASSIVE SHELTER DESIGNER
### Software Based Model Development for Design of Area-Specific Shelter for Thermal Comfort Maintenance

> **Academic Prototype Notice**: This tool is an engineering prototype designed for educational modeling, passive solar shelter exploration, and thermal comfort evaluation. Calculated outputs are transparently labeled as **“Estimated / Model-based Results”** based on first-principles lumped heat transfer principles (ASHRAE Fundamentals & ISO 13792) rather than CFD or multi-node transient FEA solvers.

---

## 1. Project Overview & Objective

The primary objective of this project is to develop a software-based passive shelter design and thermal-comfort analysis tool. 

The software enables an engineer or student to:
1. Select or customize **area-specific climatic conditions** (ambient temperature, diurnal variation, peak solar radiation, relative humidity, wind speed).
2. Configure **shelter geometry** (length, width, height, wall and roof thickness, window and door openings, orientation, and roof type: flat, pitched gable, or shed).
3. Select construction materials from an engineering **materials library** (fired clay brick, compressed stabilized earth blocks, adobe, AAC, stone masonry, RCC, cool reflective roofs, clay tiles, CGI sheets, insulated sandwich panels, glazing types) with real thermophysical properties ($k, \rho, c_p, \alpha$).
4. Execute a dynamic 24-hour **thermal simulation** using lumped-parameter energy balance equations.
5. Visualize the shelter in an **interactive 3D WebGL viewport** (Three.js) responding dynamically to changes in dimensions, orientation, materials, and solar trajectory.
6. Analyze **KPI cards, 24-hour temperature curves**, component-wise heat gains/losses, and **ASHRAE 55 / IMAC adaptive comfort hours**.
7. Benchmark and **compare multiple design configurations** side-by-side in a comparative matrix and multi-variant chart.

---

## 2. File Structure

```
passive-shelter-designer/
│
├── index.html               # Main dashboard UI structure, CAD panels, and layout
├── run.bat                  # One-click Windows desktop launcher
├── README.md                # Engineering documentation and technical methodology
│
├── css/
│   └── style.css            # CAD dark theme stylesheet, responsive layout, chart wrappers
│
└── js/
    ├── materials.js         # Thermophysical materials database and dynamic U-value engine
    ├── climate.js           # Climatic presets and hourly solar geometry / radiation solver
    ├── thermal-engine.js    # Lumped-parameter dynamic 24-hour heat balance simulation engine
    ├── viewer3d.js          # Three.js 3D WebGL shelter renderer with solar vector & compass
    ├── charts.js            # Chart.js diurnal curves, heat breakdown, and comparison plots
    ├── comparison.js        # Design configuration snapshot manager and comparison matrix
    └── app.js               # Application coordinator, event bindings, and CSV/report export
```

---

## 3. How the Thermal Calculations Work

The model uses a **first-principles dynamic energy balance** solved across a 24-hour diurnal cycle:

### A. Diurnal Ambient Air Temperature
The outdoor temperature is represented via the sinusoidal diurnal model:
$$T_{out}(t) = T_{mean} + \frac{\Delta T_{diurnal}}{2} \sin\left(\frac{2\pi (t - 9)}{24}\right)$$
yielding minimum temperature at ~06:00 (dawn) and peak temperature at ~15:00 (mid-afternoon).

### B. Sol-Air Temperature ($T_{sol-air}$)
The combined effect of ambient air temperature and solar radiation absorbed on exterior opaque surfaces (walls and roof) is computed via:
$$T_{sol-air}(t) = T_{out}(t) + \frac{\alpha \cdot I_{surf}(t)}{h_o} - \frac{\epsilon \Delta R}{h_o}$$
where:
- $\alpha$: Solar absorptivity of the surface (0.20 for Cool Roofs, 0.70 for Brick/Concrete).
- $I_{surf}(t)$: Hourly incident solar radiation on the oriented surface (W/m²), calculated from solar altitude ($\beta$), solar azimuth, and surface tilt/orientation.
- $h_o$: Exterior surface heat transfer coefficient ($\approx 22.7\text{ W/m}^2\text{K}$).
- $\frac{\epsilon \Delta R}{h_o}$: Longwave radiation loss to the night sky ($\approx 4^\circ\text{C}$ for horizontal roofs, $0^\circ\text{C}$ for vertical walls).

### C. Envelope Heat Transfer ($Q_{env}$)
For each envelope component (walls, roof, floor), overall thermal transmittance ($U$-value) is computed:
$$U = \frac{1}{R_{si} + \frac{t_{layer}}{k} + R_{so}}$$
The instantaneous heat flow is:
$$Q_{walls}(t) = \sum_{i} U_{wall} A_{wall,i} (T_{sol-air,i}(t) - T_{in}(t))$$
$$Q_{roof}(t) = U_{roof} A_{roof} (T_{sol-air,roof}(t) - T_{in}(t))$$
$$Q_{floor}(t) = U_{floor} A_{floor} (T_{ground} - T_{in}(t))$$

### D. Window Solar Heat Gain & Conduction ($Q_{win}$)
$$Q_{win}(t) = A_{win} \cdot SHGC \cdot I_{incident}(t) + U_{win} A_{win} (T_{out}(t) - T_{in}(t))$$

### E. Natural Ventilation & Infiltration ($Q_{vent}$)
Air changes per hour ($ACH$) account for baseline infiltration plus wind-driven cross-ventilation:
$$ACH = ACH_{base} + \frac{C_v \cdot A_{operable} \cdot v_{wind} \cdot 3600}{Volume}$$
$$Q_{vent}(t) = \rho_{air} c_{p,air} \left(\frac{ACH \cdot Volume}{3600}\right) (T_{out}(t) - T_{in}(t))$$

### F. Dynamic Lumped-Capacitance Time Stepping
The room indoor air temperature evolves according to net heat balance:
$$C_{eff} \frac{dT_{in}}{dt} = \sum Q(t)$$
$$T_{in}^{t+\Delta t} = T_{in}^t + \frac{\sum Q(t)}{C_{eff}} \Delta t$$
where $C_{eff} = C_{air} + 0.30 \times C_{envelope}$ incorporates the active thermal mass of the structure. The model iterates over 3 consecutive 24-hour cycles ($\Delta t = 900\text{ s}$) to achieve periodic steady-state convergence.

### G. Thermal Comfort Evaluation (ASHRAE 55 Adaptive Model / IMAC)
The neutral comfort temperature is calculated as:
$$T_{neutral} = 17.8 + 0.31 \times T_{out,mean} \quad (^\circ\text{C})$$
Acceptable comfort limits ($80\%$ satisfaction) are:
$$T_{comfort} = T_{neutral} \pm 3.5^\circ\text{C}$$
Hours where $T_{in}(t)$ falls within these bounds are counted as **Comfort Hours**.

---

## 4. How to Run the Application

1. Double-click `run.bat` in the project directory, **OR**
2. Double-click `index.html` to open directly in any modern web browser (Google Chrome, Microsoft Edge, Brave, Opera, Firefox).
3. No Node.js, Python, or compiler setup is required. All modules are self-contained.

---

## 5. Parameters You Can Change

- **Climate Parameters**: Location preset, Ambient Temperature (°C), Diurnal Range (°C), Peak Solar Radiation (W/m²), Relative Humidity (%), Wind Speed (m/s).
- **Geometry**: Length, Width, Height, Wall Thickness, Roof Thickness, Window Area, Door Area, Orientation (0° to 360°), and Roof Type (Flat, Gable, Shed).
- **Materials**: Wall construction, Roof construction (including Cool Roof coating), Ground Floor type, Glazing unit.
- **Sun Position**: Drag the Sun Hour slider to observe solar position and shadowing on the 3D model.

---

## 6. Project Requirements Compliance Matrix

| Requirement | Implementation in Prototype |
| :--- | :--- |
| **Site & Climate Inputs** | 6 inputs + 5 climate presets (Hot-Dry, Warm-Humid, Composite, Cold, Temperate). |
| **Shelter Geometry** | Length, width, height, wall/roof thickness, openings, orientation, roof types. |
| **Material Selection** | Realistic $k, \rho, c_p, \alpha$ library for walls, roofs, floors, glazing. |
| **Simulation Controls** | Prominent "RUN THERMAL ANALYSIS", loading feedback, automatic steady-state solver. |
| **Transparent Calculations** | Energy balance, sol-air temp, thermal mass, decrement factor, time lag documented in UI. |
| **Result Dashboard** | 8 KPI cards, 24-hr temperature chart, component heat breakdown, comfort gauge. |
| **Design Comparison** | Save multiple design variants, side-by-side comparison matrix, multi-variant chart. |
| **3D Visualization** | Interactive Three.js WebGL model with orientation compass and solar trajectory. |
| **Engineering Polish** | Dark CAD theme, tooltips, validation, CSV export, print report, reset button. |
| **Disclaimer Labeling** | Explicitly labeled as *“Estimated / Model-based Results”* throughout UI. |

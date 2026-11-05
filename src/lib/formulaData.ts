import { SubjectFormulaMap } from '../types';

export const FORMULA_DATA: SubjectFormulaMap = {
  physics: [
    {
      topic: "Constants",
      formulas: [
        { name: "Speed of Light ($c$)", latex: "3.0 \\times 10^8 \\text{ m/s}", description: "Universal speed limit in a vacuum." },
        { name: "Planck's Constant ($h$)", latex: "6.63 \\times 10^{-34} \\text{ J}\\cdot\\text{s}", description: "Relates energy to frequency." },
        { name: "Gravitational Constant ($G$)", latex: "6.67 \\times 10^{-11} \\text{ N}\\cdot\\text{m}^2\\text{/kg}^2", description: "Universal constant of gravitation." },
        { name: "Avogadro's Number ($N_A$)", latex: "6.02 \\times 10^{23} \\text{ mol}^{-1}", description: "Particles in one mole." },
        { name: "Charge of Electron ($e$)", latex: "1.6 \\times 10^{-19} \\text{ C}", description: "Elementary charge." }
      ]
    },
    {
      topic: "Mechanics",
      formulas: [
        { name: "Equations of Motion", latex: "\\begin{aligned} v &= u + at \\\\ s &= ut + \\frac{1}{2}at^2 \\\\ v^2 &= u^2 + 2as \\end{aligned}", description: "SUVAT equations for constant acceleration." },
        { name: "Work Done", latex: "W = Fd \\cos \\theta", description: "Force times displacement." },
        { name: "Power", latex: "P = \\frac{W}{t} = Fv", description: "Rate of doing work." },
        { name: "Centripetal Force", latex: "F_c = \\frac{mv^2}{r}", description: "Force in circular motion." },
        { name: "Hooke's Law", latex: "F = ke", description: "Extension is proportional to force." }
      ]
    },
    {
      topic: "Electricity & Magnetism",
      formulas: [
        { name: "Ohm's Law", latex: "V = IR", description: "Potential difference, current, and resistance." },
        { name: "Electrical Power", latex: "P = IV = I^2R = \\frac{V^2}{R}", description: "Rate of electrical energy dissipation." },
        { name: "Capacitance", latex: "C = \\frac{Q}{V}", description: "Charge stored per unit voltage." },
        { name: "Coulomb's Law", latex: "F = k\\frac{q_1q_2}{r^2}", description: "Force between two charges." },
        { name: "Magnetic Force", latex: "F = BIl \\sin \\theta", description: "Force on a current-carrying conductor." }
      ]
    }
  ],
  mathematics: [
    {
      topic: "Calculus",
      formulas: [
        { name: "Product Rule", latex: "\\frac{d}{dx}(uv) = u\\frac{dv}{dx} + v\\frac{du}{dx}", description: "Differentiating a product of functions." },
        { name: "Quotient Rule", latex: "\\frac{d}{dx}(\\frac{u}{v}) = \\frac{v\\frac{du}{dx} - u\\frac{dv}{dx}}{v^2}", description: "Differentiating a fraction." },
        { name: "Integration by Parts", latex: "\\int u \\, dv = uv - \\int v \\, du", description: "Integrating a product." },
        { name: "Chain Rule", latex: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}", description: "Differentiating composite functions." }
      ]
    },
    {
      topic: "Geometry & Trig",
      formulas: [
        { name: "Sine Rule", latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}", description: "Sides and angles in any triangle." },
        { name: "Cosine Rule", latex: "a^2 = b^2 + c^2 - 2bc \\cos A", description: "Side 'a' when angle 'A' is known." },
        { name: "Compound Angle", latex: "\\sin(A \\pm B) = \\sin A \\cos B \\pm \\cos A \\sin B", description: "Expansion for sine of sum/diff." },
        { name: "Circle Equation", latex: "(x-h)^2 + (y-k)^2 = r^2", description: "Circle with center (h, k) and radius r." }
      ]
    }
  ],
  chemistry: [
    {
      topic: "General Chemistry",
      formulas: [
        { name: "Ideal Gas Law", latex: "PV = nRT", description: "Relationship between pressure, volume, and temp." },
        { name: "Mole Calculation", latex: "n = \\frac{m}{M}", description: "Moles = Mass / Molar Mass." },
        { name: "Molarity", latex: "M = \\frac{n}{V}", description: "Moles per unit volume." },
        { name: "pH Calculation", latex: "\\text{pH} = -\\log[H^+]", description: "Measure of acidity." }
      ]
    },
    {
      topic: "Thermodynamics",
      formulas: [
        { name: "Gibbs Free Energy", latex: "\\Delta G = \\Delta H - T\\Delta S", description: "Determines spontaneity of a reaction." },
        { name: "Enthalpy Change", latex: "\\Delta H = q = mc\\Delta T", description: "Heat change at constant pressure." }
      ]
    }
  ]
};


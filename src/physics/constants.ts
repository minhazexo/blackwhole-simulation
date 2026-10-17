/**
 * Physics Constants for Black Hole Simulation
 *
 * Geometric Units (G = c = 1) unless otherwise specified.
 * SI values are used for Hawking radiation, Bekenstein entropy,
 * and other quantum-thermodynamic calculations.
 */

// Schwarzschild radius for 1 Solar Mass (normalized units)
export const SCHWARZSCHILD_RADIUS_SOLAR = 2.0;

// Speed of light in m/s
export const C = 299_792_458;

// Gravitational constant in m^3 kg^-1 s^-2
export const G = 6.6743e-11;

// Solar Mass in kg
export const SOLAR_MASS = 1.98847e30;

// Reduced Planck constant in J·s
export const H_BAR = 1.054_571_817e-34;

// Boltzmann constant in J/K
export const KB = 1.380_649e-23;

// Stefan-Boltzmann constant in W·m^-2·K^-4
export const SIGMA = 5.670_374_419e-8;

// Wien frequency displacement constant (Hz/K)
// Derived from b = 2.897771955e-3 m·K → ν_peak = (c / λ_peak) = (c / b) · T
export const WIEN_FREQUENCY_CONSTANT_HZ_PER_K = 5.878_925_757e10;

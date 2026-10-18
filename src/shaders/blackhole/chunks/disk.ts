import { PHYSICS_CONSTANTS } from "@/config/physics.config";

export const DISK_CHUNK = `
  // Accretion Disk Physics & Rendering
  // Inputs:
  //   p: current ray position (vec3)
  //   ro: ray origin (vec3)
  //   r: current radius from BH center
  //   isco: innermost stable circular orbit
  //   M: black hole mass
  //   a: black hole spin parameter
  //   dt: integration step size (for density integration)
  //   accumulatedColor: (inout)
  //   accumulatedAlpha: (inout)

  void sample_accretion_disk(
      vec3 p, vec3 p_prev, vec3 ro, vec3 v, float r, float isco, float M, float a, float dt, float rs,
      inout vec3 accumulatedColor, inout float accumulatedAlpha
  ) {
      if (u_show_redshift < 0.5) {
          // SCIENTIFIC FIX: Plane-Crossing Detection (Eliminates "holes" from step-skipping)
          // If the ray crossed the equator (p_prev.y * p.y < 0), we force a sample at the intersection
          bool crossedEquator = (p_prev.y * p.y < 0.0);

          vec3 sampleP = p;
          if (crossedEquator) {
              float t = abs(p_prev.y) / max(0.0001, abs(p_prev.y) + abs(p.y));
              sampleP = mix(p_prev, p, t);
          }

          float sampleR = length(sampleP);

          float effectiveScaleHeight = min(u_disk_scale_height, ${PHYSICS_CONSTANTS.accretion.diskHeightMultiplier.toFixed(3)});
          float diskHeight = sampleR * effectiveScaleHeight;

          // SCIENTIFIC FIX: Ensure ISCO creates a hard edge even for retrograde orbits
          float diskInner = isco * 1.02;
          float diskOuter = max(M * u_disk_size, diskInner * 1.1);

          if((abs(sampleP.y) < diskHeight || crossedEquator) && sampleR > diskInner && sampleR < diskOuter) {

              // Exact Kerr orbital rotation for turbulence map
              float sqrt_M_phase = sqrt(M);
              float signSpinPhase = sign(u_spin + 1e-8);
              float OmegaPhase = (signSpinPhase * sqrt_M_phase) / (sampleR * sqrt(sampleR) + a * sqrt_M_phase);

              // Frame-dragged phase rotation.
              // Wrapped to one turn: sin/cos are periodic, so the pattern is
              // identical, but the angle stays bounded. An ever-growing angle
              // loses highp precision in long sessions and makes the disk
              // turbulence shimmer / repeat incorrectly.
              float rotAngle = mod(
                OmegaPhase * u_time * ${PHYSICS_CONSTANTS.accretion.timeScale.toFixed(2)} * 10.0,
                6.28318530718
              );

              // ==========================================================
              // FILAMENTARY DISK TEXTURE
              //
              // The disk is sampled in a frame that co-rotates with the
              // fluid, in polar coordinates (azimuth, log radius). Noise
              // stretched ~10:1 along the orbit gives long, thin streaks
              // that follow the flow instead of boiling in place; a second,
              // slower field adds the spiral arms and the clumpy gaps.
              // Using cos/sin of the azimuth keeps the field periodic in
              // phi (no seam at +/-PI) and independent of u_time's phase.
              // ==========================================================
              float ang = atan(sampleP.z, sampleP.x);
              float phase = ang - rotAngle;
              float lr = log(sampleR / diskInner + 1.0);

              // Fine concentric filaments (fast radial variation, slow in phi)
              float fil = adaptiveFbm(vec3(cos(phase) * 2.0, sin(phase) * 2.0, lr * 11.0), 3);
              // Larger turbulent clumps that break the rings up
              float clump = adaptiveFbm(vec3(cos(phase) * 1.2, sin(phase) * 1.2, lr * 3.2), 2);
              // Spiral arms: shear the azimuth with radius
              float spiralPhase = phase - lr * 5.5;
              float arms = adaptiveFbm(vec3(cos(spiralPhase) * 4.0, sin(spiralPhase) * 4.0, lr * 2.2), 2);

              // Filaments dominate; clumps and arms sculpt their brightness.
              // Scaled into (0,1] with a floor so no sample is fully empty.
              float turbulence = clamp(
                0.30 + 1.55 * (fil - 0.45) + 0.9 * (clump - 0.45) + 0.75 * (arms - 0.45),
                0.04, 2.2
              );

              float samplesDiskHeight = sampleR * effectiveScaleHeight;
              float heightFalloff = exp(-abs(sampleP.y) / max(0.001, samplesDiskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));

              // Radial envelope: bright across the inner disk, then a long
              // fade so the visible edge sits well inside the physical
              // outer radius (the reference disk ends in darkness, not a
              // hard cut at the frame edge).
              float radialT = clamp((sampleR - diskInner) / max(0.001, diskOuter - diskInner), 0.0, 1.0);
              float radialFalloff = pow(1.0 - radialT, 2.2) * smoothstep(0.0, 0.06, radialT);

              float baseDensity = turbulence * heightFalloff * radialFalloff;

              if (baseDensity > 0.001) {
                  // ==========================================================
                  // PhD-GRADE EXACT KERR KINEMATICS (Page & Thorne 1974)
                  // ==========================================================
                  float r2 = sampleR * sampleR;

                  // 1. Exact Keplerian Angular Velocity (Omega = dphi/dt)
                  float sqrt_M = sqrt(M);
                  float signSpin = sign(u_spin + 1e-8);
                  float Omega = (signSpin * sqrt_M) / (sampleR * sqrt(sampleR) + a * sqrt_M);

                  // 2. Exact Metric Components in Equatorial Plane (theta = pi/2)
                  float g_tt = -(1.0 - 2.0 * M / sampleR);
                  float g_tphi = -2.0 * M * a / sampleR;
                  float g_phiphi = r2 + a*a + 2.0 * M * a*a / sampleR;

                  // 3. Exact 4-Velocity Time Component (u^t)
                  // Solves g_mu_nu u^mu u^nu = -1 for circular equatorial orbits
                  float u_t_sq = -(g_tt + 2.0 * Omega * g_tphi + Omega * Omega * g_phiphi);
                  float u_t = 1.0 / sqrt(max(1e-6, u_t_sq));

                  // 4. Conserved Photon Angular Momentum (L_y)
                  // Impact parameter mapping from local frame (cross product of position and ray dir)
                  float L_photon = p.z * v.x - p.x * v.z;

                  // 5. General Relativistic Doppler Factor (delta = E_obs / E_em)
                  // Exact derivation: E_em = -k.u = u_t(1 - Omega * L_photon), E_obs = 1 at infinity
                  float delta = 1.0 / max(0.01, u_t * (1.0 - Omega * L_photon));

#ifdef ENABLE_DOPPLER
                  // Relativistic Beaming (Liouville's Theorem for Specific Intensity)
                  // Bolometric flux I_nu scales as delta^4. delta^3.2 keeps the
                  // approaching side clearly brighter without clipping the HDR
                  // buffer; the cap stops a grazing inner-edge sample from
                  // detonating into a white blob.
                  float beaming = min(pow(max(delta, 0.01), 3.2), 24.0);
#else
                  float beaming = 1.0;
#endif
                  // 6. Novikov-Thorne Temperature Profile (Zero-Torque inner boundary)
                  float isco_r = clamp(isco / sampleR, 0.0, 1.0);
                  float nt_factor = max(0.0, 1.0 - sqrt(isco_r));
                  // Physically T ~ r^-3/4, which drives the outer disk deep red.
                  // The reference frame keeps the outer band gold-orange, so the
                  // radial exponent is softened (0.5) to hold the warmth out to
                  // the visible edge without touching the inner-edge physics.
                  float radialTempGradient = pow(isco_r, 0.5) * pow(nt_factor, 0.25);

                  // Temperature natively shifted by full relativistic Doppler delta
                  // (Replacing the previous Euclidean gravRedshift multiplier)
                  float temperature = u_disk_temp * radialTempGradient * delta;

                  // --- Golden-Orange Disk Color Grading ---
                  // The reference features a rich golden-orange accretion disk.
                  // Instead of the default blackbody (which peaks white-hot at high T),
                  // we grade the color to produce golden hues.
                  // 
                  // 1. Base blackbody color at the observed temperature.
                  // 2. Pull very hot regions back toward white-gold.
                  // 3. Warm the mid-disk toward orange.
                  // 4. Strong lensing enhancement for the brightest regions.
                  // 
                  // Map temperature to golden-orange chromaticity:
                  //   - Cool regions (low T): slight blue-white
                  //   - Mid regions: warm orange-gold
                  //   - Hot regions: golden-yellow (capped)
                  float diskColorTemp = max(temperature, 1000.0);
                  // Gold-orange mapping: lower temps -> more orange, higher -> more yellow-white
                  float goldWeight = smoothstep(4000.0, 6000.0, diskColorTemp) * 0.6;
                  float orangeWeight = smoothstep(3000.0, 5000.0, diskColorTemp) * 0.8;

                  // Base color from blackbody, then grade it
                  vec3 diskColor = blackbody(temperature);

                  // Warm shadows and midtones toward gold/orange
                  diskColor = mix(
                      diskColor,
                      vec3(1.0, 0.93, 0.75) * goldWeight + vec3(1.0, 0.85, 0.55) * orangeWeight,
                      0.65
                  );

                  // Cap the very hottest regions from becoming pure white
                  // and instead keep them golden-yellow
                  float hotCap = smoothstep(0.55, 1.15, temperature / max(u_disk_temp, 1.0));
                  diskColor = mix(diskColor, diskColor * vec3(1.0, 0.92, 0.78), 0.55 * hotCap);

                  // Additional golden warmth boost across the whole disk
                  diskColor = mix(diskColor, diskColor * vec3(1.02, 0.98, 0.90), 0.15);

                  // Ensure no channel exceeds a warm ceiling
                  diskColor = min(diskColor, vec3(1.1, 0.95, 0.8));

                  // Radiated power scales ~T^4, but the reference frame keeps
                  // the outer disk luminous instead of collapsing to brown.
                  // A gentler exponent (2.2 instead of 3.0) keeps the golden
                  // ribbon readable all the way out to the visible edge.
                  float peakTemp = max(u_disk_temp * 0.78, 1.0);
                  float thermal = pow(clamp(temperature / peakTemp, 0.0, 2.2), 2.2);

                  float emission = thermal * beaming * u_diskGain;
                  // Optical depth per sample. Tuned so the disk reads as the
                  // luminous golden-orange ribbon of the reference frame: high
                  // enough to accumulate real brightness along the sight line,
                  // low enough that the filaments stay visible in the outer disk.
                  float density = clamp(baseDensity * u_disk_density * 0.26 * dt, 0.0, 1.0);

                  accumulatedColor += diskColor * emission * density * (1.0 - accumulatedAlpha);
                  accumulatedAlpha += density;
              }
          }
      }
  }

  void sample_relativistic_jets(
      vec3 p, vec3 v, float r, float rh, float dt,
      inout vec3 accumulatedColor, inout float accumulatedAlpha
  ) {
      // Jets align with spin axis (Y-axis)
      float jetVerticalPos = abs(p.y);
      if (jetVerticalPos > rh * 1.8 && jetVerticalPos < MAX_DIST * 0.8) {
          float jetRadialDist = length(p.xz);
          float jetWidth = 1.0 + jetVerticalPos * 0.15;

          if (jetRadialDist < jetWidth * 2.0) {
              float radialFalloff = exp(-(jetRadialDist * jetRadialDist) / (jetWidth * 0.5));
              float lengthFalloff = exp(-jetVerticalPos * 0.05);

              float flowCombined = p.y * 2.0 - u_time * 8.0;
              vec3 uvJet = vec3(p.x, flowCombined, p.z);
              float noiseVal = noise(uvJet * 0.5) * 0.6 + noise(uvJet * 1.5) * 0.4;

              float jetDensity = radialFalloff * lengthFalloff * max(0.0, noiseVal - 0.2);

              if (jetDensity > 0.001) {
                  float jetVel = 0.92 * sign(p.y);
                  vec3 jetVelVec = vec3(0.0, jetVel, 0.0);

                  float cosThetaJet = dot(normalize(jetVelVec), -v);
                  float betaJet = abs(jetVel);
                  float gammaJet = 1.0 / sqrt(1.0 - betaJet * betaJet);
                  float deltaJet = 1.0 / (gammaJet * (1.0 - betaJet * cosThetaJet));
                  float beamingJet = pow(deltaJet, 3.5);

                  vec3 baseJetColor = vec3(0.4, 0.7, 1.0);
                  vec3 jetEmission = baseJetColor * jetDensity * 0.05 * beamingJet * dt;

                  accumulatedColor += jetEmission * (1.0 - accumulatedAlpha);
                  accumulatedAlpha += jetDensity * 0.05 * dt;
              }
          }
      }
  }
`;

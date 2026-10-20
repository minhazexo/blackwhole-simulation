import { PHYSICS_CONSTANTS } from "@/config/physics.config";

export const DISK_CHUNK = `
  // Explicit temperature ramp for predictable slider behavior.
  // Anchors: deep red -> orange -> yellow -> white -> blue.
  // The ramp is driven by the global Disk Temp slider so the full disk
  // follows the same progression instead of staying red because local
  // radial temperatures are lower than the slider value.
  vec3 disk_temperature_ramp(float tempK) {
      float t = clamp(tempK, 1000.0, 14500.0);
      // Reference-anchored blackbody ramp: deep orange (236,94,15) ~ (0.925,0.369,0.059)
      // at the inner edge, warming to golden through the disk.
      vec3 red    = vec3(1.00, 0.05, 0.01);   // deep warm red at low temp
      vec3 orange = vec3(1.00, 0.37, 0.06);   // golden-orange matching reference
      vec3 yellow = vec3(1.00, 0.75, 0.20);   // warm gold-yellow
      vec3 white  = vec3(1.00, 0.955, 0.885);  // warm white, not cool
      vec3 blue   = vec3(0.34, 0.58, 1.00);   // blue at extreme hot end

      if (t < 3200.0) {
          return mix(red, orange, smoothstep(1000.0, 3200.0, t));
      }
      if (t < 5800.0) {
          return mix(orange, yellow, smoothstep(3200.0, 5800.0, t));
      }
      if (t < 9500.0) {
          return mix(yellow, white, smoothstep(5800.0, 9500.0, t));
      }
      return mix(white, blue, smoothstep(9500.0, 14500.0, t));
  }
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

          // Use the cylindrical radius in the disk plane (the spin axis is Y).
          // This keeps filament spacing coherent as the ray crosses the thin disk.
          float sampleR = max(length(sampleP.xz), 0.0001);

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
              // HIGH-CONTRAST, FLOW-ALIGNED ACCRETION-DISK FILAMENTS
              //
              // The reference image is not just soft FBM cloud-noise. It has
              // many narrow orbital strands, dark channels between them, and
              // gentle radial/azimuthal warping that keeps the strands from
              // looking like perfectly regular rings.
              //
              // Work in (azimuth, log-radius). Cos/sin embedding makes all
              // noise periodic across the -PI/+PI seam. The field is sampled
              // in the co-rotating frame, so the texture follows the disk.
              // ==========================================================
              float ang = atan(sampleP.z, sampleP.x);
              float phase = ang - rotAngle;
              float lr = log(sampleR / diskInner + 1.0);

              // Three correlated scales: broad flow lanes, medium clumps,
              // and a finer field for local strand breakup. Angular scale is
              // deliberately lower than radial scale so features stretch
              // into long curved filaments instead of round noise blobs.
              float broadFlow = adaptiveFbm(
                  vec3(cos(phase) * 1.45, sin(phase) * 1.45, lr * 4.5), 2
              );
              float mediumFlow = adaptiveFbm(
                  vec3(cos(phase) * 3.0, sin(phase) * 3.0, lr * 11.0), 3
              );
              float clump = adaptiveFbm(
                  vec3(cos(phase) * 2.0, sin(phase) * 2.0, lr * 6.0), 2
              );

              // Radius-dependent shear makes the larger structures form
              // trailing spiral lanes. Broad and medium noise softly warp
              // these lanes without introducing a seam at the angle wrap.
              float spiralPhase = phase - lr * 6.6 + (broadFlow - 0.5) * 0.85;
              float arms = adaptiveFbm(
                  vec3(cos(spiralPhase) * 3.7, sin(spiralPhase) * 3.7, lr * 4.0), 2
              );
              float fineFlow = adaptiveFbm(
                  vec3(cos(phase) * 5.2, sin(phase) * 5.2, lr * 23.0), 2
              );

              // Warp angle and log-radius separately. Tiny radial offsets
              // are enough to bend high-frequency lines into silky, flowing
              // arcs while preserving their continuity over many revolutions.
              float phaseWarp =
                    0.95 * sin(phase * 2.0 - lr * 2.5)
                  + 0.42 * sin(phase * 5.0 + lr * 3.7)
                  + (broadFlow - 0.5) * 2.7
                  + (mediumFlow - 0.5) * 1.35
                  + (arms - 0.5) * 0.85;
              float radialWarp =
                    (broadFlow - 0.5) * 0.0090
                  + (mediumFlow - 0.5) * 0.0042
                  + (fineFlow - 0.5) * 0.0018;
              float warpedLr = lr + radialWarp;

              // Main bright threads. Integer angular harmonics keep the
              // signal seamless at 2PI while causing the rings to wind into
              // a few long spiral lanes rather than staying concentric.
              float mainFilamentPhase = warpedLr * 150.0 - phase * 2.0 + phaseWarp;
              float mainFilamentSignal = 0.5 + 0.5 * cos(mainFilamentPhase);
              float sharpFilaments = pow(clamp(mainFilamentSignal, 0.0, 1.0), 14.0);

              // A second strand family supplies hairline detail between the
              // larger filaments. Sharper ridge powers leave dark gaps, which
              // are essential to the reference's crisp, high-contrast texture.
              float fineFilamentPhase =
                    warpedLr * 280.0 - phase * 3.0
                  + phaseWarp * 1.28
                  + (clump - 0.5) * 2.4;
              float fineFilamentSignal = 0.5 + 0.5 * cos(fineFilamentPhase);
              float fineFilaments = pow(clamp(fineFilamentSignal, 0.0, 1.0), 20.0);

              // Sparse micro-strands add fine glints, not a uniform fog layer.
              float microFilamentPhase =
                    warpedLr * 420.0 - phase * 5.0
                  + phaseWarp * 1.58
                  + (fineFlow - 0.5) * 2.0;
              float microFilamentSignal = 0.5 + 0.5 * cos(microFilamentPhase);
              float microFilaments = pow(clamp(microFilamentSignal, 0.0, 1.0), 24.0);

              // Ultra-fine micro-strands: hair-thin glints between the micro strands.
              // High angular frequency keeps them as fine lines, not fog.
              float ultraFlow = adaptiveFbm(
                  vec3(cos(phase) * 8.0, sin(phase) * 8.0, lr * 40.0), 2
              );
              float ultraFilamentPhase =
                    warpedLr * 640.0 - phase * 8.0
                  + phaseWarp * 2.0
                  + (ultraFlow - 0.5) * 3.0;
              float ultraFilamentSignal = 0.5 + 0.5 * cos(ultraFilamentPhase);
              float ultraFilaments = pow(clamp(ultraFilamentSignal, 0.0, 1.0), 30.0);

              // Ridged noise follows the spiral flow and breaks individual
              // strands into uneven bright/dim sections like turbulent gas.
              float strandNoise = adaptiveFbm(
                  vec3(cos(spiralPhase) * 4.6, sin(spiralPhase) * 4.6, warpedLr * 20.0), 3
              );
              float strandRidge = 1.0 - abs(2.0 * strandNoise - 1.0);
              strandRidge = pow(clamp(strandRidge, 0.0, 1.0), 4.0);

              // Modulate strand strength in broad lanes. Keep only a tiny
              // density floor: a large floor fills the dark channels and makes
              // the whole disk read as a blurry orange cloud.
              float laneMask = smoothstep(
                  0.25, 0.75,
                  0.56 * clump + 0.27 * mediumFlow + 0.17 * arms
              );
              float filamentTexture = clamp(
                    0.0025
                  + 1.75 * sharpFilaments * (0.68 + 0.48 * laneMask)
                  + 0.90 * fineFilaments
                  + 0.38 * microFilaments
                  + 0.30 * ultraFilaments
                  + 0.26 * strandRidge,
                  0.0, 2.25
              );
              float structureMod = clamp(
                  0.25 + 1.05 * laneMask + 0.34 * (arms - 0.5),
                  0.05, 1.50
              );
              float turbulence = clamp(filamentTexture * structureMod, 0.003, 2.25);

              float samplesDiskHeight = sampleR * effectiveScaleHeight;
              float heightFalloff = exp(-abs(sampleP.y) / max(0.001, samplesDiskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));

              // A slow outer fade keeps the disk long and wispy; the tighter
              // inner ramp protects a crisp edge near the black-hole silhouette.
              float radialT = clamp((sampleR - diskInner) / max(0.001, diskOuter - diskInner), 0.0, 1.0);
              float radialFalloff = pow(1.0 - radialT, 2.10) * smoothstep(0.0, 0.040, radialT);

              // Separate the thin hot rim core from its wider dimmer halo.
              // This keeps a razor-like edge while retaining the soft glow in the reference.
              float innerRimCore = exp(-pow((radialT - 0.012) / 0.0040, 2.0));
              float innerRimHalo = exp(-pow((radialT - 0.031) / 0.023, 2.0));
              float innerRim = max(innerRimCore, 0.48 * innerRimHalo);

              // Dedicated hot ring: a thin, intensely bright band right at the
              // inner edge, independent of filament noise. Matches the reference's
              // blown-out white-hot ring hugging the event horizon silhouette.
              float hotRingCore = exp(-pow((radialT - 0.008) / 0.0030, 2.0));
              float hotRing = clamp(hotRingCore * 4.5, 0.0, 1.0);

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
                  float beaming = min(pow(max(delta, 0.01), 2.6), 12.0);
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

                   // Observed temperature includes relativistic Doppler beaming
                   // (delta) and drives the radiated brightness. The colour,
                   // however, follows the emitted blackbody temperature so the
                   // Disk Temp slider shifts the whole disk through the
                   // red -> orange -> yellow -> white -> blue progression and
                   // the approaching/receding sides keep the same hue (the
                   // reference disk is a uniform warm ribbon; beaming is a
                   // brightness effect, not a colour flip).
                   float emitTemp = u_disk_temp * radialTempGradient;
                   float obsTemp = emitTemp * delta;

                   // --- Explicit Disk Temperature Color Progression ---
                   // The slider controls the primary hue in a fixed, easy-to-tune
                   // sequence: RED -> ORANGE -> YELLOW -> WHITE -> BLUE.
                   // The local emitted temperature contributes only a subtle tint,
                   // so the cool radial profile can never force the whole disk red.
                   float diskTempVisibility = smoothstep(1200.0, 5000.0, u_disk_temp);
                   vec3 globalTemperatureColor = disk_temperature_ramp(u_disk_temp);
                   vec3 localTemperatureColor = disk_temperature_ramp(max(1000.0, emitTemp));
                   float localColorInfluence = mix(0.18, 0.10, diskTempVisibility);
                   vec3 diskColor = mix(globalTemperatureColor, localTemperatureColor, localColorInfluence);

                   // Keep filament accents aligned with the selected temperature:
                   // warm cream at low/mid settings, cool blue-white at high settings.
                   float hotColorShift = smoothstep(9500.0, 14500.0, u_disk_temp);
                   vec3 filamentAccent = mix(
                       vec3(1.0, 0.82, 0.58), vec3(0.72, 0.86, 1.0), hotColorShift
                   );
                   float filamentHighlight = clamp(
                       sharpFilaments * 0.34 + microFilaments * 0.20, 0.0, 0.46
                   ) * mix(0.18, 1.0, diskTempVisibility);
                   vec3 filamentColor = mix(diskColor, filamentAccent, filamentHighlight);

                   // The narrow inner rim follows the same temperature ramp too,
                   // rather than remaining permanently orange when the disk turns blue.
                   vec3 rimAccent = mix(
                       vec3(1.0, 0.94, 0.82), vec3(0.72, 0.84, 1.0), hotColorShift
                   );
                   vec3 finalDiskColor = mix(
                       filamentColor, rimAccent, clamp(innerRim * 0.62, 0.0, 0.62)
                   );

                   // Radiated power scales with the observed (beamed)
                   // temperature. Fixed peak so brightness scales with the
                   // absolute disk temperature instead of being normalised away
                   // (peakTemp must NOT be proportional to u_disk_temp,
                   // otherwise the slider cancels).
                   float peakTemp = 15000.0;
                   // Floor the observed temperature for the brightness calc so a
                   // very cool disk never vanishes entirely: the disk (and its
                   // event-horizon framing) must always remain visible, while
                   // the colour above still tracks the real (unscaled) temp.
                   float thermal = pow(clamp(max(obsTemp, 1500.0) / peakTemp, 0.0, 3.0), 2.2);

                   // Minimum visible emissivity prevents the red accretion disk
                   // from vanishing when the Disk Temp slider is turned down.
                   // The floor fades out as temperature rises, preserving the
                   // brighter, temperature-driven appearance at normal/hot settings.
                   float visibleEmissionFloor = mix(0.16, 0.008, diskTempVisibility);
                   float visibleThermal = max(thermal, visibleEmissionFloor);
                   float emission = visibleThermal * beaming * u_diskGain;

                  // Preserve a hairline-hot inner edge without turning the whole
                  // inner disk into a large white blob. A subtle shoulder ties it
                  // into the orange flow immediately outside the rim.
                  float innerShoulder = (1.0 - smoothstep(0.035, 0.19, radialT))
                                      * smoothstep(0.0, 0.025, radialT);
                  emission *= (1.0 + 1.75 * innerRim) * (1.0 + 2.0 * hotRing) * (1.0 + 0.14 * innerShoulder);
                  // Optical depth per sample. Tuned so the disk reads as the
                  // luminous golden-orange ribbon of the reference frame: high
                  // enough to accumulate real brightness along the sight line,
                  // low enough that the filaments stay visible in the outer disk.
                   float density = clamp(baseDensity * u_disk_density * 0.25 * dt, 0.0, 1.0);

                  accumulatedColor += finalDiskColor * emission * density * (1.0 - accumulatedAlpha);
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

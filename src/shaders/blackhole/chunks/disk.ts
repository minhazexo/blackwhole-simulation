import { PHYSICS_CONSTANTS } from "@/config/physics.config";

export const DISK_CHUNK = `
  // Explicit temperature ramp for predictable slider behavior.
  // Anchors: deep red -> orange -> yellow -> white -> blue-white -> blue.
  // The ramp is driven by the global Disk Temp slider so the full disk
  // follows the same progression instead of staying red because local
  // radial temperatures are lower than the slider value.
  // The ramp spans the whole 1000 K .. 1,000,000 K range of the slider: the
  // old 14,500 K ceiling is gone, so every setting of the slider moves the
  // disk further along the blackbody progression.
  vec3 disk_temperature_ramp(float tempK) {
      float t = clamp(tempK, 1000.0, 1000000.0);
      // Reference-anchored blackbody ramp. The anchors are the *linear HDR*
      // colours of the disk, so they are deliberately saturated: the tone
      // mapper (ACES) compresses them towards white, which is what turns the
      // hot core into a warm white rim and the body into a gold-orange
      // ribbon. A desaturated anchor here reads as silver.
      vec3 red    = vec3(1.00, 0.22, 0.07);   // deep warm red at low temp
      vec3 orange = vec3(1.00, 0.38, 0.12);   // golden-orange matching reference
      vec3 yellow = vec3(1.00, 0.52, 0.24);   // warm gold-yellow
      vec3 white  = vec3(1.00, 0.90, 0.78);   // warm white, not cool
      vec3 blueWhite = vec3(0.62, 0.80, 1.00); // blue-white above ~30 kK
      vec3 blue   = vec3(0.24, 0.42, 1.00);   // saturated blue at the hot end
      vec3 deepBlue = vec3(0.10, 0.24, 1.00); // deep blue at the extreme end

      if (t < 3200.0) {
          return mix(red, orange, smoothstep(1000.0, 3200.0, t));
      }
      if (t < 5800.0) {
          return mix(orange, yellow, smoothstep(3200.0, 5800.0, t));
      }
      if (t < 16000.0) {
          return mix(yellow, white, smoothstep(5800.0, 16000.0, t));
      }
      if (t < 30000.0) {
          return mix(white, blueWhite, smoothstep(16000.0, 30000.0, t));
      }
      if (t < 200000.0) {
          return mix(blueWhite, blue, smoothstep(30000.0, 200000.0, t));
      }
      return mix(blue, deepBlue, smoothstep(200000.0, 1000000.0, t));
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
              // The winding is kept shallow: a strongly wound phase turns the
              // outer disk into a swirling vortex instead of the reference's
              // smooth, nearly azimuthal strands.
              float spiralPhase = phase - lr * 1.8 + (broadFlow - 0.5) * 0.55;
              float arms = adaptiveFbm(
                  vec3(cos(spiralPhase) * 3.7, sin(spiralPhase) * 3.7, lr * 4.0), 2
              );
              float fineFlow = adaptiveFbm(
                  vec3(cos(phase) * 5.2, sin(phase) * 5.2, lr * 23.0), 2
              );

              // Warp angle and log-radius separately. The radial offsets have
              // to stay far below 1 / (filament radial frequency): the main
              // strand family runs at ~36 rad per unit log-radius, so a warp of
              // 0.01 already shifts it by a third of a cycle and shreds the
              // strands into a beaded haze. The reference keeps long, smooth,
              // continuous hair-like strands, so the radial warp is small.
              // The angular warp is small for the same reason: a strongly
              // wobbled ring turns the disk into a crosshatch of short
              // crossing filaments instead of combed, parallel strands.
              float phaseWarp =
                    0.28 * sin(phase * 2.0 - lr * 2.5)
                  + 0.14 * sin(phase * 5.0 + lr * 3.7)
                  + (broadFlow - 0.5) * 0.45
                  + (mediumFlow - 0.5) * 0.22
                  + (arms - 0.5) * 0.16;
              float radialWarp =
                    (broadFlow - 0.5) * 0.0016
                  + (mediumFlow - 0.5) * 0.0008
                  + (fineFlow - 0.5) * 0.0003;
              float warpedLr = lr + radialWarp;

              // Main bright threads. Integer angular harmonics keep the
              // signal seamless at 2PI while causing the rings to wind into
              // a few long spiral lanes rather than staying concentric.
              // The radial frequencies are a compromise: the reference frame
              // is made of many fine strands, but frequencies that the ray
              // march cannot resolve alias into a beaded mesh instead of
              // continuous hair.
              float mainFilamentPhase = warpedLr * 36.0 - phase * 2.0 + phaseWarp;
              float mainFilamentSignal = 0.5 + 0.5 * cos(mainFilamentPhase);
              float sharpFilaments = pow(clamp(mainFilamentSignal, 0.0, 1.0), 14.0);

              // A second strand family supplies hairline detail between the
              // larger filaments. Sharper ridge powers leave dark gaps, which
              // are essential to the reference's crisp, high-contrast texture.
              float fineFilamentPhase =
                    warpedLr * 70.0 - phase * 3.0
                  + phaseWarp * 1.28
                  + (clump - 0.5) * 2.4;
              float fineFilamentSignal = 0.5 + 0.5 * cos(fineFilamentPhase);
              float fineFilaments = pow(clamp(fineFilamentSignal, 0.0, 1.0), 24.0);

              // Sparse micro-strands add fine glints, not a uniform fog layer.
              float microFilamentPhase =
                    warpedLr * 120.0 - phase * 5.0
                  + phaseWarp * 1.58
                  + (fineFlow - 0.5) * 2.0;
              float microFilamentSignal = 0.5 + 0.5 * cos(microFilamentPhase);
              float microFilaments = pow(clamp(microFilamentSignal, 0.0, 1.0), 26.0);

              // Ridged noise follows the orbital flow and breaks individual
              // strands into uneven bright/dim sections like turbulent gas.
              // It is sampled in the co-rotating frame: sampling it on the
              // wound spiral phase is what produced the swirling vortex.
              float strandNoise = adaptiveFbm(
                  vec3(cos(phase) * 4.6, sin(phase) * 4.6, warpedLr * 20.0), 3
              );
              float strandRidge = 1.0 - abs(2.0 * strandNoise - 1.0);
              strandRidge = pow(clamp(strandRidge, 0.0, 1.0), 4.0);

              // Modulate strand strength in broad lanes. Keep only a tiny
              // density floor: a large floor fills the dark channels and makes
              // the whole disk read as a blurry orange cloud. The lanes are
              // driven by the smooth flow fields only - the spiral arms barely
              // contribute, because a strong arm term is what turns the
              // combed strands into a swirling crosshatch.
              float laneMask = smoothstep(
                  0.25, 0.75,
                  0.64 * clump + 0.32 * mediumFlow + 0.04 * arms
              );
              float filamentTexture = clamp(
                    0.0002
                  + 2.40 * sharpFilaments * (0.68 + 0.48 * laneMask)
                  + 0.55 * fineFilaments
                  + 0.06 * microFilaments
                  + 0.06 * strandRidge,
                  0.0, 2.25
              );
              float structureMod = clamp(
                  0.03 + 1.05 * laneMask + 0.03 * (arms - 0.5),
                  0.05, 1.50
              );
              // No lower clamp: the reference frame has genuinely dark
              // channels between the strands, and a floor on the density
              // fills every gap with a uniform orange sheet.
              float turbulence = clamp(filamentTexture * structureMod, 0.0, 2.25);

              float heightFalloff = exp(-abs(sampleP.y) / max(0.001, diskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));

              // A slow outer fade keeps the disk long and wispy; the tighter
              // inner ramp protects a crisp edge near the black-hole silhouette.
              // The reference disk is compact: beyond a few shadow radii it is
              // only a scatter of dim threads, so the falloff is steep enough
              // that the outer disk stops lighting up the lensed images.
              float radialT = clamp((sampleR - diskInner) / max(0.001, diskOuter - diskInner), 0.0, 1.0);
              float radialFalloff = pow(1.0 - radialT, 4.5) * smoothstep(0.0, 0.035, radialT);

              // Separate the thin hot rim core from its wider dimmer halo.
              // This keeps a razor-like edge while retaining the soft glow in the reference.
              float innerRimCore = exp(-pow((radialT - 0.009) / 0.0030, 2.0));
              float innerRimHalo = exp(-pow((radialT - 0.020) / 0.0075, 2.0));
              float innerRim = max(innerRimCore, 0.12 * innerRimHalo);

              // Dedicated hot ring: a thin, intensely bright band right at the
              // inner edge, independent of filament noise. The shape is still
              // computed (the reference's hairline white rim at the inner edge)
              // but its emission boost is disabled: that rim is a hairline, not a wide band.
              float hotRingCore = exp(-pow((radialT - 0.006) / 0.0016, 2.0));
              float hotRing = clamp(hotRingCore * 0.0, 0.0, 1.0);

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
                  float beaming = min(pow(max(delta, 0.01), 2.2), 3.5);
#else
                  float beaming = 1.0;
#endif
                  // 6. Local Temperature Profile (Shakura-Sunyaev thin disk)
                  // The emitted temperature of a thin disk falls as T ~ r^-3/4,
                  // so the inner edge is the hottest region and the disk cools
                  // smoothly outward. The slider value is the ISCO (inner edge)
                  // temperature and every sample is coloured by its own local
                  // temperature. That local gradient is what gives the
                  // reference frame its white-hot rim, golden middle and orange
                  // outer band instead of one flat colour for the whole disk.
                  float isco_r = clamp(isco / sampleR, 0.0, 1.0);
                  float radialTempGradient = pow(isco_r, 0.85);

                    // Observed temperature includes relativistic Doppler beaming
                    // (delta) and drives the radiated brightness. The colour,
                    // however, follows the emitted blackbody temperature so the
                    // Disk Temp slider shifts the whole disk through the
                    // red -> orange -> yellow -> white -> blue progression and
                    // the approaching/receding sides keep the same hue (the
                    // reference disk is a uniform warm ribbon; beaming is a
                    // brightness effect, not a colour flip).
                    float emitTemp = u_disk_temp * radialTempGradient;

                    // Radiated power. The reference ribbon keeps its
                    // brightness along its whole length and only its colour
                    // cools outward, so the falloff follows the optical depth
                    // (shallow) instead of the steep temperature profile. The
                    // temperature still drives the hue through localTemp.
                    // The radial brightness has to fall faster than the
                    // geometry suggests: at a shallow inclination the sight
                    // line through the outer disk is very long, so a shallow
                    // falloff lights up the lensed images of the outer rings
                    // and the disk turns into a cage of arcs around the
                    // shadow instead of the reference's single clean ribbon.
                    float radialBrightness = pow(isco_r, 1.8);
                    float brightTemp = u_disk_temp * radialBrightness * delta;

                    // --- Local Blackbody Colour ---
                    // The slider keeps global reach so the outer band never goes
                    // fully cold, while the local (radial) temperature drives
                    // the hue of each sample.
                    float diskTempVisibility = smoothstep(1200.0, 5000.0, u_disk_temp);
                    float localTemp = mix(u_disk_temp, emitTemp, 0.72);
                    vec3 diskColor = disk_temperature_ramp(clamp(localTemp, 1000.0, 1000000.0));

                    // Keep filament accents aligned with the selected temperature:
                    // warm cream at low/mid settings, cool blue-white at high settings.
                    // The accent stays well below the disk's own hue so the mid
                    // disk keeps the reference frame's copper tone: only the
                    // hottest few pixels are allowed to wash out to cream.
                    float hotColorShift = smoothstep(9500.0, 120000.0, u_disk_temp);
                    vec3 filamentAccent = mix(
                        vec3(1.0, 0.74, 0.46), vec3(0.72, 0.86, 1.0), hotColorShift
                    );
                    float filamentHighlight = clamp(
                        sharpFilaments * 0.34 + microFilaments * 0.20, 0.0, 0.22
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
                    // otherwise the slider cancels). The exponent is close to
                    // linear so the cool outer band of the disk still carries
                    // visible structure instead of collapsing to black.
                    float peakTemp = 15000.0;
                    // Floor the observed temperature for the brightness calc so a
                    // very cool disk never vanishes entirely: the disk (and its
                    // event-horizon framing) must always remain visible, while
                    // the colour above still tracks the real (unscaled) temp.
                    float rawThermal = pow(clamp(max(brightTemp, 1500.0) / peakTemp, 0.0, 3.0), 1.0);
                    // Tone-map-safe roll-off for the very hot end of the slider.
                    // The ACES tone map desaturates every highlight that sits far
                    // above white, so an unclamped 1e6 K disk would render as a
                    // white blob and the blue-white -> blue end of the ramp
                    // would never be visible. The radiance still follows the
                    // temperature through the fixed peak temperature above (it
                    // is never normalised by u_disk_temp, which would cancel
                    // the slider out), but the extremely hot settings are
                    // rolled into the band where the blackbody hue survives
                    // the tone map instead of running away.
                    float thermal = rawThermal / (1.0 + 30.0 * smoothstep(12000.0, 200000.0, u_disk_temp));

                    // Minimum visible emissivity prevents the red accretion disk
                    // from vanishing when the Disk Temp slider is turned down.
                    // The floor fades out as temperature rises, preserving the
                    // brighter, temperature-driven appearance at normal/hot settings,
                    // and it thins with radius so the cool outer band never turns
                    // into a flat grey haze.
                    float visibleEmissionFloor = mix(0.16, 0.008, diskTempVisibility)
                                               * mix(1.0, 0.30, radialT);
                    float visibleThermal = max(thermal, visibleEmissionFloor);
                    float emission = visibleThermal * beaming * u_diskGain;

                    // Preserve a hairline-hot inner edge without turning the whole
                    // inner disk into a large white blob. A subtle shoulder ties it
                    // into the orange flow immediately outside the rim.
                    float innerShoulder = (1.0 - smoothstep(0.015, 0.075, radialT))
                                       * smoothstep(0.0, 0.012, radialT);
                    // The rim-accent multipliers stay tunable but are deliberately 0: the reference's rim is a hairline from the base emission.
                    emission *= (1.0 + 0.0 * innerRim) * (1.0 + 0.0 * hotRing) * (1.0 + 0.10 * innerShoulder);
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

export const BACKGROUND_CHUNK = `
  // ================================================================
  // PHOTOGRAPHIC SKY
  //
  // The sky is a pure function of the *final* ray direction, so it is
  // sampled along the lensed light path (never as a flat screen overlay)
  // and never drifts while the camera holds still.
  //
  // Two contributors, composited in linear light:
  //   1. An equirectangular Milky Way panorama (dust lanes, unresolved
  //      star haze, the warm galactic core) sampled by direction.
  //   2. Procedural stars on a cube-face grid. Cubemap cells keep star
  //      shapes round and densities even at every latitude: the old
  //      3D-cell trick sliced the sky sphere through a volumetric lattice,
  //      which stretched single stars into long tangential dashes and
  //      repeated them across neighbouring cells.
  // ================================================================

  // Project a direction onto its dominant cube face. Returns face-local
  // coordinates in [-1,1] and a stable face id for hashing.
  vec2 cubeFaceCoord(vec3 dir, out float faceId) {
    vec3 a = abs(dir);
    if (a.x >= a.y && a.x >= a.z) {
      faceId = dir.x > 0.0 ? 0.0 : 3.0;
      return dir.yz / max(a.x, 1e-5);
    } else if (a.y >= a.z) {
      faceId = dir.y > 0.0 ? 1.0 : 4.0;
      return dir.xz / max(a.y, 1e-5);
    }
    faceId = dir.z > 0.0 ? 2.0 : 5.0;
    return dir.xy / max(a.z, 1e-5);
  }

  // Equirectangular lookup of the Milky Way plate. The source is an
  // sRGB JPEG, so it is linearised before use in the HDR scene.
  vec3 sampleSkyPlate(vec3 dir) {
    float u = atan(dir.z, dir.x) * 0.15915494 + 0.5;
    float v = acos(clamp(dir.y, -1.0, 1.0)) * 0.31830989;
    vec3 srgb = texture(u_milkywayTex, vec2(u, v)).rgb;
    return pow(max(srgb, 0.0), vec3(2.2));
  }

  // Smooth star color from a temperature parameter (0=hot blue, 1=cool red)
  vec3 realisticStarColor(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.66, 0.76, 1.0);   // O/B (blue-white)
    vec3 c1 = vec3(0.86, 0.90, 1.0);   // A (white)
    vec3 c2 = vec3(1.0, 0.97, 0.92);   // F (yellow-white)
    vec3 c3 = vec3(1.0, 0.86, 0.66);   // G (solar)
    vec3 c4 = vec3(1.0, 0.66, 0.42);   // K (orange)
    vec3 c5 = vec3(1.0, 0.42, 0.30);   // M (red)

    float s = t * 5.0;
    vec3 col;
    if (s < 1.0) col = mix(c0, c1, s);
    else if (s < 2.0) col = mix(c1, c2, s - 1.0);
    else if (s < 3.0) col = mix(c2, c3, s - 2.0);
    else if (s < 4.0) col = mix(c3, c4, s - 3.0);
    else col = mix(c4, c5, s - 4.0);
    return max(col, vec3(0.0));
  }

  // One star layer on the cubemap grid.
  //   threshold: hash cutoff (higher = fewer stars)
  //   brightnessPow / brightnessScale: dynamic range shaping
  //   band: extra density where the Milky Way plate is bright
  vec3 starLayer(
      vec3 dir, float gridScale, float threshold,
      float brightnessPow, float brightnessScale,
      float seed, float band
  ) {
    float faceId;
    vec2 fuv = cubeFaceCoord(dir, faceId);

    vec2 gp = fuv * gridScale + vec2(seed * 0.137, seed * 0.311);
    vec2 cell = floor(gp);
    vec2 fp = fract(gp);

    float hSeed = hash(vec3(cell, faceId * 31.0 + seed));
    // Denser star field where the photographic band is bright.
    float cutoff = clamp(threshold - band * 0.05, 0.3, 0.9995);
    if (hSeed <= cutoff) return vec3(0.0);

    // Jitter inside the cell. Keep the point away from the cell border so
    // its falloff can never be clipped by a neighbour (square artifacts).
    vec2 jitter = vec2(
      hash(vec3(cell, faceId * 7.0 + seed + 11.3)),
      hash(vec3(cell, faceId * 7.0 + seed + 41.7))
    );
    vec2 starPos = 0.5 + (jitter - 0.5) * 0.52;
    float d = length(fp - starPos);

    // Screen-space footprint of one grid cell, in cell units. Derived from
    // the continuous grid coordinate (fract() jumps at cell borders and
    // would report garbage). This is what keeps stars at least one pixel
    // wide: sub-pixel Gaussians alias into a grey speckle haze instead of
    // resolving into points.
    float cellsPerPixel = max(fwidth(gp).x + fwidth(gp).y, 1e-6);

    float bright = clamp((hSeed - cutoff) / max(0.0001, 1.0 - cutoff), 0.0, 1.0);
    bright = pow(bright, brightnessPow) * brightnessScale;

    // Gaussian with a soft shoulder: a sharp point core plus a faint halo,
    // so the star stays crisp at high resolution without aliasing away.
    float radius = max(0.04 + bright * 0.04, cellsPerPixel * 0.6);
    radius = min(radius, 0.18);
    float core = exp(-(d * d) / (2.0 * radius * radius));
    float halo = exp(-(d * d) / (2.0 * radius * radius * 6.0)) * 0.08;
    float shape = max(core, halo);

    float temp = hash(vec3(cell, faceId * 13.0 + seed + 73.7));
    temp = pow(temp, 1.35); // weight toward cooler stars
    vec3 col = realisticStarColor(temp);

    // Very calm variability on the brightest stars only (<=9% at <1Hz).
    // Brightness-only: the star's position never moves with time.
    float twinkle = 1.0;
    #if !defined(RAY_QUALITY_LOW) && !defined(RAY_QUALITY_OFF)
    if (bright > 0.55) {
      float phase = hash(vec3(cell, faceId * 19.0 + seed + 41.3)) * 6.2831;
      float speed = 0.35 + hash(vec3(cell, faceId * 23.0 + seed + 89.7)) * 0.6;
      twinkle = 0.955 + 0.045 * sin(u_time * speed + phase);
    }
    #endif

    return col * bright * shape * twinkle;
  }

  vec3 starfield(vec3 dir) {
    // --- Photographic plate: dust lanes + unresolved star haze ---
    vec3 plate = sampleSkyPlate(dir);
    // Contrast curve: keep the deep field black while lifting the band.
    vec3 band = plate * u_milkywayGain;
    band = band * (0.75 + 0.85 * sqrt(max(band, vec3(0.0))));

    // Luminance drives procedural star clustering and the band boost.
    float bandLuma = dot(band, vec3(0.2126, 0.7152, 0.0722));
    float bandNorm = clamp(bandLuma * 6.0, 0.0, 1.0);

    // --- Procedural stars: sharp points, independent of the plate's blur ---
    // Density scales the hash cutoff linearly: density 0.0 -> cutoff 1.0
    // (no stars at all, a pure black sky) up to density 2.0 -> cutoff ~0.86
    // (a rich photographic field). The previous 1.0 - density offset was
    // inverted: density 0 still added 0.07 to every cutoff, so a "dark" sky
    // stayed densely starred. The reference frame is a near-black sky with
    // only the disk annulus lit, so the starfield must truly vanish at 0.
    float density = clamp(u_star_density, 0.0, 2.0);
    float cutoffFloor = 1.0 - density * 0.07;

    vec3 stars = vec3(0.0);
    // Bright, rare, colored stars
    stars += starLayer(dir, 110.0, clamp(0.997 - density * 0.07, cutoffFloor, 0.9995), 4.5, 1.3, 0.0, bandNorm);
    // Mid field
    stars += starLayer(dir, 300.0, clamp(0.985 - density * 0.07, cutoffFloor, 0.9995), 5.0, 0.8, 217.3, bandNorm);
    // Dense faint field (this is what reads as "photographic density")
    stars += starLayer(dir, 640.0, clamp(0.962 - density * 0.07, cutoffFloor, 0.9995), 7.0, 0.40, 433.7, bandNorm);
    // Very faint dust of stars
    stars += starLayer(dir, 1100.0, clamp(0.94 - density * 0.07, cutoffFloor, 0.9995), 11.0, 0.20, 617.3, bandNorm);

    // Render the photographic plate at its natural brightness so the space
    // matches public/textures/Background.jpg instead of being crushed to black.
    return band + stars;
  }
`;

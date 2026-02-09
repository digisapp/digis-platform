export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_smooth;
  uniform float u_brightness;
  uniform float u_glow;

  varying vec2 v_texCoord;

  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 center = texture2D(u_image, v_texCoord);

    // Bilateral filter for skin smoothing (9-tap)
    vec4 smoothed = vec4(0.0);
    float totalWeight = 0.0;

    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 offset = vec2(float(x), float(y)) * texelSize * 2.0;
        vec4 sample = texture2D(u_image, v_texCoord + offset);

        // Spatial weight
        float spatialDist = length(vec2(float(x), float(y)));
        float spatialWeight = exp(-spatialDist * spatialDist / 2.0);

        // Intensity weight (preserves edges)
        float intensityDiff = length(sample.rgb - center.rgb);
        float intensityWeight = exp(-intensityDiff * intensityDiff * 50.0);

        float weight = spatialWeight * intensityWeight;
        smoothed += sample * weight;
        totalWeight += weight;
      }
    }
    smoothed /= totalWeight;

    // Mix original with smoothed based on smooth amount
    vec4 result = mix(center, smoothed, u_smooth);

    // Brightness (additive)
    result.rgb += u_brightness;

    // Glow: screen blend of blurred version with original
    vec4 blurred = vec4(0.0);
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 offset = vec2(float(x), float(y)) * texelSize * 3.0;
        blurred += texture2D(u_image, v_texCoord + offset);
      }
    }
    blurred /= 25.0;
    // Screen blend: 1 - (1 - a) * (1 - b)
    vec3 glowColor = vec3(1.0) - (vec3(1.0) - result.rgb) * (vec3(1.0) - blurred.rgb);
    result.rgb = mix(result.rgb, glowColor, u_glow);

    result.rgb = clamp(result.rgb, 0.0, 1.0);
    result.a = center.a;
    gl_FragColor = result;
  }
`;

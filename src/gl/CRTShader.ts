export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    u_curvature: { value: 0.2 },
    u_grain: { value: 0.08 },
    u_downsample: { value: 0.0 },
    u_saturation: { value: 1.0 },
    u_brightness: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float u_curvature;
    uniform float u_grain;
    uniform float u_downsample;
    uniform float u_saturation;
    uniform float u_brightness;
    varying vec2 vUv;


    vec2 distortCoordinates(vec2 coords, float curvature) {
        float frameSize = 0.03; 
        vec2 paddedCoords = coords * (1.0 + frameSize * 2.0) - frameSize;
        vec2 cc = (paddedCoords - 0.5);
        float dist = dot(cc, cc) * curvature;
        return (paddedCoords + cc * (1.0 + dist) * dist);
    }

    void main() {
        vec2 curvatureCoords = distortCoordinates(vUv, u_curvature);
        
        float rgbShift = 0.0015;
        vec2 displacement = vec2(rgbShift, 0.0);
        
        vec3 txt_color = texture2D(tDiffuse, curvatureCoords).rgb;
        vec3 rightColor = texture2D(tDiffuse, curvatureCoords + displacement).rgb;
        vec3 leftColor = texture2D(tDiffuse, curvatureCoords - displacement).rgb;
        
        vec3 finalColor;
        finalColor.r = leftColor.r * 0.10 + rightColor.r * 0.30 + txt_color.r * 0.60;
        finalColor.g = leftColor.g * 0.20 + rightColor.g * 0.20 + txt_color.g * 0.60;
        finalColor.b = leftColor.b * 0.30 + rightColor.b * 0.10 + txt_color.b * 0.60;

        float scanline = sin(curvatureCoords.y * 512.0 * 3.14159) * 0.15;
        finalColor -= scanline;

        float glare = smoothstep(0.8, 0.0, distance(curvatureCoords, vec2(0.5, 0.8)));
        finalColor += glare * vec3(0.1, 0.08, 0.05);

        float staticNoise = fract(sin(dot(curvatureCoords * uTime, vec2(12.9898,78.233))) * 43758.5453);
        finalColor += (staticNoise - 0.5) * u_grain;
        
        vec2 cc = curvatureCoords - 0.5;
        float r = dot(cc, cc);
        float vignette = 1.0 - (r * 1.5);
        vignette = smoothstep(0.0, 0.9, vignette);
        finalColor *= vignette;

        // Radial bloom leak from the physical screen edges
        float distX = max(0.0, max(-curvatureCoords.x, curvatureCoords.x - 1.0));
        float distY = max(0.0, max(-curvatureCoords.y, curvatureCoords.y - 1.0));
        float dist = length(vec2(distX, distY));

        float screenMask = 1.0 - smoothstep(0.0, 0.025, dist);
        vec3 bezelColor = vec3(0.0, 0.0, 0.0);
        finalColor = mix(bezelColor, finalColor, screenMask);

        // OPTICAL CONTROLS
        float crunch = u_downsample * 0.15; 
        vec3 crushedColor = smoothstep(crunch, 1.0 - crunch, finalColor);
        finalColor = mix(finalColor, crushedColor, u_downsample);

        const vec3 W = vec3(0.2125, 0.7154, 0.0721);
        vec3 intensity = vec3(dot(finalColor, W));
        finalColor = mix(intensity, finalColor, u_saturation);

        finalColor *= u_brightness;

        gl_FragColor = vec4(finalColor, 1.0);
    }
  `
}

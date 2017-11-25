precision mediump float;

uniform vec3 u_lightDir_us;
uniform vec3 u_ambient;
uniform vec3 u_diffuse;
uniform vec3 u_ambientIntensity;

varying vec3 v_normal_cs;
varying vec3 v_pos_cs;


void main () {
  float theta = max(dot(-u_lightDir_us, normalize(v_pos_cs - v_normal_cs)), 0.0);
  gl_FragColor = vec4(u_ambientIntensity * u_ambient + u_diffuse * theta, 1.0);
}

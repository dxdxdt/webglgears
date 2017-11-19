precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_ambient;
uniform vec3 u_diffuse;

varying vec3 v_pos;
varying vec3 v_normal;


void main () {
  float theta = max(dot(normalize(u_lightPos - v_pos), normalize(v_normal)), 0.0);
  gl_FragColor = vec4(u_ambient + u_diffuse * theta, 1.0);
}

uniform mat4 u_tf;
uniform mat4 u_model;
uniform mat3 u_nm;
uniform vec3 u_lightPos;
uniform vec3 u_ambient;
uniform vec3 u_diffuse;

attribute vec3 a_pos;
attribute vec3 a_normal;

varying vec3 v_fragColor;


void main () {
  vec4 pos = vec4(a_pos, 1.0);
  vec3 pos_ws = (u_model * pos).xyz;
  float theta = max(dot(normalize(u_lightPos - pos_ws), normalize(a_normal * u_nm)), 0.0);

  v_fragColor = u_ambient + u_diffuse * theta;
  gl_Position = u_tf * pos;
}

uniform mat4 u_tf;
uniform mat4 u_view;
uniform mat4 u_mv;

attribute vec3 a_pos;
attribute vec3 a_normal;

varying vec3 v_normal_cs;
varying vec3 v_pos_cs;


void main () {
  vec4 pos_ms = vec4(a_pos, 1.0);

  v_pos_cs = (u_mv * pos_ms).xyz;
  v_normal_cs = (u_mv * vec4(a_normal, 1.0)).xyz;
  gl_Position = u_tf * pos_ms;
}

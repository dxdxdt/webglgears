uniform mat4 u_tf;
uniform mat4 u_view;
uniform mat4 u_mv;

uniform vec3 u_lightDir_us;
uniform vec3 u_ambient;
uniform vec3 u_diffuse;
uniform vec3 u_ambientIntensity;

attribute vec3 a_pos;
attribute vec3 a_normal;

varying vec3 v_fragColor;


void main () {
  vec4 pos_ms = vec4(a_pos, 1.0);
  vec3 pos_cs = (u_mv * pos_ms).xyz;
  vec3 normal_cs = (u_mv * vec4(a_normal, 1.0)).xyz;

  float theta = max(dot(-u_lightDir_us, normalize((pos_cs - normal_cs).xyz)), 0.0);

  v_fragColor = u_ambientIntensity * u_ambient + u_diffuse * theta;
  gl_Position = u_tf * pos_ms;
}

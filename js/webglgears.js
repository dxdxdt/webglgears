/* global vec2, vec3, vec4, mat2, mat2d, mat3, mat4, quat */
var WebGLGears = (function () {
  "use strict";
  var uploadBuffers, freeBuffers, loadShader, setupProgram, freeProgram;
  var defaultPrintCallback;
  var progSrc = {
    flat: {},
    smooth: {}
  };

  loadShader = function (gl, src, type, opt) {
    let shader, shaderInfo;
    let cb;

    opt = opt || {
      verbose: true
    };

    if (opt.cb) {
      cb = opt.cb;
    }
    else if (opt.cb === null) {
      cb = function () {};
    }
    else {
      cb = function (head, msg, e) {
        let f = e ? console.error : console.info;

        if (msg) {
          console.group(head);
          f(msg);
          console.groupEnd();
        }
        else {
          f(head);
        }
      };
    }

    shader = gl.createShader(type);
    if (!shader) {
      let e = new Error(gl, "Could not create shader.");

      Object.freeze(e);
      cb("Could not create shader.", null, e);
      throw e;
    }

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const msg = [
        "Error compiling ",
        (function () {
          switch (type) {
          case gl.FRAGMENT_SHADER: return 'fragment';
          case gl.VERTEX_SHADER: return 'vertex';
          }
          return '?';
        })(),
        " shader",
        (function () {
          return opt.name ? (" '" + opt.name + "'.") : '.';
        })()
      ];
      let head = msg.join('');
      let e = new Error(gl, head);

      shaderInfo = gl.getShaderInfoLog(shader);
      e.infoLog = shaderInfo;
      Object.freeze(e);

      cb(head, shaderInfo, e);
      gl.deleteShader(shader);

      throw e;
    }
    if (opt.verbose) {
      shaderInfo = gl.getShaderInfoLog(shader);

      if (shaderInfo) {
        let head = "Log occurred compiling shader";

        if (opt.name) {
          head += " '" + opt.name + "': ";
        }
        else {
          head += ": ";
        }
        cb(head, shaderInfo);
      }
    }

    return shader;
  };
  setupProgram = function (gl, b) {
    let ret = {
      name: b.name,
      prog: gl.createProgram(),
      attrMap: b.attrMap,
      unif: {}
    };
    let i;
    let progInfoLog;
    let cb;

    if (b.errCB) {
      cb = b.errCB;
    }
    else {
      if (b.errCB === null) {
        cb = function () {};
      }
      else {
        cb = function (head, msg, e) {
          let f = e ? console.error : console.info;

          console.group(head);
          f(msg);
          console.groupEnd();
        };
      }
    }

    ret.vert = loadShader(gl, b.vert, gl.VERTEX_SHADER, {
      name: b.name,
      verbose: b.verbose});
    ret.frag = loadShader(gl, b.frag, gl.FRAGMENT_SHADER, {
      name: b.name,
      verbose: b.verbose});
    gl.attachShader(ret.prog, ret.vert);
    gl.attachShader(ret.prog, ret.frag);

    for (i in b.attrMap) {
      gl.bindAttribLocation(ret.prog, b.attrMap[i], i);
    }

    gl.linkProgram(ret.prog);

    if (gl.getProgramParameter(ret.prog, gl.LINK_STATUS)) {
      if (b.verbose) {
        progInfoLog = gl.getProgramInfoLog(ret.prog);
        if (progInfoLog) {
          let head = "Log occurred linking shader";

          if (b.name) {
            head += " '" + b.name + "':";
          }
          else {
            head += " :";
          }
          cb(head, progInfoLog);
        }
      }
    }
    else {
      let e = new Error(gl, "Failed to link program");
      let head = "Error linking shader";

      if (b.name) {
        head += " '" + b.name + "':";
      }
      else {
        head += " :";
      }
      progInfoLog = gl.getProgramInfoLog(ret.prog);
      e.infoLog = progInfoLog;
      Object.freeze(e);

      cb(head, progInfoLog, e);
      gl.deleteProgram(ret.prog);
      gl.deleteShader(ret.vert);
      gl.deleteShader(ret.frag);
      throw e;
    }

    for (i of b.unif) {
      ret.unif[i] = gl.getUniformLocation(ret.prog, i);
    }

    return ret;
  };
  freeProgram = function (gl, prog) {
    gl.deleteProgram(prog.prog);
    gl.deleteShader(prog.vert);
    gl.deleteShader(prog.frag);
  };
  uploadBuffers = function (gl, arr, buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, arr.vertex, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.normal);
    gl.bufferData(gl.ARRAY_BUFFER, arr.normal, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr.index, gl.STATIC_DRAW);
  };
  freeBuffers = function (gl, buf) {
    var __f = function (o) {
      if (o) {
        gl.deleteBuffer(o);
      }
    };

    __f(buf.vertex);
    __f(buf.normal);
    __f(buf.index);
  };
  defaultPrintCallback = function (head, body, e) {
    let f = e ? console.error : console.info;

    if (body) {
      console.group(head);
      f(body);
      if (e) {
        f(e.stack);
      }
      console.groupEnd();
    }
    else {
      f(head);
      if (e) {
        f(e.stack);
      }
    }
  };

  progSrc.flat.vert = "uniform mat4 u_tf;\r\nuniform mat4 u_model;\r\nuniform mat3 u_nm;\r\nuniform vec3 u_lightPos;\r\nuniform vec3 u_ambient;\r\nuniform vec3 u_diffuse;\r\n\r\nattribute vec3 a_pos;\r\nattribute vec3 a_normal;\r\n\r\nvarying vec3 v_fragColor;\r\n\r\n\r\nvoid main () {\r\n  vec4 pos = vec4(a_pos, 1.0);\r\n  vec3 pos_ws = (u_model * pos).xyz;\r\n  float theta = max(dot(normalize(u_lightPos - pos_ws), normalize(a_normal * u_nm)), 0.0);\r\n\r\n  v_fragColor = u_ambient + u_diffuse * theta;\r\n  gl_Position = u_tf * pos;\r\n}\r\n";
  progSrc.flat.frag = "precision mediump float;\r\n\r\nvarying vec3 v_fragColor;\r\n\r\n\r\nvoid main () {\r\n  gl_FragColor = vec4(v_fragColor, 1.0);\r\n}\r\n";
  progSrc.smooth.vert = "uniform mat4 u_tf;\r\nuniform mat4 u_model;\r\nuniform mat3 u_nm;\r\n\r\nattribute vec3 a_pos;\r\nattribute vec3 a_normal;\r\n\r\nvarying vec3 v_pos;\r\nvarying vec3 v_normal;\r\n\r\n\r\nvoid main () {\r\n  vec4 pos = vec4(a_pos, 1.0);\r\n\r\n  v_pos = (u_model * pos).xyz;\r\n  v_normal = u_nm * a_normal;\r\n  gl_Position = u_tf * pos;\r\n}\r\n";
  progSrc.smooth.frag = "precision mediump float;\r\n\r\nuniform vec3 u_lightPos;\r\nuniform vec3 u_ambient;\r\nuniform vec3 u_diffuse;\r\n\r\nvarying vec3 v_pos;\r\nvarying vec3 v_normal;\r\n\r\n\r\nvoid main () {\r\n  float theta = max(dot(normalize(u_lightPos - v_pos), normalize(v_normal)), 0.0);\r\n  gl_FragColor = vec4(u_ambient + u_diffuse * theta, 1.0);\r\n}\r\n";

  return class WebGLGears {
    constructor () {
      var __view_rotx = 20.0;
      var __view_roty = 30.0;
      var __view_rotz = 0.0;
      var __angle = 0.0;
      var __animate = true;
      var __frames = 0, __tRot0 = null, __tRate0 = null;

      var __init, __gear, __draw_gears, __draw_frame, __draw;
      var __updateViewMatrix;
      var __gl = null, __w = null;
      var __arrGears = [];
      var __prog = {};
      var __printCallback = defaultPrintCallback;
      var __verbose = false;

      var __mat = {
        view: mat4.create(),
        projection: mat4.create()
      };
      var __tmp = {
        modelInv: mat4.create(),
        view: {
          rotate: {
            x: mat4.create(),
            y: mat4.create(),
            z: mat4.create()
          },
          translate: mat4.create()
        }
      };
      var __viewport = {
        w: 0,
        h: 0
      };
      var __eyePos = vec3.fromValues(0.0, 0.0, -40.0);

      mat4.identity(__mat.projection);

      __init = function () {
        let m;
        let pos = [ 5.0, 5.0, 10.0 ];

        // Reset state members
        __frames = 0;
        __tRate0 = __tRot0 = null;
        __prog = {};
        __arrGears = [];
        __angle = 0.0;

        __prog.flat = setupProgram(__gl, {
          vert: progSrc.flat.vert,
          frag: progSrc.flat.frag,
          attrMap: {
            0: 'a_pos',
            1: 'a_normal'
          },
          unif: [
            'u_tf',
            'u_model',
            'u_nm',
            'u_lightPos',
            'u_ambient',
            'u_diffuse'
          ]
        });
        __prog.smooth = setupProgram(__gl, {
          vert: progSrc.smooth.vert,
          frag: progSrc.smooth.frag,
          attrMap: {
            0: 'a_pos',
            1: 'a_normal'
          },
          unif: [
            'u_tf',
            'u_model',
            'u_nm',
            'u_lightPos',
            'u_ambient',
            'u_diffuse'
          ]
        });

        __gl.useProgram(__prog.flat.prog);
        __gl.uniform3fv(__prog.flat.unif['u_lightPos'], pos);
        __gl.useProgram(__prog.smooth.prog);
        __gl.uniform3fv(__prog.smooth.unif['u_lightPos'], pos);

        __gl.useProgram(null);

        m = __gear(1.0, 4.0, 1.0, 20, 0.7);
        m.material = [ 0.8, 0.1, 0.0 ];
        __arrGears.push(m);

        m = __gear(0.5, 2.0, 2.0, 10, 0.7);
        m.material = [ 0.0, 0.8, 0.2 ];
        __arrGears.push(m);

        m = __gear(1.3, 2.0, 0.5, 10, 0.7);
        m.material = [ 0.2, 0.2, 1.0 ];
        __arrGears.push(m);

        for (m of __arrGears) {
          m.vec = {
            translate: vec3.create()
          };
          m.mat = {
            rotate:  mat4.create(),
            translate:  mat4.create(),
            model: mat4.create(),
            nm: mat3.create(),
            tf: mat4.create()
          };
        }
      };
      // Upload a gear wheel model.
      // A wheel consists of two render parts: the flat and smooth shading part
      // which need be rendered using two different programs.
      // Input:  inner_radius - radius of hole at center
      //         outer_radius - radius at center of teeth
      //         width - width of gear
      //         teeth - number of teeth
      //         tooth_depth - depth of tooth
      // Return: (An object containing following properties)
      //         flat.arr.vertex - Float32Array of vertices
      //         flat.arr.normal - Float32Array of normal vectors (model space)
      //         flat.arr.index - Uint16Array of indices
      //         flat.buf.vertex - ARRAY_BUFFER
      //         flat.buf.normal - ARRAY_BUFFER
      //         flat.buf.index - ELEMENT_ARRAY_BUFFER
      //         smooth.arr.vertex
      //         smooth.arr.normal
      //         smooth.arr.index
      //         smooth.buf.vertex
      //         smooth.buf.normal
      //         smooth.buf.index
      __gear = function (inner_radius, outer_radius, width, teeth, tooth_depth) {
        let arrSize = {
          flat: {
            v: ((teeth * 4 + 2) * 3 * 2) + (teeth * 4 * 3 * 2) + ((teeth * 8 + 2) * 3),
            i: (teeth * 6 * 2) + ((teeth * 2 + 1) * 6) + ((teeth * 4 + 1) * 6)
          },
          smooth: {
            v: (teeth + 1) * 2 * 3,
            i: teeth * 6
          }
        };
        let ret = {
          flat: {
            arr: {
              vertex: new Float32Array(arrSize.flat.v),
              normal: new Float32Array(arrSize.flat.v),
              index: new Uint16Array(arrSize.flat.i)
            },
            buf: {
              vertex: __gl.createBuffer(),
              normal: __gl.createBuffer(),
              index: __gl.createBuffer()
            }
          },
          smooth: {
            arr: {
              vertex: new Float32Array(arrSize.smooth.v),
              normal: new Float32Array(arrSize.smooth.v),
              index: new Uint16Array(arrSize.smooth.i)
            },
            buf: {
              vertex: __gl.createBuffer(),
              normal: __gl.createBuffer(),
              index: __gl.createBuffer()
            }
          }
        };
        let i;
        let r0, r1, r2;
        let angle, da;
        let u, v, len;
        let ptr = {}, idx, nb_vertex;
        let indexQuadStrip;

        indexQuadStrip = function () {
          for (i = 2; i < nb_vertex; i += 2) {
            idx += 2;
            ret.flat.arr.index[ptr.i + 0] = idx + 0 - 2;
            ret.flat.arr.index[ptr.i + 1] = idx + 1 - 2;
            ret.flat.arr.index[ptr.i + 2] = idx + 2 - 2;
            ret.flat.arr.index[ptr.i + 3] = idx + 2 - 2;
            ret.flat.arr.index[ptr.i + 4] = idx + 1 - 2;
            ret.flat.arr.index[ptr.i + 5] = idx + 3 - 2;

            ptr.i += 6;
          }
        };

        r0 = inner_radius;
        r1 = outer_radius - tooth_depth / 2.0;
        r2 = outer_radius + tooth_depth / 2.0;

        idx = ptr.i = ptr.v = 0;

        // draw front face
        da = 2.0 * Math.PI / teeth / 4.0;
        nb_vertex = 0;
        for (i = 0; i <= teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.flat.arr.vertex[ptr.v + 0] = r0 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 1] = r0 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 2] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 3] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 4] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 5] = width * 0.5;

          ret.flat.arr.normal[ptr.v + 0] = 0.0;
          ret.flat.arr.normal[ptr.v + 1] = 0.0;
          ret.flat.arr.normal[ptr.v + 2] = 1.0;
          ret.flat.arr.normal[ptr.v + 3] = 0.0;
          ret.flat.arr.normal[ptr.v + 4] = 0.0;
          ret.flat.arr.normal[ptr.v + 5] = 1.0;

          ptr.v += 6;
          nb_vertex += 2;

          if (i < teeth) {
            ret.flat.arr.vertex[ptr.v + 0] = r0 * Math.cos(angle);
            ret.flat.arr.vertex[ptr.v + 1] = r0 * Math.sin(angle)
            ret.flat.arr.vertex[ptr.v + 2] = width * 0.5;
            ret.flat.arr.vertex[ptr.v + 3] = r1 * Math.cos(angle + 3 + da);
            ret.flat.arr.vertex[ptr.v + 4] = r1 * Math.sin(angle + 3 + da);
            ret.flat.arr.vertex[ptr.v + 5] = width * 0.5;

            ret.flat.arr.normal[ptr.v + 0] = 0.0;
            ret.flat.arr.normal[ptr.v + 1] = 0.0;
            ret.flat.arr.normal[ptr.v + 2] = 1.0;
            ret.flat.arr.normal[ptr.v + 3] = 0.0;
            ret.flat.arr.normal[ptr.v + 4] = 0.0;
            ret.flat.arr.normal[ptr.v + 5] = 1.0;

            ptr.v += 6;
            nb_vertex += 2;
          }
        }
        indexQuadStrip();

        // draw front sides of teeth
        da = 2.0 * Math.PI / teeth / 4.0;
        for (i = 0; i < teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 2] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 3] = r2 * Math.cos(angle + da);
          ret.flat.arr.vertex[ptr.v + 4] = r2 * Math.sin(angle + da);
          ret.flat.arr.vertex[ptr.v + 5] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 6] = r2 * Math.cos(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 7] = r2 * Math.sin(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 8] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 9] = r1 * Math.cos(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 10] = r1 * Math.sin(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 11] = width * 0.5;

          ret.flat.arr.normal[ptr.v + 0] = 0.0;
          ret.flat.arr.normal[ptr.v + 1] = 0.0;
          ret.flat.arr.normal[ptr.v + 2] = 1.0;
          ret.flat.arr.normal[ptr.v + 3] = 0.0;
          ret.flat.arr.normal[ptr.v + 4] = 0.0;
          ret.flat.arr.normal[ptr.v + 5] = 1.0;
          ret.flat.arr.normal[ptr.v + 6] = 0.0;
          ret.flat.arr.normal[ptr.v + 7] = 0.0;
          ret.flat.arr.normal[ptr.v + 8] = 1.0;
          ret.flat.arr.normal[ptr.v + 9] = 0.0;
          ret.flat.arr.normal[ptr.v + 10] = 0.0;
          ret.flat.arr.normal[ptr.v + 11] = 1.0;

          ptr.v += 12;

          ret.flat.arr.index[ptr.i + 0] = idx + 0;
          ret.flat.arr.index[ptr.i + 1] = idx + 1;
          ret.flat.arr.index[ptr.i + 2] = idx + 2;
          ret.flat.arr.index[ptr.i + 3] = idx + 2;
          ret.flat.arr.index[ptr.i + 4] = idx + 1;
          ret.flat.arr.index[ptr.i + 5] = idx + 3;

          ptr.i += 6;
          idx += 4;
        }

        // draw back face
        nb_vertex = 0;
        for (i = 0; i <= teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 2] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 3] = r0 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 4] = r0 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 5] = -width * 0.5;

          ret.flat.arr.normal[ptr.v + 0] = 0.0;
          ret.flat.arr.normal[ptr.v + 1] = 0.0;
          ret.flat.arr.normal[ptr.v + 2] = -1.0;
          ret.flat.arr.normal[ptr.v + 3] = 0.0;
          ret.flat.arr.normal[ptr.v + 4] = 0.0;
          ret.flat.arr.normal[ptr.v + 5] = -1.0;

          ptr.v += 6;
          nb_vertex += 2;

          if (i < teeth) {
            ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(angle + 3 + da);
            ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(angle + 3 + da);
            ret.flat.arr.vertex[ptr.v + 2] = -width * 0.5;
            ret.flat.arr.vertex[ptr.v + 3] = r0 * Math.cos(angle);
            ret.flat.arr.vertex[ptr.v + 4] = r0 * Math.sin(angle)
            ret.flat.arr.vertex[ptr.v + 5] = -width * 0.5;

            ret.flat.arr.normal[ptr.v + 0] = 0.0;
            ret.flat.arr.normal[ptr.v + 1] = 0.0;
            ret.flat.arr.normal[ptr.v + 2] = -1.0;
            ret.flat.arr.normal[ptr.v + 3] = 0.0;
            ret.flat.arr.normal[ptr.v + 4] = 0.0;
            ret.flat.arr.normal[ptr.v + 5] = -1.0;

            ptr.v += 6;
            nb_vertex += 2;
          }
        }
        indexQuadStrip();

        // draw back sides of teeth
        da = 2.0 * Math.PI / teeth / 4.0;
        for (i = 0; i < teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 2] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 3] = r2 * Math.cos(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 4] = r2 * Math.sin(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 5] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 6] = r2 * Math.cos(angle + da);
          ret.flat.arr.vertex[ptr.v + 7] = r2 * Math.sin(angle + da);
          ret.flat.arr.vertex[ptr.v + 8] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 9] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 10] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 11] = -width * 0.5;

          ret.flat.arr.normal[ptr.v + 0] = 0.0;
          ret.flat.arr.normal[ptr.v + 1] = 0.0;
          ret.flat.arr.normal[ptr.v + 2] = -1.0;
          ret.flat.arr.normal[ptr.v + 3] = 0.0;
          ret.flat.arr.normal[ptr.v + 4] = 0.0;
          ret.flat.arr.normal[ptr.v + 5] = -1.0;
          ret.flat.arr.normal[ptr.v + 6] = 0.0;
          ret.flat.arr.normal[ptr.v + 7] = 0.0;
          ret.flat.arr.normal[ptr.v + 8] = -1.0;
          ret.flat.arr.normal[ptr.v + 9] = 0.0;
          ret.flat.arr.normal[ptr.v + 10] = 0.0;
          ret.flat.arr.normal[ptr.v + 11] = -1.0;

          ptr.v += 12;

          ret.flat.arr.index[ptr.i + 0] = idx + 0;
          ret.flat.arr.index[ptr.i + 1] = idx + 1;
          ret.flat.arr.index[ptr.i + 2] = idx + 2;
          ret.flat.arr.index[ptr.i + 3] = idx + 2;
          ret.flat.arr.index[ptr.i + 4] = idx + 1;
          ret.flat.arr.index[ptr.i + 5] = idx + 3;

          ptr.i += 6;
          idx += 4;
        }

        // draw outward faces of teeth
        nb_vertex = 0;
        for (i = 0; i < teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 2] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 3] = r1 * Math.cos(angle);
          ret.flat.arr.vertex[ptr.v + 4] = r1 * Math.sin(angle);
          ret.flat.arr.vertex[ptr.v + 5] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 6] = r2 * Math.cos(angle + da);
          ret.flat.arr.vertex[ptr.v + 7] = r2 * Math.sin(angle + da);
          ret.flat.arr.vertex[ptr.v + 8] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 9] = r2 * Math.cos(angle + da);
          ret.flat.arr.vertex[ptr.v + 10] = r2 * Math.sin(angle + da);
          ret.flat.arr.vertex[ptr.v + 11] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 12] = r2 * Math.cos(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 13] = r2 * Math.sin(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 14] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 15] = r2 * Math.cos(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 16] = r2 * Math.sin(angle + 2 * da);
          ret.flat.arr.vertex[ptr.v + 17] = -width * 0.5;
          ret.flat.arr.vertex[ptr.v + 18] = r1 * Math.cos(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 19] = r1 * Math.sin(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 20] = width * 0.5;
          ret.flat.arr.vertex[ptr.v + 21] = r1 * Math.cos(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 22] = r1 * Math.sin(angle + 3 * da);
          ret.flat.arr.vertex[ptr.v + 23] = -width * 0.5;

          u = r2 * Math.cos(angle + da) - r1 * Math.cos(angle);
          v = r2 * Math.sin(angle + da) - r1 * Math.sin(angle);
          len = Math.sqrt(u * u + v * v);
          u /= len;
          v /= len;
          ret.flat.arr.normal[ptr.v + 0] = v;
          ret.flat.arr.normal[ptr.v + 1] = -u;
          ret.flat.arr.normal[ptr.v + 2] = 0.0;
          ret.flat.arr.normal[ptr.v + 3] = v;
          ret.flat.arr.normal[ptr.v + 4] = -u;
          ret.flat.arr.normal[ptr.v + 5] = 0.0;
          ret.flat.arr.normal[ptr.v + 6] = Math.cos(angle);
          ret.flat.arr.normal[ptr.v + 7] = Math.sin(angle);
          ret.flat.arr.normal[ptr.v + 8] = 0.0;
          ret.flat.arr.normal[ptr.v + 9] = Math.cos(angle);
          ret.flat.arr.normal[ptr.v + 10] = Math.sin(angle);
          ret.flat.arr.normal[ptr.v + 11] = 0.0;
          u = r1 * Math.cos(angle + 3 * da) - r2 * Math.cos(angle + 2 * da);
          v = r1 * Math.sin(angle + 3 * da) - r2 * Math.sin(angle + 2 * da);
          ret.flat.arr.normal[ptr.v + 12] = v;
          ret.flat.arr.normal[ptr.v + 13] = -u;
          ret.flat.arr.normal[ptr.v + 14] = 0.0;
          ret.flat.arr.normal[ptr.v + 15] = v;
          ret.flat.arr.normal[ptr.v + 16] = -u;
          ret.flat.arr.normal[ptr.v + 17] = 0.0;
          ret.flat.arr.normal[ptr.v + 18] = Math.cos(angle);
          ret.flat.arr.normal[ptr.v + 19] = Math.sin(angle);
          ret.flat.arr.normal[ptr.v + 20] = 0.0;
          ret.flat.arr.normal[ptr.v + 21] = Math.cos(angle);
          ret.flat.arr.normal[ptr.v + 22] = Math.sin(angle);
          ret.flat.arr.normal[ptr.v + 23] = 0.0;

          ptr.v += 24;
          nb_vertex += 8;
        }
        ret.flat.arr.vertex[ptr.v + 0] = r1 * Math.cos(0);
        ret.flat.arr.vertex[ptr.v + 1] = r1 * Math.sin(0);
        ret.flat.arr.vertex[ptr.v + 2] = width * 0.5;
        ret.flat.arr.vertex[ptr.v + 3] = r1 * Math.cos(0);
        ret.flat.arr.vertex[ptr.v + 4] = r1 * Math.sin(0);
        ret.flat.arr.vertex[ptr.v + 5] = -width * 0.5;

        ret.flat.arr.normal[ptr.v + 0] = Math.cos(angle);
        ret.flat.arr.normal[ptr.v + 1] = Math.sin(angle);
        ret.flat.arr.normal[ptr.v + 2] = 0.0;
        ret.flat.arr.normal[ptr.v + 3] = Math.cos(angle);
        ret.flat.arr.normal[ptr.v + 4] = Math.sin(angle);
        ret.flat.arr.normal[ptr.v + 5] = 0.0;

        nb_vertex += 2;
        indexQuadStrip();

        // draw inside radius cylinder
        ptr.v = ptr.i = idx = 0;
        nb_vertex = 0;
        for (i = 0; i <= teeth; i += 1) {
          angle = i * 2.0 * Math.PI / teeth;

          ret.smooth.arr.vertex[ptr.v + 0] = r0 * Math.cos(angle);
          ret.smooth.arr.vertex[ptr.v + 1] = r0 * Math.sin(angle);
          ret.smooth.arr.vertex[ptr.v + 2] = -width * 0.5;
          ret.smooth.arr.vertex[ptr.v + 3] = r0 * Math.cos(angle);
          ret.smooth.arr.vertex[ptr.v + 4] = r0 * Math.sin(angle);
          ret.smooth.arr.vertex[ptr.v + 4] = width * 0.5;

          ret.smooth.arr.normal[ptr.v + 0] = -Math.cos(angle);
          ret.smooth.arr.normal[ptr.v + 1] = -Math.sin(angle);
          ret.smooth.arr.normal[ptr.v + 2] = 0.0;
          ret.smooth.arr.normal[ptr.v + 3] = -Math.cos(angle);
          ret.smooth.arr.normal[ptr.v + 4] = -Math.sin(angle);
          ret.smooth.arr.normal[ptr.v + 5] = 0.0;

          ptr.v += 6;
          nb_vertex += 2;
        }
        indexQuadStrip();

        // Upload buffers
        uploadBuffers(__gl, ret.flat.arr, ret.flat.buf);
        uploadBuffers(__gl, ret.smooth.arr, ret.smooth.buf);

        return ret;
      };
      __draw_gears = function () {
        let g;

        // Host side calculation
        vec3.copy(__arrGears[0].vec.translate, [-3.0, -2.0, 0.0]);
        mat4.fromRotation(__arrGears[0].mat.rotate, __angle * Math.PI / 180, [0.0, 0.0, 1.0]);

        vec3.copy(__arrGears[1].vec.translate, [3.1, -2.0, 0.0]);
        mat4.fromRotation(__arrGears[1].mat.rotate, (-2.0 * __angle - 9.0) * Math.PI / 180, [0.0, 0.0, 1.0]);

        vec3.copy(__arrGears[2].vec.translate, [-3.1, 4.2, 0.0]);
        mat4.fromRotation(__arrGears[2].mat.rotate, (-2.0 * __angle - 25.0) * Math.PI / 180, [0.0, 0.0, 1.0]);

        for (g of __arrGears) {
          mat4.fromTranslation(g.mat.translate, g.vec.translate);
          mat4.mul(g.mat.model, g.mat.translate, g.mat.rotate);
          mat4.invert(__tmp.modelInv, g.mat.model);
          g.mat.nm[0] = __tmp.modelInv[0];
          g.mat.nm[1] = __tmp.modelInv[4];
          g.mat.nm[2] = __tmp.modelInv[8];
          g.mat.nm[3] = __tmp.modelInv[1];
          g.mat.nm[4] = __tmp.modelInv[5];
          g.mat.nm[5] = __tmp.modelInv[9];
          g.mat.nm[6] = __tmp.modelInv[2];
          g.mat.nm[7] = __tmp.modelInv[6];
          g.mat.nm[8] = __tmp.modelInv[10];
          mat4.mul(g.mat.tf, __mat.projection, __mat.view);
          mat4.mul(g.mat.tf, g.mat.tf, g.mat.model);
        }

        // GL calls
        // __gl.enable(__gl.CULL_FACE); FIXME
        __gl.enable(__gl.DEPTH_TEST);
        __gl.enableVertexAttribArray(0);
        __gl.enableVertexAttribArray(1);

        __gl.useProgram(__prog.flat.prog);
        for (g of __arrGears) {
          __gl.uniformMatrix4fv(__prog.flat.unif['u_tf'], __gl.FALSE, g.mat.tf);
          __gl.uniformMatrix4fv(__prog.flat.unif['u_model'], __gl.FALSE, g.mat.model);
          __gl.uniformMatrix3fv(__prog.flat.unif['u_nm'], __gl.FALSE, g.mat.nm);
          __gl.uniform3fv(__prog.flat.unif['u_ambient'], g.material);
          __gl.uniform3fv(__prog.flat.unif['u_diffuse'], g.material);

          __gl.bindBuffer(__gl.ARRAY_BUFFER, g.flat.buf.vertex);
          __gl.vertexAttribPointer(0, 3, __gl.FLOAT, __gl.FALSE, 0, 0);
          __gl.bindBuffer(__gl.ARRAY_BUFFER, g.flat.buf.normal);
          __gl.vertexAttribPointer(1, 3, __gl.FLOAT, __gl.FALSE, 0, 0);
          __gl.bindBuffer(__gl.ELEMENT_ARRAY_BUFFER, g.flat.buf.index);

          __gl.drawElements(__gl.TRIANGLES, g.flat.arr.index.length, __gl.UNSIGNED_SHORT, 0);
        }

        __gl.useProgram(__prog.smooth.prog);
        for (g of __arrGears) {
          __gl.uniformMatrix4fv(__prog.smooth.unif['u_tf'], __gl.FALSE, g.mat.tf);
          __gl.uniformMatrix4fv(__prog.smooth.unif['u_model'], __gl.FALSE, g.mat.model);
          __gl.uniformMatrix3fv(__prog.smooth.unif['u_nm'], __gl.FALSE, g.mat.nm);
          __gl.uniform3fv(__prog.smooth.unif['u_ambient'], g.material);
          __gl.uniform3fv(__prog.smooth.unif['u_diffuse'], g.material);

          __gl.bindBuffer(__gl.ARRAY_BUFFER, g.smooth.buf.vertex);
          __gl.vertexAttribPointer(0, 3, __gl.FLOAT, __gl.FALSE, 0, 0);
          __gl.bindBuffer(__gl.ARRAY_BUFFER, g.smooth.buf.normal);
          __gl.vertexAttribPointer(1, 3, __gl.FLOAT, __gl.FALSE, 0, 0);
          __gl.bindBuffer(__gl.ELEMENT_ARRAY_BUFFER, g.smooth.buf.index);

          __gl.drawElements(__gl.TRIANGLES, g.smooth.arr.index.length, __gl.UNSIGNED_SHORT, 0);
        }

        __gl.useProgram(null);

        __gl.disable(__gl.CULL_FACE);
        __gl.disable(__gl.DEPTH_TEST);
        __gl.disableVertexAttribArray(1);
      };
      __draw_frame = function () {
        let dt;
        const t = performance.now() / 1000.0;

        if (__tRot0 === null) {
          __tRot0 = t;
        }
        dt = t - __tRot0;
        __tRot0 = t;

        if (__animate) {
          // advance rotation for next frame
          __angle += 70.0 * dt; // 70 degrees per second
          if (__angle > 3600.0) {
            __angle += 3600.0;
          }
        }

        __gl.viewport(0, 0, __viewport.w, __viewport.h);
        __gl.clear(__gl.COLOR_BUFFER_BIT | __gl.DEPTH_BUFFER_BIT);
        __draw_gears();
        __gl.flush();

        __frames += 1;

        if (__tRate0 === null) {
          __tRate0 = t;
        }
        if (t - __tRate0 >= 5.0) {
          if (__printCallback && __verbose) {
            const seconds = t - __tRate0;
            const fps = __frames / seconds;
            let msg = [
              "WebGL Gears: ",
              __frames,
              " frames in ",
              seconds.toFixed(1),
              " seconds = ",
              fps.toFixed(3),
              " FPS"
            ];

            __printCallback(msg.join(''));
          }
          __tRate0 = t;
          __frames = 0;
        }
      };
      __draw = function () {
        if (__gl && __w) {
          __draw_frame();
          __w.requestAnimationFrame(__draw);
        }
      };
      __updateViewMatrix = function () {
        mat4.fromRotation(__tmp.view.rotate.x, __view_rotx * Math.PI / 180, [1.0, 0.0, 0.0]);
        mat4.fromRotation(__tmp.view.rotate.y, __view_roty * Math.PI / 180, [0.0, 1.0, 0.0]);
        mat4.fromRotation(__tmp.view.rotate.z, __view_rotz * Math.PI / 180, [0.0, 0.0, 1.0]);
        mat4.fromTranslation(__tmp.view.translate, __eyePos);
        mat4.mul(__mat.view, __tmp.view.translate, __tmp.view.rotate.x);
        mat4.mul(__mat.view, __mat.view, __tmp.view.rotate.y);
        mat4.mul(__mat.view, __mat.view, __tmp.view.rotate.z);
      };

      Object.defineProperties(this, {
        attach: {
          value: function (w, gl) {
            this.detach();
            __gl = gl;
            __w = w;

            __init();
            __w.requestAnimationFrame(__draw);

            return this;
          },
          configurable: true
        },
        detach: {
          value: function () {
            let g;

            while (__arrGears.length > 0) {
              g = __arrGears.pop();
              freeBuffers(__gl, g.flat.buf);
              freeBuffers(__gl, g.smooth.buf);
            }

            if (__prog.flat) {
              freeProgram(__gl, __prog.flat);
            }
            if (__prog.smooth) {
              freeProgram(__gl, __prog.smooth);
            }

            __gl = null;
            __w = null;

            return this;
          },
          configurable: true
        },
        reshape: {
          value: function (width, height) {
            const h = height / width;

            __viewport.w = width;
            __viewport.h = height;
            mat4.frustum(__mat.projection, -1.0, 1.0, -h, h, 5.0, 60.0);

            return this;
          },
          configurable: true
        },
        view_rotx: {
          get: function () {
            return __view_rotx;
          },
          set: function (rotx) {
            __view_rotx = rotx;
            __updateViewMatrix();
            return this;
          },
          configurable: true
        },
        view_roty: {
          get: function () {
            return __view_roty;
          },
          set: function (roty) {
            __view_roty = roty;
            __updateViewMatrix();
            return this;
          },
          configurable: true
        },
        view_rotz: {
          get: function () {
            return __view_rotz;
          },
          set: function (rotz) {
            __view_rotz = rotz;
            __updateViewMatrix();
            return this;
          },
          configurable: true
        },
        animate: {
          get: function () {
            return __animate;
          },
          set: function (a) {
            __animate = a;
            return this;
          },
          configurable: true
        },
        verbose: {
          get: function () {
            return __verbose;
          },
          set: function (v) {
            __verbose = v;
            return this;
          },
          configurable: true
        },
        printCallback: {
          get: function () {
            return __printCallback;
          },
          set: function (cb) {
            if (cb === null) {
              __printCallback = defaultPrintCallback;
            }
            else {
              __printCallback = cb;
            }

            return this;
          },
          configurable: true
        },
        info: {
          value: function () {
            if (__gl) {
              let arr = [
                "GL_RENDERER   = " + __gl.getParameter(__gl.RENDERER),
                "GL_VERSION    = " + __gl.getParameter(__gl.VERSION),
                "GL_VENDOR     = " + __gl.getParameter(__gl.VENDOR),
                "GL_EXTENSIONS = " + __gl.getSupportedExtensions().join(' ')
              ];

              __printCallback("WebGL Gears Info", arr.join('\n'));
            }
            return this;
          },
          configurable: true
        }
      });

      __updateViewMatrix();
    }

    static optimalContextParams() {
      return {
        type: 'webgl',
        attr: {
          alpha: false,
          depth: true,
          stencil: false,
          antialias: false
        }
      };
    }
  };
})();

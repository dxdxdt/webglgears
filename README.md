# WebGL Gears
'glxgears' demo rewritten as an web app

[Youtube video](https://www.youtube.com/watch?v=FhlCLcw2qb0)

![Screenshot of webglgears running on Firefox](/img/webglgears_firefox.png)

## What?
This is a WebGL 1.0 port of the infamous demo 'glxgears'.
Although glxgears now remains as a relic, some people still use it today
on some occasion to show off their windowing system or driver
implementation. As you might have guessed, glxgears should not be used as
a benchmark tool. I started this as a small artistic project in the hopes
that someone would put this on their blogs as a decorative widget.

OpenGL has gone through a lot for the last few decades. The way that
OpenGL is used to implement glxgears got quite old. Therefore, it is
important to stress that this project must not be regarded as a WebGL
reference. There were many things to get around to implement glxgears with
WebGL. The result should look the same whilst it is implemented
not in the same way. I'm aware that there's a GLES2 port of Gears from which
I could have easily port, but the gears do not look the same as good old
glxgears in that version.

## How?
Visit [github.io page](https://ashegoulding.github.io/webglgears/index.html) that I uploaded on my github.io. Or you could clone the repo
and open `index.html` in your browser. Follow instructions there.

## Use as a Widget
You can iframe the app, `webglgears.html`:
```
<iframe width='300' height='300' src="https://ashegoulding.github.io/webglgears/webglgears.html">
</iframe>
```

Or you could upload the entire project to your server.
Files required to use `WebGLGears` class are:
* `js/gl-matrix-min.js`: Can be linked externally. [Visit their](http://glmatrix.net/) site for more info.
* `js/webglgears-min.js`

var regl = require('regl')()
var camera = require('regl-camera')(regl, {
  center: [0,45,0],
  eye: [0,1,0],
  distance: 175
})
var mat4 = require('gl-mat4')
var resl = require('resl')
var parseobj = require('parse-wavefront-obj')
var scom = require('simplicial-complex')
var column = require('column-mesh')
var sphere = require('sphere-mesh')
var normals = require('angle-normals')

var iframe = document.createElement('iframe')
iframe.src = 'midi.html'
iframe.style.display = 'none'
document.body.appendChild(iframe)

resl({
  manifest: {
    obj: {
      src: 'data/shrek.obj',
      parser: parseobj
    },
    midi: {
      type: 'binary',
      src: 'data/allstar.mid'
    }
  },
  onDone: function (data) {
    var drawShrek =  shrek(data)
    var drawCol = col()
    var cols = []
    for (var i = 0; i < 20; i++) {
      var theta = (i/20*2-1) * Math.PI
      cols.push({ location: [-100*Math.sin(theta),0,100*Math.cos(theta)] })
    }
    regl.frame(function () {
      regl.clear({ color: [0,0,0,1] })
      camera(function () {
        drawShrek()
        drawCol(cols)
      })
    })
  }
})

function col () {
  var mesh = column()
  var model = []
  return regl({
    frag: `
      precision mediump float;
      varying vec3 vnormal;
      void main () {
        float l = vnormal.x + vnormal.y;
        vec3 v = vec3(l,l*0.3,l);
        gl_FragColor = vec4(v*0.5+0.2,1);
      }
    `,
    vert: `
      precision mediump float;
      uniform mat4 projection, view, model;
      attribute vec3 position, normal;
      varying vec3 vnormal;
      void main () {
        vnormal = normal;
        gl_Position = projection * view * model * vec4(position,1.0);
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: normals(mesh.cells, mesh.positions)
    },
    uniforms: {
      model: function (context, props) {
        mat4.identity(model)
        mat4.scale(model, model, [5,10,5])
        mat4.translate(model, model, props.location)
        return model
      }
    },
    elements: mesh.cells
  })
}

function shrek (data) {
  var edges = scom.unique(scom.skeleton(data.obj.cells, 1))
  var model = []
  return regl({
    frag: `
      precision mediump float;
      varying vec3 vnormal;
      varying vec2 uv;
      void main () {
        float l = abs(vnormal.x + vnormal.y) - 0.3;
        vec3 n = vec3(l*0.2,l*1.3,l*0.2) * 0.7 + 0.3;
        gl_FragColor = vec4(n, 1.0);
      }
    `,
    vert: `
      precision mediump float;
      uniform mat4 projection, view, model;
      uniform float time;
      attribute vec3 position, normal;
      varying vec3 vnormal;
      varying vec2 uv;
      void main () {
        uv = vec2(position.x, 1.0 - position.y);
        vnormal = normal;
        vec3 d = vec3(
          sin(time*3.0+position.x)*1.0,
          sin(time*4.0+position.y)*1.0,
          sin(time*5.0+position.z)*1.0
        );
        gl_Position = projection * view * model * vec4(position+d, 1.0);
      }
    `,
    attributes: {
      position: data.obj.positions,
      normal: data.obj.vertexNormals,
      uv: data.obj.vertexUVs
    },
    elements: edges,
    uniforms: {
      model: function (context, props) {
        mat4.identity(model)
        mat4.rotateY(model, model, Math.PI/2 + Math.sin(context.time))
        return model
      },
      time: function (context) { return context.time }
    }
  })
}

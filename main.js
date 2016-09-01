var regl = require('regl')()
var camera = require('regl-camera')(regl, {
  center: [0,40,0],
  eye: [0,1,0],
  distance: 175
})
var mat4 = require('gl-mat4')
var resl = require('resl')
var parseobj = require('parse-wavefront-obj')
var parsedds = require('parse-dds')

var model = []

resl({
  manifest: {
    obj: {
      src: 'data/shrek.obj',
      parser: parseobj
    },
    /*
    body: {
      src: 'data/shrek_body.dds',
      parser: parsedds
    },
    headLegs: {
      src: 'data/shrek_head_legs.dds',
      parser: parsedds
    },
    */
  },
  onDone: function (data) {
    var drawShrek =  shrek(data)
    regl.frame(function () {
      regl.clear({ color: [0,0,0,1] })
      camera(function () {
        drawShrek()
      })
    })
  }
})

function shrek (data) {
  return regl({
    frag: `
      precision mediump float;
      varying vec3 vnormal;
      void main () {
        gl_FragColor = vec4(abs(vnormal)*0.4 + vec3(0.2,0.2,0.2), 1.0);
      }
    `,
    vert: `
      precision mediump float;
      uniform mat4 projection, view, model;
      attribute vec3 position, normal;
      varying vec3 vnormal;
      void main () {
        vnormal = normal;
        gl_Position = projection * view * model * vec4(position, 1.0);
      }
    `,
    attributes: {
      position: data.obj.positions,
      normal: data.obj.vertexNormals,
      uv: data.obj.vertexUVs
    },
    elements: data.obj.cells,
    uniforms: {
      model: function (context, props) {
        mat4.identity(model)
        mat4.rotateY(model, model, Math.PI/2)
        return model
      }
    }
  })
}

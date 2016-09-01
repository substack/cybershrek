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
    var draw = {
      shrek: shrek(data),
      col: col(),
      floor: floor()
    }
    var cols = []
    for (var i = 0; i < 20; i++) {
      var theta = (i/20*2-1) * Math.PI
      cols.push({ location: [-100*Math.sin(theta),10.5,100*Math.cos(theta)] })
    }
    regl.frame(function () {
      regl.clear({ color: [0,0,0,1] })
      camera(function () {
        draw.shrek()
        draw.col(cols)
        draw.floor()
      })
    })
  }
})

function floor () {
  var positions = []
  for (var x = -10; x <= 10; x++) {
    for (var y = -10; y <= 10; y++) {
      positions.push([x,0,y])
    }
  }
  var cells = []
  for (var x = -10; x < 10; x++) {
    for (var y = -10; y < 10; y++) {
      var p0 = (x+0+10)*20 + (y+0+10)
      var p1 = (x+1+10)*20 + (y+0+10)
      var p2 = (x+1+10)*20 + (y+1+10)
      var p3 = (x+0+10)*20 + (y+1+10)
      cells.push([ p0, p1 ])
      cells.push([ p1, p2 ])
      cells.push([ p2, p3 ])
      cells.push([ p3, p0 ])
    }
  }

  var model = []
  return regl({
    frag: `
      precision mediump float;
      varying vec2 pos;
      void main () {
        float r = abs(sin(pos.x/5.0 + pos.y/5.0));
        float g = abs(sin(pos.y/3.0 + sin(pos.y/2.0)));
        float b = abs(sin(pos.x/10.0 + pos.y/10.0));
        gl_FragColor = vec4(r,g,b,1);
      }
    `,
    vert: `
      precision mediump float;
      uniform mat4 projection, view, model;
      attribute vec3 position;
      varying vec2 pos;
      void main () {
        pos = position.xz;
        gl_Position = projection * view * model * vec4(position,1.0);
      }
    `,
    attributes: {
      position: positions
    },
    uniforms: {
      model: function (context, props) {
        mat4.identity(model)
        mat4.scale(model, model, [50,50,50])
        return model
      }
    },
    elements: cells
  })
}

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
        mat4.translate(model, model, [0,10,0])
        mat4.rotateY(model, model, Math.PI/2 + Math.sin(context.time))
        return model
      },
      time: function (context) { return context.time }
    }
  })
}

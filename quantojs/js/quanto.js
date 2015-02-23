
function Transformer() {
  var that = this;
  this.originX = 500;
  this.originY = 300;
  this.scale = 30;

  this.toScreenX = function(c) {
    return that.originX + (c * that.scale);
  }

  this.toScreenY = function(c) {
    return that.originY - (c * that.scale);
  }

  this.toScreen = function(coord) {
    return [that.toScreenX(coord[0]), that.toScreenY(coord[1])];
  }

  this.scaleToScreen = function(l) { return l * that.scale; }

  return this;
}

function Theory(name, thyJson) {
  var that = this;
  this.json = thyJson;
  this.name = name;
  
  this.typ = function(n) {
    if (n.data == null) return that.json.default_vertex_type;
    else return n.data.type;
  }

  this.shape = function(n) {
    return that.json.vertex_types[that.typ(n)].style.shape;
  }

  this.fill = function(n) {
    var col = that.json.vertex_types[that.typ(n)].style.fill_color;
    return d3.rgb(255*col[0], 255*col[1], 255*col[2]);
  }

  this.stroke = function(n) {
    var col = that.json.vertex_types[that.typ(n)].style.stroke_color;
    return d3.rgb(255*col[0], 255*col[1], 255*col[2]);
  }

  this.val = function(n) {
    if (n.data == null) {
      return that.json.vertex_types[that.json.default_vertex_type]
                 .default_data.value;
    } else {
      if (n.data.value == null) {
        return that.json.vertex_types[n.data.type]
                   .default_data.value;
      } else {
        return n.data.value;
      }
    }
  }

  return this;
}

function Graph(graphJson) {
  var that = this;
  this.json = graphJson;
  this.nodeVertices = d3.map(graphJson.node_vertices);
  this.wireVertices = d3.map(graphJson.wire_vertices);
  this.undirEdges = d3.map(graphJson.undir_edges);
  this.bangBoxes = d3.map(graphJson.bang_boxes);
  this.vertices = d3.set(
    this.nodeVertices.keys().concat(this.wireVertices.keys()));

  this.src = function(e) {
    var n = that.wireVertices.get(e.src);
    if (n != null) return n
    else return that.nodeVertices.get(e.src);
  };

  this.tgt = function(e) {
    var n = that.wireVertices.get(e.tgt);
    if (n != null) return n
    else return that.nodeVertices.get(e.tgt);
  };

  this.bboxFor = function(vs, wpad, npad) {
    var minX = null, maxX = null, minY = null, maxY = null;
    vs.forEach(function (vname) {
      var wire, v;
      if (that.nodeVertices.has(vname)) {
        wire = false;
        v = that.nodeVertices.get(vname);
      } else {
        wire = true;
        v = that.wireVertices.get(vname);
      }

      var pad = (wire) ? wpad : npad;
      var c = v.annotation.coord;
      minX = (minX == null) ? c[0] - pad : Math.min(c[0] - pad, minX);
      maxX = (maxX == null) ? c[0] + pad : Math.max(c[0] + pad, maxX);
      minY = (minY == null) ? c[1] - pad : Math.min(c[1] - pad, minY);
      maxY = (maxY == null) ? c[1] + pad : Math.max(c[1] + pad, maxY);
    });

    if (minX == null) {
      minX = -npad;
      maxX = npad;
      minY = -npad;
      maxY = npad;
    }

    return {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      midX: (minX + maxX)/2,
      midY: (minY + maxY)/2,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  this.bbox = function() {
    var wpad = 0.5;
    var npad = 2;
    return that.bboxFor(that.vertices, wpad, npad);
  }

  return this;
}

function Derivation(derJson) {
  var that = this;
  this.json = derJson;
  this.steps = [];
  var step = (derJson.heads.length > 0) ? derJson.heads[0] : null;
  while (step != null) {
    this.steps.push({
      graph: new Graph(derJson.steps[step].graph),
      ruleName: derJson.steps[step].rule_name
    });
    step = derJson.steps[step].parent;
  }
  this.steps.reverse();
  this.root = new Graph(derJson.root);
}


function drawGraph(trans, thy, graph, svg, inserted, removed) {

  graph.bangBoxes.values().forEach(function(bb) {
    var wpad = 0.5;
    var npad = 0.5;
    var box = graph.bboxFor(bb.contents, wpad, npad);

    svg.append("rect")
       .attr("x", trans.toScreenX(box.minX))
       .attr("y", trans.toScreenY(box.maxY))
       .attr("width", trans.scaleToScreen(box.width))
       .attr("height", trans.scaleToScreen(box.height))
       .style("fill", "#eef")
       .style("stroke", "#99a");
  });

  graph.undirEdges.values().forEach(function(e) {
    var sc = trans.toScreen(graph.src(e).annotation.coord);
    var tc = trans.toScreen(graph.tgt(e).annotation.coord);
    svg.append("line")
       .attr("class", "edge")
       .attr("x1", sc[0])
       .attr("y1", sc[1])
       .attr("x2", tc[0])
       .attr("y2", tc[1]);
  });

  graph.nodeVertices.forEach(function(k,v) {
    var nd;
    var c = trans.toScreen(v.annotation.coord);

    switch (thy.shape(v)) {
      case "circle":
        nd = svg.append("circle");
        break;
      case "rectangle":
        nd = svg.append("rect");
        break;
    }

    if (inserted != null && inserted.has(k))
      nd.style("stroke", "#00d")
        .style("stroke-width", "3px");
    else if (removed != null && removed.has(k))
      nd.style("stroke", "#d00")
        .style("stroke-width", "3px");
    else
      nd.style("stroke", thy.stroke(v));

    nd.style("fill", thy.fill(v));

    var w = 10;
    var h = 10;
    if (thy.val(v) != "" && thy.val(v) != null) {
      var label = texConstants(thy.val(v));
      var lText = svg.append("text");

      lText.attr("x", c[0])
           .attr("y", c[1] + 4)
           .attr("class", "labelText")
           .text(label);

      var bbox = lText.node().getBBox();
      w = Math.max(w,bbox.width);
      h = Math.max(h,bbox.height);
    }

    var pad = 4;

    switch (thy.shape(v)) {
      case "circle":
        nd.attr("cx", c[0])
          .attr("cy", c[1])
          .attr("r", Math.sqrt(w*w + h*h)/2 + pad);
        break;
      case "rectangle":
        nd.attr("x", c[0] - w/2 - pad)
          .attr("y", c[1] - h/2 - pad)
          .attr("width", w + 2*pad)
          .attr("height", h + 2*pad);
        break;
    }

  });
}

function addGraph(thy, graph, div, inserted, removed) {
  var trans = new Transformer();
  var bbox = graph.bbox();
  var width; 
  var height;

  // fit width and height to svg element, if not specified
  if (div.node().style.width == "") {
    width = trans.scaleToScreen(bbox.width);
    div.style("width", (width+4) + "px");
  } else {
    width = div.node().offsetWidth;
  }

  if (div.node().style.height == "") {
    height = trans.scaleToScreen(bbox.height);
    div.style("height", (height+8) + "px");
  } else {
    height = div.node().offsetHeight;
  }

  trans.originX = width/2 - trans.scaleToScreen(bbox.midX);
  trans.originY = height/2 + trans.scaleToScreen(bbox.midY);

  div.selectAll("svg").remove();
  var svg = div.append("svg")
               .attr("width", width)
               .attr("height", height);
  drawGraph(trans, thy, graph, svg, inserted, removed);
}

// var width = 1000,
//     height = 600;

// var color = d3.scale.category20();

// var force = d3.layout.force()
//     .charge(-120)
//     .linkDistance(30)
//     .size([width, height]);


d3.json("red_green.qtheory", function(errorThy, thyJson) {
  var thyName = d3.select("meta[name=quanto-project]").attr("content");
  var thy = new Theory(thyName, thyJson);
  

  d3.selectAll(".qgraph")
    .each(function() {
      var div = d3.select(this);
      var jsonFile = thy.name + "/" + div.attr("data-src") + ".qgraph";
      d3.json(jsonFile, function(errorGr, graphJson) {
        addGraph(thy, new Graph(graphJson), div);
      });
    });

  d3.selectAll(".qrule")
    .each(function() {
      var div = d3.select(this);
      var jsonFile = thy.name + "/" + div.attr("data-src") + ".qrule";
      d3.json(jsonFile, function(errorGr, ruleJson) {
        var div1 = div.append("div").attr("class", "qgraph block");
        div.append("div")
           .attr("class", "block")
           .html("&nbsp;&nbsp;&nbsp;=&nbsp;&nbsp;&nbsp;");
        var div2 = div.append("div").attr("class", "qgraph block");

        if (div.attr("data-graph-width") != null) {
          div1.style("width", div.attr("data-graph-width"));
          div2.style("width", div.attr("data-graph-width"));
        }

        if (div.attr("data-graph-height") != null) {
          div1.style("height", div.attr("data-graph-height"));
          div2.style("height", div.attr("data-graph-height"));
        }

        addGraph(thy, new Graph(ruleJson.lhs), div1);
        addGraph(thy, new Graph(ruleJson.rhs), div2);
      });
    });

  d3.selectAll(".qderive")
    .each(function() {
      var div = d3.select(this);
      var jsonFile = thy.name + "/" + div.attr("data-src") + ".qderive";
      d3.json(jsonFile, function(errorGr, derJson) {
        var der = new Derivation(derJson);
        var bb = der.root.bbox();
        var maxWidth = bb.width;
        var maxHeight = bb.height;
        der.steps.forEach(function (step) {
          bb = step.graph.bbox();
          maxWidth = Math.max(maxWidth, bb.width);
          maxHeight = Math.max(maxHeight, bb.height);
        });
        console.log(maxHeight);
        var trans = new Transformer();


        var div1 = div.append("div").attr("class", "qgraph block");
        var current = 0;
        div.append("div")
           .attr("class", "block")
           .html("&nbsp;&nbsp;&nbsp;=&nbsp;&nbsp;&nbsp;");
        var div2 = div.append("div").attr("class", "qgraph block");

        var info = div.append("div").attr("class", "info");
        info.append("span")
            .style("font-weight", "bold")
            .html("step: ");
        var stepDisplay = info.append("span")
                              .style("font-style", "italic")
                              .text("1");
        info.append("span")
            .style("font-weight", "bold")
            .html(", rule: ");
        var ruleDisplay = info.append("span")
                              .style("font-style", "italic")
                              .text("none");

        var controls = div.append("div").attr("class", "controls");

        if (div.attr("data-graph-width") != null) {
          div1.style("width", div.attr("data-graph-width"));
          div2.style("width", div.attr("data-graph-width"));
        } else {
          div1.style("width", trans.scaleToScreen(maxWidth) + "px");
          div2.style("width", trans.scaleToScreen(maxWidth) + "px");
        }

        if (div.attr("data-graph-height") != null) {
          div1.style("height", div.attr("data-graph-height"));
          div2.style("height", div.attr("data-graph-height"));
        } else {
          div1.style("height", trans.scaleToScreen(maxHeight) + "px");
          div2.style("height", trans.scaleToScreen(maxHeight) + "px");
        }

        //div1.style("height", "600px");
        
        function setStep(index) {
          return function() {
            d3.select(controls.selectAll("a")[0][current+1])
              .style("color", null);
            current = index;
            d3.select(controls.selectAll("a")[0][current+1])
              .style("color", "red");

            stepDisplay.text(current + 1);
            ruleDisplay.text(der.steps[index].ruleName);
            var lhs = (index == 0) ? der.root : der.steps[index-1].graph;
            var rhs = der.steps[index].graph;

            console.log("lhs", lhs.vertices);
            console.log("rhs", rhs.vertices);
            var removed = d3.set(lhs.vertices.values());
            rhs.vertices.forEach(function(v) { removed.remove(v); });
            var inserted = d3.set(rhs.vertices.values());
            lhs.vertices.forEach(function(v) { inserted.remove(v); });

            addGraph(thy, lhs, div1, null, removed);
            addGraph(thy, rhs, div2, inserted, null);
          }
        }


        controls.append("a")
                .attr("href", "#")
                .on("click", function() {
                  if (current > 0) {
                    setStep(current-1)();
                  }
                 })
                .append("span")
                .attr("class", "glyphicon glyphicon-backward")
                .attr("onclick", "return false;");
        controls.append("span").html("&nbsp; ");

        for (var i = 0; i < der.steps.length; i++) {
          controls.append("a")
                  .attr("href", "#")
                  .style("color", null)
                  .on("click", setStep(i))
                  .append("span")
                  .attr("class", "glyphicon glyphicon-stop")
                  .attr("onclick", "return false;");
          controls.append("span").html("&nbsp; ");
        }

        controls.append("a")
                .attr("href", "#")
                .on("click", function() {
                  if (current < der.steps.length-1) {
                    setStep(current+1)();
                  }
                 })
                .append("span")
                .attr("class", "glyphicon glyphicon-forward")
                .attr("onclick", "return false;");

        setStep(current)();

      });
    });
});
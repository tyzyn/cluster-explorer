<script>
// import * as d3 from 'd3';
// import * as d3lasso from 'd3-lasso';
import {data, labels, showUnclustered, showLabels, searchValue, textField, hoverText, lassoMode, colourBy, tag, searchMap, searchMode, lassoSelected} from './stores.js';
import {onMount} from 'svelte';

var w = window.innerWidth * 0.75;
var h = window.innerHeight * 0.95;
var r = 5;

var x;
var y;
var newX;
var newY;
var svg;

var circles;
var lasso;

var zoom = d3.zoom()
             .scaleExtent([0.8, 25])
             .extent([[0, 0], [w, h]])
             .on("zoom", transformCoords);

function pointClick(d) {
 if (Object.keys(d).includes("website")) {
   window.open(d.website, '_blank').focus();
 } else if (Object.keys(d).includes("domain")) {
   window.open("http://" + d.domain, '_blank').focus();
 }
};

function pointMouseover(d) {
  hoverText.set(d.description);

  var stopColumns = ["label", "description", "x", "y", "index", "vector"];
  var tooltipColumns = Object.keys(d);

  var html = "";
  for (const col of tooltipColumns) {
    if (!stopColumns.includes(col) && `${d[col]}`.length < 100) {
      html += "<b>" + col + ": </b>" + d[col] + "<br>"
    }
  };

  if (d.label !== "") {
    html += "<b>label: <span style='color:" + tagScale(d.label) + ";'>" + d.label + "</span></b>"
  }

  var tooltip = d3.select("div .scatter")
                  .append("div")
                  .attr("class", "tooltip")
                  .style("visibility", "visible");

  tooltip.html(html)
       .style("left", (d3.event.pageX + 15) + "px")
       .style("top", (d3.event.pageY - 28) + "px")
       .transition()
       .duration(100)
       .style("opacity", .9);

  d3.select(this).style("r", r * 2);
};

function pointMouseout(d) {
  hoverText.set('');

  d3.selectAll(".tooltip").remove();
  d3.select(this).style("r", r);
};

function transformCoords() {
  // recover the new scale
  newX = d3.event.transform.rescaleX(x);
  newY = d3.event.transform.rescaleY(y);

  // update circle position
  svg.selectAll("circle")
     .data($data)
     .attr('cx', function(d) {return newX(d.x)})
     .attr('cy', function(d) {return newY(d.y)});

 svg.selectAll(".cluster-label")
    .data($labels)
    .attr('x', function(d) {return newX(d.x)})
    .attr('y', function(d) {return newY(d.y)});
};

var seenData = false;
var seenLabels = false;

function init() {
  if (seenData && seenLabels) {
    return;
  };

  if ($data.length === 0) {
    return;
  } else {
    seenData = true;
  };

  if ($labels.length !== 0) {
    seenLabels = true;
  };

  var xs = $data.map(row => parseFloat(row['x']));
  var ys = $data.map(row => parseFloat(row['y']));

  var xmin = Math.min(...xs);
  var xmax = Math.max(...xs);
  var ymin = Math.min(...ys);
  var ymax = Math.max(...ys);

  x = d3.scaleLinear()
    .domain([xmin, xmax])
    .range([0, w]);

  y = d3.scaleLinear()
    .domain([ymin, ymax])
    .range([h, 0]);

  circles = svg.selectAll("circle")
      .data($data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r", r)
      .style("fill", "#c8c8c8")
      .on("mouseover", pointMouseover)
      .on("mouseout", pointMouseout)
      .on("click", pointClick);

  svg.selectAll("text")
      .data($labels)
      .enter()
      .append("text")
      .attr("x", d => x(d.x))
      .attr("y", d => y(d.y))
      .attr("class", "cluster-label")
      .style("font-size", "14px")
      .style("text-anchor", "middle")
      .text(d => d.label);

  if (( seenData && !seenLabels ) || ( !seenData && seenLabels )) {
    d3.select("div .scatter")
      .append("div")
      .attr("class", "tooltip")
      .style("visibility", "hidden");
  };

  console.log(circles);
  lasso = d3.lasso()
            .closePathSelect(true)
            .closePathDistance(100)
            .items(circles)
            .targetArea(svg)
            .on("start",lasso_start)
            .on("draw",lasso_draw)
            .on("end",lasso_end);

  handleShowUnclustered();
  handleShowLabels();
  handleLassoMode();
  updateLegend();
};

var tagScale = d3.scaleOrdinal(d3.schemeCategory10);
function updateLegend() {
  var labels = Array.from(new Set($data.filter(d => d['label'] != '').map(d => d['label'])));
  var labelsCounts = labels.map(l => [l, $data.map(d => d['label']).filter(x => x == l).length]);
  labelsCounts = labelsCounts.sort((a,b) => b[1] - a[1]).slice(0, 5);

  var ordinal = d3.scaleOrdinal()
  .domain(labelsCounts.map(l => l[0] + ' ' + l[1]))
  .range(labelsCounts.map(l => tagScale(l[0])));

  svg.selectAll("g.legendOrdinal").remove();

  svg.append("g")
    .attr("class", "legendOrdinal")
    .attr("transform", "translate(20,20)");

  var legendOrdinal = d3.legendColor()
    .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
    .shapePadding(10)
    .scale(ordinal);

  svg.select(".legendOrdinal")
    .call(legendOrdinal);
};

function lasso_start() {};

function lasso_draw() {};

function lasso_end() {
  var selected;
  if ($lassoSelected) {
    selected = lasso.selectedItems(d3.selectAll("circle")).filter(".selected").data();
  } else {
    selected = lasso.selectedItems(d3.selectAll("circle")).data();
  }

  if (!$showUnclustered) {
    selected = selected.filter(c => c.cluster !== "-1");
  }
  var selectedIndices = selected.map(c => c.index);
  console.log(selectedIndices);

  var dataCopy = JSON.parse(JSON.stringify($data));
  dataCopy.forEach(function(d, i) {
    if (selectedIndices.includes(d.index)) {
      dataCopy[i]["label"] = ($lassoMode === "erase") ? "" : $tag;
    };
  });

  data.set(dataCopy);

  if (selectedIndices.length > 0) {
    colourBy.set(['label', 'categorical']);
    handleColourBy();
  };

  colourBy.set(['label', 'categorical']);
  updateLegend();
};

function handleShowUnclustered() {
  svg.selectAll("circle")
    .data($data)
    .style("visibility", d => {
      if ($showUnclustered) {
        return "visible";
      } else {
        return (d["cluster"] == -1) ? "hidden" : "visible";
      };
    });
};

function handleShowLabels() {
  svg.selectAll(".cluster-label")
     .style("visibility", ($showLabels) ? "visible" : "hidden");
};

function handleSearch() {
  svg.selectAll("circle")
    .data($data)
    .style("fill-opacity", 0.3)
    .style("stroke", "none");

  var regexSearch = function(d, i) {
    var field;
    var value;
    var negate;
    var regex;
    var match;

    var searchMapCopy = $searchMap.filter(s => s['value'] !== '');
    if (searchMapCopy.length === 0) {
      return false;
    }

    try {
      for (let i = 0; i < searchMapCopy.length; i++) {
        field = searchMapCopy[i]['field'];
        value = searchMapCopy[i]['value'];
        negate = searchMapCopy[i]['negate'];
        regex = new RegExp('\\b' + value + '\\b', 'i');
        match = d[field].toLowerCase().search(regex) != -1;

        if (negate) {
          match = !match;
        };

        if ($searchMode === 'conjunction') {
          if (!match) {
            return false;
          };
        } else {
          if (match) {
            return true;
          };
        };

      };
    } catch (error) {
      return false;
    };
    return $searchMode === 'conjunction';
  };

  // try {
  //   var regex = new RegExp('\\b' + $searchValue + '\\b', 'i');
  // } catch (error) {
  //   console.error(error);
  //   return
  // };

  svg.selectAll("circle")
    .data($data)
    .classed('selected', false);

  svg.selectAll("circle")
    .data($data)
    .filter(regexSearch)
    .style("fill-opacity", 0.7)
    .style("stroke", "black")
    .classed('selected', true);
};

function handleLassoMode() {
  if ($tag === 'Add Label') {
    lassoMode.set('zoom');
    return
  };

  if ($lassoMode === 'zoom') {
    svg.call(zoom);
    svg.on(".dragstart", null)
       .on(".drag", null)
       .on(".dragend", null);

  } else {
    svg.on('.zoom', null);
    svg.call(lasso);
  };
};

function handleColourBy() {
  var colourColumn;
  var colourScaleType;
  if ($colourBy.length === 0) {
    colourScaleType = 'none';
  } else {
    colourColumn = $colourBy[0];
    colourScaleType = $colourBy[1];
  }

  if (colourScaleType === 'continuous') {

    var elems = $data.filter(row => row[colourColumn] !== '').map(row => parseFloat(row[colourColumn]));
    var minVal = Math.min(...elems);
    var maxVal = Math.max(...elems);
    var continuousScale = d3.scaleSequential().domain([minVal, maxVal]).interpolator(d3.interpolateCool);
    svg.selectAll("circle")
      .data($data)
      .style("fill", d => (d[colourColumn] === "") ? "#c8c8c8" : continuousScale(parseFloat(d[colourColumn])));

  } else if (colourColumn === 'label') {

    svg.selectAll("circle")
      .data($data)
      .style("fill", d => (d[colourColumn] === "") ? "#c8c8c8" : tagScale(d[colourColumn]));

  } else if (colourScaleType === 'categorical') {
    var categoricalScale = d3.scaleOrdinal(d3.schemeCategory10);
    svg.selectAll("circle")
      .data($data)
      .style("fill", d => (d[colourColumn] === "" || (colourColumn === "cluster" && d[colourColumn] === "-1")) ? "#c8c8c8" : categoricalScale(d[colourColumn]));

  } else {
    svg.selectAll("circle")
      .data($data)
      .style("fill", "#c8c8c8");
  };
};

let el;
onMount(() => {

  svg = d3.select(el)
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .on("wheel", function(e, d) {
      lassoMode.set("zoom")
    }).on("contextmenu", function (e, d) {
      d3.event.preventDefault();
      lassoMode.set("lasso");
    });

  data.subscribe(() => {
    init();
    dataGlobal = $data;
  });

  labels.subscribe(() => {
    init();
  });

  showUnclustered.subscribe(handleShowUnclustered);
  showLabels.subscribe(handleShowLabels);
  searchValue.subscribe(handleSearch);
  textField.subscribe(handleSearch);
  lassoMode.subscribe(handleLassoMode);
  colourBy.subscribe(handleColourBy);
  searchMap.subscribe(handleSearch);
  searchMode.subscribe(handleSearch);
});

</script>

<div class="scatter" bind:this={el}>
</div>

<style>
.scatter {
  box-sizing: border-box;
  padding: 10px;
  position: relative;
  height: 100%;
}
</style>

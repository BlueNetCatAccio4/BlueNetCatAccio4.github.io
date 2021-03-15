// Needs d3 library


var startTrawling =  (staticDataFile) => {
  'use strict'

  var htmlContainer = document.getElementById("piechart");
  // Loads the data and starts the visualizer
  if (this.data === undefined)
    showBiomassData("http://localhost:8080/portBiomass", staticDataFile, htmlContainer, "Pesca per port en Biomassa");
  else
    runApp(htmlContainer, partition, this.data, d3);
}

// HTML button events

var compareTrawling = (event) => {
  if (this.data === undefined)
    return;
  // Hide compare button
  event.target.style.visibility="hidden";
  // Show close compare button
  document.getElementById("closeCompare").style.visibility = null;

  // Create pie chart
  //var compEl = document.getElementById("comparePie");
  let piechart = document.getElementById("piechart");
  let compEl = piechart.cloneNode(false);
  compEl.id = "comparePie";
  piechart.parentElement.insertBefore(compEl, piechart);
  runApp(compEl, partition, this.data, d3);
}

// HTML button events
var closeCompare = (event) => {
  // Hide compare button
  event.target.style.visibility="hidden";

  // Show close compare button
  var cmp = document.getElementById("compareBtn");
  cmp.style.visibility=null;
  //cmp.className ="";// I don't understand why
  // Remove pie chart
  console.log(document.getElementById("comparePie"));
  document.getElementById("comparePie").remove();


}




// Based on D3 example: https://observablehq.com/@d3/zoomable-sunburst
// d3 label center: https://observablehq.com/@kerryrodden/sequences-sunburst
// data variable is loaded from data.json (header)
function runApp(htmlContainer, partition,data,d3){

  // Store data
  this.data = data;

	const root = partition(data);
	var color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));
	var format = d3.format(",d");
	var width = 600;
	var radius = width / 6;

	var arc = d3.arc()
	    .startAngle(d => d.x0)
	    .endAngle(d => d.x1)
	    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
	    .padRadius(radius * 1.5)
	    .innerRadius(d => d.y0 * radius)
	    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

  root.each(d => d.current = d);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, width])
      .style("font", "15px sans-serif");


	// Center label
	const centerLabel = svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    //.style("visibility", "hidden");

		centerLabel
			.append("tspan")
			.attr("x", width/2)
			.attr("y", width/2)
			.attr("dy", "-2em")
			.text("Pesca per ports");


		centerLabel
	    .append("tspan")
	    .attr("x", width/2)
	    .attr("y", width/2)
	    .attr("dy", "2.5em")
			.attr("font-size", "0.8em")
	    .text("Biomassa");

	  centerLabel
	    .append("tspan")
	    .attr("x", width/2)
	    .attr("y", width/2)
	    .attr("dy", "3.8em")
			.attr("font-size", "0.8em")
			.attr("class", "biomassText")
	    .text(format(root.value) + " kg / km2");



	// Pie chart
  const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${width / 2})`);

  const path = g.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      //.attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
			.attr("fill", d => {return palette[d.data.species] === undefined ? 'rgb(50, 50, 50)' : "rgb(" + palette[d.data.species].color + ")"})// returns 'rgb(1,1,1)'
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0.1)//0) // Here if you want to show other levels
      .attr("d", d => arc(d.current));

  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

  path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.species).reverse().join("/")}\n${format(d.value)}` + " kg/km2"); // TODO show label, modify label https://chartio.com/resources/tutorials/how-to-show-data-on-mouseover-in-d3js/#creating-a-tooltip-using-the-title-tag

  const label = g.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
			.style("font", d => (d.x1 - d.x0) < 0.01 ?  (d.x1-d.x0)*100 * 15 +"px sans-serif" : "15px sans-serif")//(d.y1 - d.y0) * (d.x1 - d.x0) > 0.03 ? "15px sans-serif" : "8px sans-serif")
      .attr("transform", d => labelTransform(d.current, d.target))
      .text(d => d.data.name);

  const parent = g.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

		// Show biomass
		centerLabel
			.select(".biomassText")
			.style("visibility", null)
			.text(format(p.value) +  " kg / km2")

    const t = g.transition().duration(750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
      .filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0.1)//0) // Here if you want to show other levels
        .attrTween("d", d => () => arc(d.current));

    label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
				.style("font", d => { // Modify font for small portions
					let percentage = 100*(d.target.x1 - d.target.x0)/(2*Math.PI);
					 return percentage < 2 ? Math.max(15*percentage/2,9)+"px sans-serif" : "15px sans-serif";
				})
        .attrTween("transform", d => () => labelTransform(d.current, d.target));
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 0 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03; // Make the base label appear
    //return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d, target) {

    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    // TODO: Modify here to make the base label go to center

		if (target === undefined)
			return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; // Default
    else if (d.y0 < 1 && target.y0 <= 1) // Rotate base label to be horizontal
			return "rotate("+ (x - 90*d.y0) +") translate("+y*d.y0+",0) rotate("+(x < 180 ? 0 : 180)+")";
		else
			return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; // Default
  }

  //return svg.node();
  // Remove loader class
  htmlContainer.className = "my-4 w-100 mx-auto";
  htmlContainer.appendChild(svg.node());
}







var partition = data => {
  const root = d3.hierarchy(data)
      .sum(d => d.value) // Assing a value to each partition, based on the value of the smallest items
      .sort((a, b) => b.value - a.value) // Organize partitions (here from big to small)
			.sort((a, b) => b.data.name == "Altres" ? -1 : 1)
  return d3.partition()
      .size([2 * Math.PI, root.height + 1])
    (root);
}










// Server address to make a GET, static file in directory, html DIV element, string for title
function showBiomassData(address, staticFile, htmlContainer, title){
  console.log("getting biomass data per port: " + address +", "+ staticFile +", ")
	// Try data from server
	fetch(address)
		.then(r => r.json())
		.then(r => prepDataBiomass(r, title))
		.then(outData => runApp(htmlContainer, partition,outData,d3))
		.catch(e => {
			if (staticFile !== undefined){ // Load static file
				console.error("Could not fetch from " + address + ". Error: " + e + ". Trying with static file.");
				showBiomassData(staticFile, undefined, htmlContainer, title);
			} else {
				console.error("Could not fetch from " + address + ". Error: " + e + ".");
			}
		})
}








// Prepare the data from the server-database
var databaseJSONBiomass = null;
function prepDataBiomass(inData, title){
  databaseJSONBiomass = inData;
	const outData = {};
	outData.name = title + ": ";
	outData.children = [];

	// Iterate over all rows
	for (let i = 0; i<inData.length; i++){
		let item = inData[i];
		let zonaPort = item.ZonaPort;
		let nomPort = item.NomPort;
		let nomEspecie = item.NomEspecie;
		let nomComu = item.NomCatala || item.NomEspecie;
		let classCaptura = item.ClassificacioCaptura;
		let biomass = item.Biomassa_Kg_Km2;

		if (biomass < 1) // Do not display items with little biomass
			continue;

		// Create ZonaPort level if it does not exist
		if (outData.children.find(child => child.name === zonaPort) === undefined)
			outData.children.push({"name": zonaPort, "children": [], "species": zonaPort});

		let zonaPortIndex = outData.children.findIndex(child => child.name === zonaPort)
		// Create Port level if it does not exist
		let zonaChilds = outData.children[zonaPortIndex].children;
		if (zonaChilds.find(child => child.name === nomPort) === undefined)
			outData.children[zonaPortIndex].children.push({"name": nomPort, "children": [], "species": nomPort});

		let portIndex = outData.children[zonaPortIndex].children.findIndex(child => child.name === nomPort)
		// Create category level (Comercial, Rebuig, Restes)
		let portChilds = outData.children[zonaPortIndex].children[portIndex].children;
		if (portChilds.find(child => child.name === classCaptura) === undefined)
			outData.children[zonaPortIndex].children[portIndex].children.push({"name": classCaptura, "children": [], "species": classCaptura});

		let classIndex =  outData.children[zonaPortIndex].children[portIndex].children.findIndex(child => child.name === classCaptura)
		// If biomass is very small, put to others
		if ((biomass < 9 && classCaptura == "Comercial") || (biomass < 5 && classCaptura == "Rebuig")){
			let altresIndex =  outData.children[zonaPortIndex].children[portIndex].children[classIndex].children.findIndex(child => child.name === "Altres");
			// Define Altres group
			if (altresIndex == -1) {
				outData.children[zonaPortIndex].children[portIndex].children[classIndex].children.push({"name": "Altres", "children": [], "species": "Altres"});
				altresIndex = outData.children[zonaPortIndex].children[portIndex].children[classIndex].children.length - 1;
			}
			// Assign to Altres
			outData.children[zonaPortIndex].children[portIndex].children[classIndex].children[altresIndex].children.push({"name": nomComu, "value": biomass, "species": nomEspecie});
		}
		// Biomass is bigger
		else {
			// Assign biomass value
			outData.children[zonaPortIndex].children[portIndex].children[classIndex].children.push({"name": nomComu, "value": biomass, "species": nomEspecie});
		}
	}

	return outData;
}



// Export data
// https://www.codevoila.com/post/30/export-json-data-to-downloadable-file-using-javascript
const exportJSON = function(event){
  // Data not yet loaded
  if (databaseJSONBiomass === null)
    return;
  // Create
  let dataStr = JSON.stringify(databaseJSONBiomass);
  let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  let exportFileDefaultName = 'pesca_arrossegament_biomassa.json';
  let linkElement = event.target;//document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  // Now the "a" element has already the data, then remove the function
  linkElement.removeEventListener("onclick", exportJSON);
}

const exportCSV = function(event){
  // Data not yet loaded
  if (databaseJSONBiomass === null)
    return;
  // Parse JSON to CSV
  let jsonData = databaseJSONBiomass;
  let keys = Object.keys(jsonData[0]);

  let columnDelimiter = ',';
  let lineDelimiter = '\n';

  let csvColumnHeader = keys.join(columnDelimiter);
  let csvStr = csvColumnHeader + lineDelimiter;

  jsonData.forEach(item => {
      keys.forEach((key, index) => {
          if( (index > 0) && (index < keys.length) ) {
              csvStr += columnDelimiter;
          }
          csvStr += item[key];
      });
      csvStr += lineDelimiter;
  });

  // Now make downlodable element
  let dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvStr);
  let exportFileDefaultName = 'pesca_arrossegament_biomassa.csv';
  let linkElement = event.target;//document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  // Now the "a" element has already the data, then remove the function
  linkElement.removeEventListener("onclick", exportJSON);
}
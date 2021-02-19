const size = {w: 250, h: 200};

// contains the bar chart
const yearSVG = d3.select('svg.year');
// contains the coutnry map
const mapSVG = d3.select('svg.delay');

// defining container groups
const yearG = yearSVG.append('g').classed('container', true);
const mapG = mapSVG.append('g').classed('container', true);


// defining all the required variables as global
let netflixData,
    mapData,
    projection,
    yearScaleX, yearScaleY,
    yearBrush, 
    filters = {},
    dispatch = d3.dispatch('update');

// setting width and height of the SVG elements
yearSVG.attr('width', size.w)
    .attr('height', size.h);
mapSVG.attr('width', size.w)
    .attr('height', size.h);


Promise.all([
    d3.json('data/map/world.geo.json'),
    d3.csv('data/netflix_titles.csv')
]).then(function (datasets) {

    mapData = datasets[0];
    netflixData = datasets[1];

    console.log(mapData)
    console.log(netflixData)

    // dispatch update data
    dispatch.on('update', updateData);
    dispatch.call('update');


    // Adding year brush to the year bar-chart
    yearBrush = d3.brushX()
        .extent([[0,0], [size.w, size.h]])
        .on('end', function(event) {
            console.log(event.selection);

            if (!event.selection) return;

            let step = yearScaleX.step()
            let lowerIndex = Math.floor(event.selection[0]/step);
            let lowerVal = yearScaleX.domain()[lowerIndex];

            let upperIndex = Math.floor(event.selection[1]/step);
            let upperVal = yearScaleX.domain()[upperIndex]

            console.log(lowerVal, upperVal);
            filters.time = [lowerVal, upperVal];
            dispatch.call('update');
        });
    yearSVG.call(yearBrush);  // Binding the year brush to yearSVG

    drawMap();
    drawYearsChart();

});

// Ensure data is updated
function updateData() {

    // Filtering out the data as per newly set filters
    // Calling draw functions after freshly filtered data

    let filteredData = netflixData;
    if (filters.releaseYear) {
        filteredData = filteredData.filter(function(d) {
            return d.releaseYear >= filters.releaseYear[0] && d.releaseYear <= filters.releaseYear[1];
        });
    }
   
    drawYearsChart(filteredData);

}

// DRAW BAR CHART for years
function drawYearsChart(data = netflixData) {

    // data
    // x scale
    // y scale
    // draw bar shapes based on year

    if (!yearScaleX) {
        yearScaleX = d3.scaleBand()
            .domain([...Array(95).keys()])
            .range([0, size.w])
            .padding(0.2);
    }

    let nestedData = d3.group(data, d => d.releaseYear);
    nestedData = Array.from(nestedData);

    console.log(nestedData);
    console.log(nestedData[2]);


    if (!yearScaleY) {
        yearScaleY = d3.scaleLinear()
            .domain([0, d3.max(nestedData, d => d[1].length)])
            .range([size.h, 0]);
    }

    yearG.selectAll('rect')
        .data(nestedData)
        .join('rect')
        .attr('width', yearScaleX.bandwidth())
        .attr('height', d => size.h - yearScaleY(d[1].length))
        .attr('x', d => yearScaleX(d[0]))
        .attr('y', d => yearScaleY(d[1].length))

}

// DRAW MAP for countries in the world
function drawMap(mapG, mapData) {
    
    // 3d >> 2D | create projection function
    projection = d3.geoMercator()
        .fitSize([size.w, size.h], mapData); 

    // change 2D coordinates to single object (string of points)
    let path = d3.geoPath(projection);

    // bind data to svg canvas
    let pathSel = mapG.selectAll('path')
        .data(mapData.features) //map each object/feature
        .enter()  // how many paths needed to add?
        .append('path')  // actually adding the paths
        .attr('id', function(d){ return d.properties.name;})
        //now assign the string of points to this d attribute so SVG knows what to draw
        .attr('d', function(d) {
            return path(d);  
        });

return pathSel; 

}

// trying to group the netflix data by country 
// will use for the choropleth to show num releases per country
let nestedCountryData = d3.group(netflixData, d => d.country);
nestedCountryData = Array.from(nestedCountryData);

console.log(nestedCountryData);

// Make choropleth function to color the map
function choroplethizeMap(pathSel, nestedCountryData) {

    // make the color scale
    // update path selection function to include fill 
    // calculate color of each country based on color scale

    // make the color scale
    let extent = d3.extent(nestedCountryData, d => +d[1].length);
    console.log(extent);

    let colorScale = d3.scaleSequential()
        .domain(extent) // min/max of the netflix dataset's num releases/year
        .interpolator(d3.interpolateRdYlBu); // need to convert 3D color space into single dimension


    // selecting the geographic data here with d
    pathSel.style('fill', function (d){

    // here we are filtering to matching the names in both datasets, name (json) and country (netflixData)
    
        let country = nestedCountryData.filter(ele => ele.country === d.properties.name);

        console.log(country); //array of objects

        if (country.length > 0) {
            country = country[0];

            return colorScale(country.length);
        }
         return "#aaa";
    })

}
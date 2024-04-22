// Self-executing anonymous function to move to local scope
(function(){

    // Pseudo-global variables
    var attrArray = ["Debt (in Thousands)", "Aid (in Billions)", "Corruption Perceptions Index", "log(GDP)", "Happiness Index"];
    var expressed = attrArray[0]; // Initial attribute
    var chart;

    // Map and chart frame dimensions
    var width = window.innerWidth * 0.5,
        height = 500,
        chartWidth = window.innerWidth * 0.45,
        chartHeight = 500;

    // Begin script when window loads
    window.onload = function() {
        setMap();
    };
    // Set up choropleth map
    function setMap(){
        // Create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        var Title = map.append("text")
                .attr("x", 150)
                .attr("y", 60)
                .attr("class", "Title")
                .text("Top 20 Countries with Highest Debt and Key Indices");

        // create projection
        const parallel = 37.5;
        const projection = d3.geoCylindricalEqualArea()
            .parallel(parallel)
            .translate([width / 2, height / 2])
            .fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], {type: "Sphere"})
            .precision(0.1);
        // *Write the projection block for your chosen projection in main.js.
        
        var path = d3.geoPath()
            .projection(projection);

        // Use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Foreign Aid Country Data_2020.csv")); // Load attributes from csv
        promises.push(d3.json("data/world-countries.topojson")); // Load background and spatial data
        Promise.all(promises).then(callback);

        function callback(data){
            csvData = data[0];
            world = data[1];

             //create the color scale
            var colorScale = makeColorScale(csvData);
            // Translate world-countries TopoJSON
            var worldCountries = topojson.feature(world, world.objects.ne_110m_admin_0_countries_lakes).features;
            // Join csv data to GeoJSON enumeration units
            worldCountries = joinData(worldCountries, csvData);

            var colorScale = makeColorScale(csvData);
            // Add enumeration units to the map
            setEnumerationUnits(worldCountries, map, path,colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            createDropdown(csvData);

        }

        var zoom = d3.zoom()
            .scaleExtent([1, 6])
            .on('zoom', handleZoom);
        map.call(zoom);
    } // End of setMap()

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#eff3ff",  
            "#bdd7e7",
            "#6baed6",
            "#3182bd",
            "#007498"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    function joinData(worldCountries, csvData){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.Country; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<worldCountries.length; a++){

                var geojsonProps = worldCountries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.SOVEREIGNT; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return worldCountries;
    }


    function setEnumerationUnits(worldCountries, map, path, colorScale){
        // Add world countries to map
        var countries = map.selectAll(".countries")
            .data(worldCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                var name = d.properties.SOVEREIGNT;
                name = name.split(' ').join('_');
                return "countries " + name;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(d.properties[expressed]);            
                } else {                
                    return "#ccc";            
                }    
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = countries.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');
            // console.log(worldCountries[11].properties);
    }

    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLog()
            .range([0, chartHeight - 5])
            .domain([1, d3.max(csvData, function(d) { 
                return parseFloat(d[expressed])*1.5; 
            })]);

        //set bars for each country
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed] - a[expressed]
            })
            .attr("class", function(d){
                var name = d.Country;
                name = name.split(' ').join('_')
                return "bars " + name;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            })
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);


        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed];
            })
            .attr("class", function(d){
                return "numbers";
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                // return i * fraction + (fraction - 1) / 2;
                if (expressed === attrArray[0]  && i === 0) {
                    return i * fraction + (fraction / 2) + 5; // Shift the text right for the first bar of the first attribute only
                } else {
                    return i * fraction + (fraction - 1) / 2; 
                }
            })
            .attr("y", function(d){
                var barHeight = yScale(parseFloat(d[expressed]));
                // If bar height is less than 30px, place text above the bar
                if (barHeight < 30) {
                    return chartHeight - barHeight - 20; // Move the text above the bar for the first one
                } else if (barHeight > 470) {
                    return chartHeight - barHeight - 5; // Adjust the text down if the bar is very tall
                } else {
                    return chartHeight - barHeight + 13; // Default position for the first bar
                }
            })
            .text(function(d){
                return Math.round(d[expressed] * 100) / 100;
            });

        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " in each country");

        //set bar positions, heights, and colors
        //updateChart(bars, csvData.length, colorScale);
        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
    };  //end of setChart()
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLog()
            .range([0, chartHeight - 5])
            .domain([1, d3.max(csvData, function(d) { 
                return parseFloat(d[expressed])*1.5; 
            })]);
        //recolor enumeration units
        var worldCountries = d3.selectAll(".countries")
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            })
            .transition()
            .duration(1000);

        var bars = d3.selectAll(".bars")
            .sort(function(a, b){
                return b[expressed] - a[expressed]
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i * 20;
            })
            .duration(500);
        
        var numbers = d3.selectAll(".numbers")
            .sort(function(a, b){
                return b[expressed]-a[expressed];
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                // return i * fraction + (fraction - 1) / 2;
                if (expressed === attrArray[0]  && i === 0) {
                    return i * fraction + (fraction / 2) + 5; // Shift the text right for the first bar of the first attribute only
                } else {
                    return i * fraction + (fraction - 1) / 2; 
                }
            })
            .attr("y", function(d){
                var barHeight = yScale(parseFloat(d[expressed]));
                // If bar height is less than 30px, place text above the bar
                if (barHeight < 30) {
                    return chartHeight - barHeight - 20; // Move the text above the bar for the first one
                } else if (barHeight > 470) {
                    return chartHeight - barHeight - 5; // Adjust the text down if the bar is very tall
                } else {
                    return chartHeight - barHeight + 13; // Default position for the first bar
                }
            })
            .text(function(d){
                return Math.round(d[expressed] * 100) / 100;
            });
        updateChart(bars, csvData.length, colorScale);
    }; // end of changeAttribute()

    function updateChart(bars, n, colorScale){
        var yScale = d3.scaleLog()
            .range([0, chartHeight - 5])
            .domain([1, d3.max(csvData, function(d) { 
                return parseFloat(d[expressed])*1.5; 
            })]);
        
        //position bars
        bars.attr("x",function(d, i){
                return i * (chartWidth / n);
            })
            //size/ resize bars
            .attr("height", function(d, i){
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y",function(d, i){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            // color/ recolor bars
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });
        
        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each country");
    };
    
    function highlight(props) {
        //change stroke
        if(props.SOVEREIGNT){
            var label = props.SOVEREIGNT;
        } else {
            var label = props.Country;
        }
        label = label.split(' ').join('_')
        var selected = d3
            .selectAll("." + label)
            .style("stroke", "#63421d")
            .style("stroke-width", "2");
        setLabel(props);
    }

    function dehighlight(props) {
        if(props.SOVEREIGNT){
            var label = props.SOVEREIGNT;
        } else {
            var label = props.Country;
        }
        label = label.split(' ').join('_')
        var selected = d3
            .selectAll("." + label)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    }

    function setLabel(props) {
        if(props.SOVEREIGNT){
            var label = props.SOVEREIGNT;
        } else {
            var label = props.Country;
        }
        label = label.split(' ').join('_')
        console.log("here!");
        //label content
        if (props[expressed]) {
            var labelAttribute = "<h2>" + props[expressed] + "</h2> <b>" + expressed + "</b>";
        } else {
            var labelAttribute = "<h2>No Data</h2>"
        }
        

        //create info label div
        var infolabel = d3
            .select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", label + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div").attr("class", "labelname").html(label);
    }

    function moveLabel() {
        //use coordinates of mousemove event to set label coordinates
        var x = event.clientX + 10,
            y = event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }

    function handleZoom(e) {
        d3.selectAll('path')
            .attr('transform', e.transform);
    }

})(); // Last line of the self-executing anonymous function

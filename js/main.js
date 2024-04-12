// Self-executing anonymous function to move to local scope
(function(){

    // Pseudo-global variables
    var attrArray = ["Debt (in Thousands)", "Aid (in Billions)", "Aid / GDP", "Corruption Perceptions Index", " GNI (in Thousands)", "GDP Per Capita (in Thousands)", "log(GDP)", "Happiness Index"];
    var expressed = attrArray[0]; // Initial attribute

    // Begin script when window loads
    window.onload = setMap();

    // Set up choropleth map
    function setMap(){
        // Map frame dimensions
        var width = window.innerWidth * 0.5, // 0.64
            height = 500;

        // Create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

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

            createDropdown();

        }
    } // End of setMap()

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#eff3ff",  
            "#bdd7e7",
            "#6baed6",
            "#3182bd",
            "#08519c"
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
                return "countries " + d.properties.SOVEREIGNT;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(d.properties[expressed]);            
                } else {                
                    return "#ccc";            
                }    
            });
            // console.log(worldCountries[11].properties);
    }

    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.45,
            chartHeight = 500

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
                return parseFloat(d[expressed]); 
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
                return "bars " + d.SOVEREIGNT;
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
            });


        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed];
            })
            .attr("class", function(d){
                return "numbers " + d.SOVEREIGNT;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                var barHeight = yScale(parseFloat(d[expressed]));
                // If bar height is less than 30px, place text above the bar
                return barHeight < 30 ? chartHeight - barHeight - 10 : chartHeight - barHeight + 13;
            })
            .text(function(d){
                return Math.round(d[expressed] * 100) / 100;
            });

        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " in each country");
          
    };
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown");

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
})(); // Last line of the self-executing anonymous function

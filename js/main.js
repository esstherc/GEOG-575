// begin script when window loads
window.onload = setMap();

// set up choropleth map
function setMap(){

    // map frame dimensions
    var width = 960,
        height = 460;

    // create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class","map")
        .attr("width",width)
        .attr("height",height);

    // create .... projection centered on ...
    const parallel = 37.5;
    const projection = d3.geoCylindricalEqualArea()
        .parallel(parallel)
        .translate([width / 2, height / 2])
        .fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], {type: "Sphere"})
        .precision(0.1);
    // Write the projection block for your chosen projection in main.js.
    
    // use Promise.all to parallelize asynchromous data loading
    var promises =[];

    promises.push(d3.csv("data/Foreign Aid Country Data.csv")); // load attributes from csv
    promises.push(d3.json("data/world-countries.topojson")); // load background and spatial data
    Promise.all(promises).then(callback);

    // write callback function within setMap()

    function callback(data){
        csvData = data[0];
        world = data[1];
        //console.log(world);

        // translate world-countries topojson
        var worldCountries = topojson.feature(world, world.objects.ne_110m_admin_0_countries_lakes1);
        //console.log(worldCountries);

    };
};





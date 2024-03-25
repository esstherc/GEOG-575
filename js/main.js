// begin script when window loads
window.onload = setMap();

// set up choropleth map
function setMap(){
    // use Promise.all to parallelize asynchromous data loading
    var promises = [d3.csv("data/Foreign Aid Country Data.csv"),
                    d3.json("data/world-countries.topojson")
                ];
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





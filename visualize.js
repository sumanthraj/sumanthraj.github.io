// Dictionary for both geojson files 
let jsonDataUrls = {
    'Neighborhoods': 'https://raw.githubusercontent.com/sumanthraj/interview/master/assets/kc-neighborhoods.json',
    'Tracts': 'https://raw.githubusercontent.com/sumanthraj/interview/master/assets/kc-tracts.json'
};

//initial loading of the visualization
loadMap(jsonDataUrls['Neighborhoods']);

//dropdown for selecting the json data
let dropdown = $('#layer');
$.each(jsonDataUrls, function (val, text) {
    dropdown.append(
        $('<option></option>').val(val).html(val)
    );
});


$("#layer").change(function () {

    let selected = jsonDataUrls[$(this).children("option:selected").val()];
    loadMap(selected);

});

//function to load the selected json from dropdown
function loadMap(url){

    d3.json(url).then(mapDraw);

    //drawing the data on the map
    function mapDraw(geojson) {

        mapboxgl.accessToken = 'pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ'

        //Setup mapbox-gl map
        var map = new mapboxgl.Map({
            container: 'map', // container id
            style: 'mapbox://styles/mapbox/streets-v8',
            center: [-94.578331, 39.099724],
            zoom: 9,
        })

        map.addControl(new mapboxgl.NavigationControl());

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var container = map.getCanvasContainer()
        var svg = d3.select(container).append("svg")
        
        //legend for the data of different types of commute 
        svg.append("circle").attr("cx",1100).attr("cy",500).attr("r", 6).style("fill", "#1A237E")
        svg.append("circle").attr("cx",1100).attr("cy",515).attr("r", 6).style("fill", "#FF5733")
        svg.append("circle").attr("cx",1100).attr("cy",530).attr("r", 6).style("fill", "#FFC300")
        svg.append("circle").attr("cx",1100).attr("cy",547).attr("r", 6).style("fill", "#B71C1C")

        svg.append("text").attr("x", 1110).attr("y", 500).text("Drive-Alone").style("font-size", "15px").attr("alignment-baseline","middle")
        svg.append("text").attr("x", 1110).attr("y", 515).text("Drive-carpool").style("font-size", "15px").attr("alignment-baseline","middle")
        svg.append("text").attr("x", 1110).attr("y", 530).text("Public-Transit").style("font-size", "15px").attr("alignment-baseline","middle")
        svg.append("text").attr("x", 1110).attr("y", 547).text("Walk").style("font-size", "15px").attr("alignment-baseline","middle")

        var transform = d3.geoTransform({ point: projectPoint });
        var path = d3.geoPath().projection(transform);


        var colors = {
            'drive-alone' : '#1A237E',
            'drive-carpool' : '#FF5733',
            'public-transit' : '#FFC300',
            'walk' : '#B71C1C'

        };
        //generating svg path instructions from geojson data
        var featureElement = svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .on("mouseover", function (d) {  // producing tooltip data for a particular area when on mouse 

                let props = d.properties
                let details = (props.shid).split("/");
                let title_type = details[details.length - 1];
                let title = title_type.split(":")[1];
                // Calulating percentage for the people who walk and take vehicles for commute
                let drive_alone = roundOff(props['pop-commute-drive_alone'], 1);
                let carpool = roundOff(props['pop-commute-drive_carpool'], 1);
                let public_transit = roundOff(props['pop-commute-public_transit'], 1);
                let walk = roundOff(props['pop-commute-walk'], 1);

                let total = roundOff(drive_alone + carpool + public_transit + walk, 1);

                let drive_alone_percent = roundOff(drive_alone, total);

                let drive_carpool_percent = roundOff(carpool, total);

                let public_transit_percent = roundOff(public_transit, total);

                let walk_percent = roundOff(walk, total);

                let vehicles_percent = roundOff((total - walk), total);


                div.transition()
                    .duration(200)
                    .style("opacity", .9);

                div.html("<b>" + title + "<br/>"
                    + "Drive Alone: " + drive_alone + " (" + drive_alone_percent + "%)" + "<br/>"
                    + "Drive Carpool: " + carpool + " (" + drive_carpool_percent + "%)" + "<br/>"
                    + "Public Transit: " + public_transit + " (" + public_transit_percent + "%)" + "<br/>"
                    + "By Vehicles: " + (total - walk) + " (" + vehicles_percent + "%)" + "<br/>"
                    + "By Walk: " + walk + " (" + walk_percent + "%)" + "<br/>")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .attr("fill", function (d) { // filling the area of the map with a color respective to the maximum number of commute type
                let props = d.properties;

                let map =  new Map();

                map.set('drive-alone', roundOff(props['pop-commute-drive_alone'], 1));
                map.set('drive-carpool', roundOff(props['pop-commute-drive_carpool'], 1));
                map.set('public-transit', roundOff(props['pop-commute-public_transit'], 1));
                map.set( 'walk', roundOff(props['pop-commute-walk'], 1));

                let maxkey = "", maxval = -1;

                map.forEach((value, key) => {
                    if(value >  maxval){
                        maxval = value;
                        maxkey = key;
                    }
                });
                
                return colors[maxkey];
              });

        function update() {
            featureElement.attr("d", path);
        }

        map.on("viewreset", update)
        map.on("movestart", function () {
            svg.classed("hidden", true);
        });
        map.on("rotate", function () {
            svg.classed("hidden", true);
        });
        map.on("moveend", function () {
            update()
            svg.classed("hidden", false);
        })

        update()


        function projectPoint(lon, lat) {
            var point = map.project(new mapboxgl.LngLat(lon, lat));
            this.stream.point(point.x, point.y);
        }

        // function for the data to round off to decimal points and if its zero displaying 0 rather than NaN
        function roundOff(val, total) {
            return (total > 0) ? Math.floor((val / total) * 10000) / 100 : 0;
        }


    }
}
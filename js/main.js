(function(){ //define anonymous function
    
    // set global variables later used in the script
    var attrArray = ["Population", "Housing Units", "Income", "Age", "Unemployment"]; // array of data titles
    var csvArray = ["Total", "number of", "average", "average", "average"]; //array fo units for the data titles
    var userSelection = attrArray[3]; // Defaults to Population
    var csvUnit = "none" // creates a var used for units
    // defines a function used to set units based on the users selection, this is then used in the tooltip
    function csvFunc(){
        if (userSelection == attrArray[0]){
            csvUnit = csvArray[0];
        }
        else if (userSelection == attrArray[1]){
            csvUnit = csvArray[1];
        }
        else if (userSelection == attrArray[2]){
            csvUnit = csvArray[2];
        }
        else if (userSelection == attrArray[3]){
            csvUnit = csvArray[3];
        }
        else {
            csvUnit = csvArray[4];
        }
    };

    // calls the csv function
    csvFunc();

    // more global definitions
    var chartWidth = window.innerWidth * 0.405, // responsive chart width settings
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear() // defines the scale used on the yaxis of the chart
            .range([463, 4])
            .domain([0, 100]);


    window.onload = setMap(); // loads setmap function when window is loaded
    
    
    function setMap(){ //defines setmap function
    
        var width = window.innerWidth * 0.3,
            height = 450; // defines map width
                    
            // define projection of map
            var projection = d3.geoAlbers()
                .center([36.36, 52.95])
                .rotate([119.18, 11.50, 0])
                .parallels([-15.00, 37.62])
                .translate([width / 2 , height / 2]) //centers map
                .scale([9800]); //sets zoom scale
            
            var path = d3.geoPath() //defines path variable that holds objects in map
                .projection(projection);
    
            var map = d3.select("body") //defines map svg as a property of the body element
                .append("svg")
                .attr("class", "map")
                .attr("width", width)
                .attr("height", height);
    
                
            d3.queue() // asynchronous loading of data used in map
                .defer(d3.json, "data/WI_Counties.topojson")
                .defer(d3.json, "data/Southwest.topojson")
                .defer(d3.csv, "data/SouthwestCSV.csv") // load csv attributes
                .await(callback);
    
            // function that creates fetures from data to be added as svgs
            function callback(error, jsonData, usstates, csvData){
                var recolorMap = makeColorScale(csvData) 
                var wioutline = topojson.feature(jsonData, jsonData.objects.WI_Counties),
                    statesjson = topojson.feature(usstates , usstates.objects.Southwest).features;
    
                    console.log(error); //used to view outputs in console
                    console.log(jsonData);
                    console.log(usstates);
                    console.log(csvData);
                
                statesjson = joinData(statesjson, csvData); // sets a variable that is the data joined
    
                var colorScale = makeColorScale(csvData); // makes a function call
                setEnumerationUnits(statesjson, map, path, colorScale);// makes a function call
    
                setChart(csvData, colorScale);// makes a function call
                createDropdown();// makes a function call
    
            };
    
            
    };
    
    // function to jin csv data to states in topojson
    function joinData(statesjson, csvData){
    
        var attrArray = ["Population", "Housing Units", "Income", "Age", "Unemployment"]; // array of data titles
        //for loop that binds csv data to json data
        for (var i=0; i < csvData.length; i++){
            var csvState = csvData[i];
            var csvKey = csvState.NAME;
    
                                        // not convinced this works
            for (var a = 0; a < statesjson.length; a++){
    
                var geojsonProps = statesjson[a].properties;
                var geojsonKey = geojsonProps.NAMELSAD
    
                if (geojsonKey == csvKey){
    
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvState[attr]);
                        geojsonProps[attr] = val;
                    });
                };
            };
        };
    
        return statesjson;
    };
    
    //function that sets the data bound to the objects that can then be called by d3
    function setEnumerationUnits(statesjson, map, path, colorScale){
            
        var states = map.selectAll(".states") //selects all states in the map
            .data(statesjson) // data, enter, append d3 tool
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAMELSAD;
            }) // sets the class name of each object equal to the state name
            .attr("d", path)
            .on("mouseover", function(d){
                highlight(d.properties);
            }) // binds tooltip
            .on("mouseout", function(d){
                dehighlight(d.properties);
            }) // removes tooltip
            .on("mousemove", moveLabel) // moves the label from its origin position
            .style("stroke", "black") //sets outline fill for states
            .style("fill", function(d){ //sets the fill as the defined colorscale based on attr data
                var value = d.properties[userSelection];
    
                if (value) {
                    return colorScale(value);
                } else { 
                    return "#ccc";
                }
    
                
            });

        var desc = states.append("desc") //removes outlines on hover
            .text('{"stroke": "#000", "stroke-width": "2px"}');
            
        };
    

    //create colorscale used to color map based on the data
    function makeColorScale(statesjson, colorScale){
        var colorClasses = [ //defines colors in color scale
            "#ffff80",
            "#fad155",
            "#f2a72e",
            "#ad5313",
            "#6b0000"
            
        ];
    
        //create color scale generator
        colorScale = d3.scaleQuantile()
            .range(colorClasses);

        var minmax = [ //defines min and max of data based on user selected attribute form csv
            d3.min(statesjson, function(d) { return parseFloat(d[userSelection]); }),
            d3.max(statesjson, function(d) { return parseFloat(d[userSelection]); })
        ];

        //assigns the domain of the scale
        colorScale.domain(minmax);
    
        return colorScale;
        
    };
    
    // defines the function of the chart creation
    function setChart(statesjson, colorScale){
    
        // creates chart svg
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        // creates the background in the chart
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //defines the data and height of the chart dynamic to the data present
        var bars = chart.selectAll(".bar")
            .data(statesjson)
            .enter()
            .append("rect")
            .sort(function(a, b){ //changes the sort of the chart
                return b[userSelection]-a[userSelection]
            })
            .attr("class", function(d){ //defines the class, having issues with this one. getting undefined
                return "bar " + d[userSelection];
            })//width and height dynamic definitions below
            .attr("width", chartInnerWidth / statesjson.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / statesjson.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[userSelection]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[userSelection])) + topBottomPadding;
            })
            .on("mouseover", highlight) // creates highlight in map, problems as the proper data isnt binding
            .on("mouseout", dehighlight) // unselects bar
            .on("mousemove", moveLabel) //moves tooltip position
            .style("fill", function(d){ //fills based on color, again having problems due to undefined data values returned
                return colorScale(d, colorScale);
            });

        var desc = bars.append("desc") // removes stroke of selection
            .text('{"stroke": "none", "stroke-width": "0px"}');
    
        var chartTitle = chart.append("text") // creates a dynamic chart title
            .attr("x", (chartWidth / 13))    
            .attr("y", 40)
            .attr("class", "chartTitle")
            .attr("text-anchor", "left")
            .style("text-decoration", "underline")
            .text("Average " + userSelection + " in each State"); // changes based on userselection variable
    
        var yAxis = d3.axisLeft() // defines y axis and placement 
            .scale(yScale);
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        //chart frame creation and appending to svg
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight )
            .attr("transform", translate);
    
            
    };
    //creates combobox function
    function createDropdown(statesjson){
    
        var dropdown = d3.select("body") 
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttributes(this.value, statesjson)
            }); // defines action on user selection of items
    
            console.log(userSelection)
    
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Drop Down to Symbolize Map"); // creates title of combobox
    
        //values placed in combobox based on data headers
        var attrOptions = dropdown.selectAll("dropdown")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    
    // defines function that will change display in map and chart, again issues with this as I am getting undefined values in the data defenition
    function changeAttributes(attribute, csvData, statesjson){
    
        userSelection = attribute; // sets the usersSelection equal to the combo box value
    
        var colorScale = makeColorScale(statesjson); // runs the data through color scale generator
    
        var states = d3.selectAll(".states") // redefines states values for map 
            .style("fill", function(d){
                return makeColorScale(d[userSelection], colorScale)
            });
    
        var bars = d3.selectAll('.bar') // redefines charts data values
            .sort(function(a,b){ // sorts the data highest to lowest
                return b[userSelection] - a[userSelection];
            })
            .attr("x", function(d, i){ // sets chart dimension properties
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            //resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[userSelection]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[userSelection])) + topBottomPadding;
            })
            //change color of the bars
            .style("fill", function(d){
                return makeColorScale(d, colorScale);
            });
    };

    function highlight(props){ // defines highlight function used to visually select items
        var selected = d3.selectAll("."+ props.NAMELSAD)
        .style("stroke", "red")
        .style("stroke-width", "3");

        setLabel(props)
    };

    function dehighlight(props){ // function to remove highlighting defined above
        var selected = d3.selectAll("." + props.NAMELSAD)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
    
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
    
            var styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };
        d3.select(".infolabel") // removes label when hover is not in focus
        .remove();
    };


    function setLabel(props){ // function to create a tooltip with related data
        //label content
        var labelAttribute = "<h1> &nbsp; " + props[userSelection] +
        "</h1><b>"+ csvUnit + "</b>"+
            "<br><b>" + userSelection + "</b>"; // defines what is displayed in tooltip
    
        //create info label div
        var infolabel = d3.select("body") // defines the dom objects for the tooltips
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.NAMELSAD + "_label")
            .html(labelAttribute);
    
        var stateName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.NAMELSAD);
    };

    function moveLabel(){ // function that changes the position of the tooltip
        var x = d3.event.clientX + 8,
            y = d3.event.clientY - 130;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

})();
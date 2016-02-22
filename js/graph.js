var margin = {top: 20, right: 20, bottom: 70, left: 100},
    width = 900 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var rawUtilData = [];
var clusterMap = {};

var x, y, xAxis, yAxis, svg;

function dataParse(data, d) {
    var dateStr = new Date(d.timestamp);
    // formart date as MM-DD-YYYY to be used as key
    var datetime = dateStr.getFullYear() + "-" + (dateStr.getMonth() + 1) + "-" + dateStr.getDate();
    var clusterIdx = data.indexOf(_.find(data, {"date": datetime}));
    if (clusterIdx === -1) {
        data.push({
            "date": datetime,
            "total_usage": 0
        });
    } else {
        var usage = Number(d["disk_usage(MB)"]) / 1024 / 1024; // converting to TB
        data[clusterIdx].total_usage += usage;
    }
}

d3.csv("cluster-disk-util.csv", function(usage) {
    var data = [];
    usage.forEach(function(d) {
        // save raw data for cross filter purposes
        rawUtilData.push(d);
        dataParse(data, d);
    });
    drawGraph(data);
    d3.csv("cluster-locations.csv", function(location) {
        var countryCodes = [];
        location.forEach(function(d) {
            clusterMap[d.cluster_id] = d.country_code;
            countryCodes.push(d.country_code);
        });
        $.each(_.uniq(countryCodes), function(index, code) {
             $("#country-codes")
                 .append($("<option></option>")
                 .attr("value", code)
                 .text(code));
        });
        $("#country-codes")
            .append($("<option></option>")
            .attr("value", "")
            .text("Any")
            .attr("selected", "selected"));
        $("#country-codes").on('change', filterDataByLoc);
    });
});

function filterDataByLoc(event) {
    var selectedCountry = $(this).val();
    var targetClusters = [];
    for(cluster in clusterMap) {
        if (clusterMap[cluster] === selectedCountry) {
            targetClusters.push(cluster);
        }
    }
    var filteredUtilData = _.filter(rawUtilData, function(util) {
        return targetClusters.indexOf(util.cluster_id) !== -1
    });

    if (filteredUtilData.length === 0) {
        filteredUtilData = rawUtilData;
    }
    var data = [];
    filteredUtilData.forEach(function(d) {
        dataParse(data, d);
    });
    console.log(data);
    updateGraph(data);
}

function drawGraph(data) {
    x = d3.time.scale()
          .domain([new Date(data[0].date), d3.time.day.offset(new Date(data[data.length - 1].date), 1)])
          .rangeRound([0, width - margin.left - margin.right]);

    y = d3.scale.linear()
          .domain([0, d3.max(data, function(d) { return d.total_usage; })])
          .range([height - margin.top - margin.bottom, 0]);

    xAxis = d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .ticks(d3.time.days, 1)
          .tickFormat(d3.time.format('%m-%d'))
          .tickSize(0)
          .tickPadding(12);

    yAxis = d3.svg.axis()
          .scale(y)
          .orient('left')
          .tickPadding(8);

    svg = d3.select('body').append('svg')
          .attr('class', 'chart')
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    svg.selectAll('.chart')
          .data(data)
          .enter().append('rect')
              .attr('class', 'bar')
              .attr('x', function(d) { return x(new Date(d.date)); })
              .attr('y', function(d) { return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.total_usage)) })
              .attr('width', 20)
              .attr('height', function(d) { return height - margin.top - margin.bottom - y(d.total_usage) });

    svg.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
          .call(xAxis)
              .selectAll("text")
              .style("text-anchor", "end")
              .attr("dx", "-.8em")
              .attr("dy", "-.55em")
              .attr("transform", "rotate(-90)" );

    svg.append('g')
          .attr('class', 'y axis')
          .call(yAxis)
          .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Usage (TB)");
}

function updateGraph(updatedData) {
    // reset axes in case the range changed
    x.domain([new Date(updatedData[0].date), d3.time.day.offset(new Date(updatedData[updatedData.length - 1].date), 1)])
        .rangeRound([0, width - margin.left - margin.right]);

    y.domain([0, d3.max(updatedData, function(d) { return d.total_usage; })])
        .range([height - margin.top - margin.bottom, 0]);

    var svg = d3.select("svg").transition();

    d3.selectAll(".bar").remove();
    var g = d3.select("svg>g");

    g.selectAll("rect")
       .data(updatedData)
       .enter()
       .append("rect")
       .attr('class', 'bar')
       .attr('x', function(d) { return x(new Date(d.date)); })
       .attr('y', function(d) { return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.total_usage)) })
       .attr("width", 20)
       .attr('height', function(d) { return height - margin.top - margin.bottom - y(d.total_usage) });


    svg.select(".x.axis")
            .duration(750)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)" );

    svg.select(".y.axis")
            .duration(750)
            .call(yAxis);
}
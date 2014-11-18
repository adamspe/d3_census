cpi = {
    CHART_W: 1165,
    CHART_H: 625,
    SMALLEST_R: 2,
    BIGGEST_R: 30,
    ENTER_TRANS_DURATION: 2000,
    UPDATE_TRANS_DURATION: 2000,
    EXIT_TRANS_DURATION: 2000,
};
angular.module('cpi.d3',[
    'ui.bootstrap',
    'multi-select'
])
.controller('CpiVisController',['$scope','$timeout',
    function($scope,$timeout){
        $scope.status = {
            working: true
        };

        // init the chart (once)
        $scope.force = d3.layout.force()
            .size([cpi.CHART_W,cpi.CHART_H])
            .on("tick",function() {
                $scope.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
            });
        $scope.chart = d3.select(".chart")
            .attr("width", cpi.CHART_W)
            .attr("height", cpi.CHART_H)
            .append('g');
        $scope.node = $scope.chart.selectAll(".node");


        $scope.visualize = function() {
            var data = $scope.data.selections.reduce(function(prev,curr,idx,arr){
                return (curr.selected && $scope.data.data[curr.label]) ?
                    prev.concat($scope.data.data[curr.label].data) : prev;
            },[]),
            key = $scope.data.viz_key,
            w = cpi.CHART_W,
            h = cpi.CHART_H;

            // restart the layout
            $scope.force.nodes(data).start();

            var r = d3.scale.linear()
                    .domain([
                        d3.min(data,function(d){return d[key];}),
                        d3.max(data,function(d){return d[key];})])
                    .range([cpi.SMALLEST_R,cpi.BIGGEST_R]);


            $scope.node = $scope.node.data(data,function(d) { return d.urban_area; });

            // exit
            //$scope.node.exit().selectAll('.circle').transition().duration(cpi.EXIT_TRANS_DURATION).attr("r", 0).remove();
            var exit = $scope.node.exit();
            console.debug('exit',exit);
            console.debug('remove',exit.remove());

            // enter selection
            var enter = $scope.node.enter().append("g")
                  .attr("class","node")
                  //.on("click",function(d){do something on click})
                  .call($scope.force.drag);

            enter.append("circle")
                    .attr("class",function(d) { return "circle "+d.state; })
                    .attr("r",0).transition().duration(cpi.ENTER_TRANS_DURATION)
                    .attr("r",function(d) { return (d['current_radius']=r(d[key])); });

            /*
            var circles = $scope.chart.selectAll(".node")
                    .data(data,function(d) { return d.urban_area; });

            // update selection
            circles.attr("r",function(d) {
                return d['current_radius'];
            }).transition().duration(cpi.UPDATE_TRANS_DURATION)
                   .attr("r",function(d) { return (d['current_radius']=r(d[key])); })

            // exit selection
            circles.exit().transition().duration(cpi.EXIT_TRANS_DURATION).attr("r", 0).remove();

            // enter selection
            var enter = circles.enter().append("g")
                  .attr("class","node")
                  //.on("click",function(d){do something on click})
                  .call($scope.force.drag);

            enter.append("circle")
                    .attr("class",function(d) { return "circle "+d.state; })
                    .attr("r",0).transition().duration(cpi.ENTER_TRANS_DURATION)
                    .attr("r",function(d) { return (d['current_radius']=r(d[key])); });
            */

            $scope.status.working = false;
            console.debug('visualized '+$scope.data.viz_key,data);
        };
        d3.csv("data.csv", CPI_D3_DATA_UTILS.d3, function(error, data) {
            $scope.$apply(function(){
                var state;
                $scope.data = CPI_D3_DATA_UTILS.byState(data);
                delete $scope.data.labels.urban_area;
                delete $scope.data.labels.state;
                console.debug('data',$scope.data);
                $scope.data.viz_key = 'composite_index'; // by default visualize the index
                $scope.data.selections = [];
                for(state in $scope.data.data) {
                    $scope.data.selections.push({
                        icon: '<i class="fa fa-circle '+ state +'"></i>',
                        label: state,
                        selected: true
                    });
                }
                $scope.visualize();
            });
        });
}]);
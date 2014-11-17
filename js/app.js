cpi = {
    CHART_W: 1165,
    CHART_H: 500
};
angular.module('cpi.d3',[
    'ui.bootstrap',
    'multi-select'
])
.controller('CpiVisController',['$scope',
    function($scope){
        $scope.status = {
            working: true
        };
        { // init the chart (once)
            var margin = {top: 30, right: 30, bottom: 30, left: 30},
                width = cpi.CHART_W - margin.left - margin.right,
                height = cpi.CHART_H - margin.top - margin.bottom;
            $scope.chart = d3.select(".chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            $scope.chartConstraints = {h: height, w: width};
        }
        $scope.revisualize = function() {
            $scope.chart.selectAll(".circle")
                    .data([]).exit().remove();
            $scope.visualize();
        };
        $scope.visualize = function() {
            var data = $scope.data.selections.reduce(function(prev,curr,idx,arr){
                return (curr.selected && $scope.data.data[curr.label]) ?
                    prev.concat($scope.data.data[curr.label].data) : prev;

            },[]),
            key = $scope.data.viz_key,
            w = $scope.chartConstraints.w,
            h = $scope.chartConstraints.h;
            console.debug('visualize '+$scope.data.viz_key,data);

            var r = d3.scale.linear()
                    .domain(data.map(function(d){ return d[key]; }))
                    .range([5,200]);

            console.debug('r',r);
            console.debug('constraints',$scope.chartConstraints);

            var circles = $scope.chart.selectAll(".circle")
                    .data(data);
            circles.enter().append("circle")
                    .attr("class",function(d) { return "circle "+d.state; })
                    .attr("r",function(d) { return Math.ceil(Math.sqrt(r(d[key]))); })
                    .attr("cx",function() { return Math.random() * w; } )
                    .attr("cy",function() { return Math.random() * h; } );
            circles.exit().remove();

            $scope.status.working = false;
        };
        d3.csv("data.csv", CPI_D3_DATA_UTILS.d3, function(error, data) {
            $scope.$apply(function(){
                var state;
                $scope.data = CPI_D3_DATA_UTILS.byState(data);
                delete $scope.data.labels.urban_area;
                delete $scope.data.labels.state;
                console.debug('data',$scope.data);
                $scope.data.viz_key = 'index'; // by default visualize the index
                $scope.data.selections = [];
                for(state in $scope.data.data) {
                    $scope.data.selections.push({
                        label: state,
                        selected: true
                    });
                }
                $scope.visualize();
            });
        });
}]);
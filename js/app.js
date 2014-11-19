cpi = {
    CHART_W: 877,
    CHART_H: 750,
    STATE_R: 5,
    SMALLEST_R: 6,
    BIGGEST_R: 35,
    ENTER_TRANS_DURATION: 1000,
    UPDATE_TRANS_DURATION: 1000,
    EXIT_TRANS_DURATION: 500,
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
            .linkDistance(cpi.BIGGEST_R*1.5)
            //.charge(-120)
            .gravity(.08)
            .size([cpi.CHART_W,cpi.CHART_H])
            .on("tick",function() {
                $scope.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
                $scope.link.attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; });
            });
        $scope.chart = d3.select(".chart")
            .attr("width", cpi.CHART_W)
            .attr("height", cpi.CHART_H)
            .append('g');
        $scope.node = $scope.chart.selectAll(".node");
        $scope.link = $scope.chart.selectAll(".link");

        $scope.tooltip = d3.select('.cpi_info');
        $scope.closeCpiInfo = function() {
            $scope.tooltip.style("visibility", "hidden");
        }
        $scope.dropSelectedState = function() {
            if($scope.cpiInfoState) {
                for(var i = 0; i < $scope.data.selections.length; i++) {
                    if($scope.data.selections[i].label === $scope.cpiInfoState) {
                        $scope.data.selections[i].selected = false;
                        $scope.closeCpiInfo();
                        return $scope.visualize();
                    }
                }
            }
        }

        $scope.visualize = function() {
            function flatten(arr) {
              var nodes = [];
              arr.forEach(function(parent){
                nodes.push(parent);
                if(parent.children) {
                    nodes = nodes.concat(parent.children);
                }
              });
              return nodes;
            }
            $scope.closeCpiInfo();
            var data = flatten($scope.data.selections.reduce(function(prev,curr,idx,arr){
                return (curr.selected && $scope.data.data[curr.label]) ?
                    prev.concat($scope.data.data[curr.label]) : prev;
            },[])),
            links = d3.layout.tree().links(data),
            key = $scope.data.viz_key,
            w = cpi.CHART_W,
            h = cpi.CHART_H;

            //console.debug('about to visualize',data,links);
            $scope.current = data;
            areYouMoving();

            // restart the layout
            $scope.force.nodes(data).links(links).start();

            // update links
            $scope.link = $scope.link.data(links,function(d) { return d.target.id; });
            $scope.link.exit().remove();
            $scope.link.enter().insert('line','.node').attr('class','link');

            // create a new scale each time the data is updated since sizes are relative to what
            // is currently selected (not the entire possible dataset).
            var r = d3.scale.linear()
                    .domain([
                        d3.min(data,function(d){return d[key];}),
                        d3.max(data,function(d){return d[key];})])
                    .range([cpi.SMALLEST_R,cpi.BIGGEST_R]);

            function setClass(d) {
                var cls = "circle "+d.state;
                if(d.children||d._children) {
                    cls += " parent";
                } else if(r(d[key]) === cpi.BIGGEST_R) {
                    cls += " max";
                }
                return cls;
            }
            function getRadius(d) {
                return (d['current_radius']=((d.children||d._children) ? cpi.STATE_R : r(d[key])));
            }

            // update the data set
            $scope.node = $scope.node.data(data,function(d){ return d.id; });
            // exit
            /*
              The difference here is obscure but important what is desired is a transition that
              affects child elements (g/circle@r) AND when complete removes the parent.  Many
              attempts would result with parent DOM elements lingering after the transition completed.
            var exit = $scope.node.exit(),
                parent_trans = exit.transition();//.duration(cpi.EXIT_TRANS_DURATION);
            // create a chained transition to "shrink" the exiting data out of view
            parent_trans.selectAll('.circle').transition()
                .duration(cpi.EXIT_TRANS_DURATION)
                .attr("r", 0)
                .each("end",function() { console.debug('end',arguments); })
                .remove();
            //parent_trans.remove(); // remove parent elements after chained transition completes.
            */
           $scope.node.exit().transition()
                .duration(cpi.EXIT_TRANS_DURATION)
                .remove()
                .select('.circle').attr('r',0);

            // update selection (resize existing data based on the updated dataset)
            $scope.node.select('.circle')
                .attr('r',function(d) { return d['current_radius']; })
                .transition()
                .duration(cpi.UPDATE_TRANS_DURATION)
                .attr("r",getRadius)
                .attr('class',setClass);

            // enter selection (grow circles from 0 to their designated size)
            var enter = $scope.node.enter().append("g")
                  .attr("class","node")
                  //.on("click",function(d){do something on click})
                  .call($scope.force.drag); // allow the user to drag nodes around

            enter.append("circle")
                    .attr("class",setClass)
                    .attr('id',function(d){ return d.id; })
                    .on("click", function(d){
                        if (d3.event.defaultPrevented) return; // ignore drag
                        if(d.urban_area) {
                            var html = '<h4>'+d.urban_area+'</h4>',key;
                            html += '<ul class="list-unstyled">';
                            for(key in $scope.data.labels) {
                                html += '<li><label>'+$scope.data.labels[key]+':</label> '+d[key]+'%</li>'
                            }
                            html += '</ul>';
                            $scope.$apply(function() {
                                $scope.cpiInfoState = d.state;
                            });
                            $scope.tooltip.select('.cpi_info_body').html(html);
                            $scope.tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                            return $scope.tooltip.style("visibility", "visible");
                        } else {
                            // clicking ona state toggle display of state children.
                            if(d.children) {
                                d._children = d.children;
                                d.children = null;
                            } else if (d._children) {
                                d.children = d._children;
                                d._children = null;
                            }
                            $scope.visualize();
                        }
                    })
                    //.on('mouseover',function(d){})
                    //.on("mousemove", function(){return $scope.tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
                    //.on("mouseout", function(){return $scope.tooltip.style("visibility", "hidden");})
                    .attr("r",0).transition().duration(cpi.ENTER_TRANS_DURATION)
                    .attr("r",getRadius);

            enter.append('text').attr('dy','.35em').attr('dx','.35em').text(function(d) { return d.children||d.children ? d.state : ''; });

            $scope.status.working = false;
            //console.debug('visualized '+$scope.data.viz_key,data);
        };

        // go get the data and do some pre-processing so it's ready to be visualized.
        d3.csv("data.csv", CPI_D3_DATA_UTILS.d3, function(error, data) {
            $scope.$apply(function(){
                var state,state_data,idx = 0;
                $scope.data = CPI_D3_DATA_UTILS.byState(data,function(d){
                    d.id = idx++;
                });
                // don't want these labels
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

        function areYouMoving() {
            $scope.fromPcnt = $scope.data && $scope.data.viz_key && $scope.movingFrom ?
                $scope.movingFrom[$scope.data.viz_key] : null;
            $scope.toPcnt = $scope.data && $scope.data.viz_key && $scope.movingTo ?
                $scope.movingTo[$scope.data.viz_key] : null;
            if($scope.fromPcnt && $scope.toPcnt) {
                var pcntFrom = $scope.fromPcnt,
                    pcntTo = $scope.toPcnt;
                $scope.costChange=((pcntTo-pcntFrom)/pcntFrom)*100.0;
            } else {
                $scope.costChange = null;
            }
        }
        $scope.$watch('movingFrom',areYouMoving);
        $scope.$watch('movingTo',areYouMoving);
}]);
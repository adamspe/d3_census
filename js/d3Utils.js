/**
 * Takes raw census csv data and translates it into a more usable
 * form.
 *
 * @return {function} d3 data translator
 */
var CPI_D3_DATA_UTILS = (function() {
    var key_map = null,
        key_suffixes = {
            'health care': 'health_care',
            'utilities': 'utilities',
            'transportation': 'transportation',
            'grocery items': 'grocery',
            'housing': 'housing',
            'goods and services': 'goods_services',
            'composite index': 'composite_index',
            'urban area': 'urban_area'
        },
        state_re = /\s+[A-Z\-]+$/; // not all data is '..., STATE' with the comma so not including and some states aren't just states so including - as valid.
    function ends_with(s,suffix) {
        return s.indexOf(suffix,s.length-suffix.length) !== -1;
    }
    function build_key_map(d) {
        var csv_label,suffix,key_map = {inverted:{'state':'State'}};
        for(csv_label in d) {
            for(suffix in key_suffixes) {
                if(ends_with(csv_label.toLowerCase(),suffix)) {
                    key_map[csv_label] = key_suffixes[suffix];
                    key_map.inverted[key_suffixes[suffix]] = csv_label;
                    break;
                }
            }
        }
        return key_map;
    }
    function map_data(d,attach_key_map) {
        var key,mapped,state_idx;
        for(key in d) {
            if((mapped=key_map[key])) {
                d[mapped] = mapped != 'urban_area' ? +d[key] : d[key];
                delete d[key];
            }
        }
        if(d['urban_area'] && (state_idx=d['urban_area'].search(state_re)) !== -1) { // set state
            d['state'] = d['urban_area'].substring(state_idx+1).trim();
        }
        if(attach_key_map) {
            d.meta = {
                'key_map': key_map.inverted
            };
        }
        return d;
    }
    return {
        d3: function(d) {
            var missing_map = !key_map;
            if(missing_map) {
                key_map = build_key_map(d);
            }
            return map_data(d,missing_map);
        },
        byState: function(data) {
            var byStateData = {labels:{},data:{}};
            if(data && data.length) {
                byStateData.labels = data[0].meta.key_map;
                data.forEach(function(d) {
                    if(d.state) {
                        if(!byStateData.data[d.state]) {
                            byStateData.data[d.state] = {
                                label: d.state,
                                data:[]
                            };
                        }
                        byStateData.data[d.state].data.push(d);
                    } else {
                        console.error("data item doesn't have a state",d);
                    }
                });
            }
            return byStateData;
        }
    };
})();
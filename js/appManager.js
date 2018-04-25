function applicationManager(globalData) {
    var settings = {
        ProcessArea: {
            svg_height: 200,
            left: 120,
            bar_height: 35,
            scale_xMin: 10,
            scale_xMax: 1000
        },
        MatrixArea: {
            padding: 1,
            row_text_width:250,
            minValue: 5,
            rect_width:15,
            rect_height:15
        }
    };
    var globalmatrix,globalib,globalgroupbyprocessname;
    var getData = DataRetrieval(globalData);
    var global_links =ExtractGraph(globalData).links;
    function ExtractGraph(globalData) {
        var graphs = {
            links: [],
            sources: [],
            targets: []
        };
        //Update links
        globalData.forEach(function (object) {
            if (object.hasOwnProperty('library')) {
                //Check if source and target are in nodes
                var flag = false;
                graphs.links.forEach(function (link) {
                    if (link.source == object.Process_Name.toUpperCase() && link.target == object.library.toUpperCase()) {
                        flag = true;
                        //Update existing link
                        link.value.push(object);
                    }
                    ;
                })
                if (!flag) {
                    var obj = new Object();
                    obj.source = object.Process_Name.toUpperCase();
                    obj.target = object.library.toUpperCase();
                    obj.value = [];
                    obj.value.push(object)
                    graphs.links.push(obj);
                }
            }
        });

        //Update node
        graphs.links.forEach(function (link) {
            var sourceFlag = false, targetFlag = false;
            graphs.sources.forEach(function (source) {
                if (source.name == link.source) {
                    sourceFlag = true; //Found
                    source.links.push(link.target)
                }

            });
            graphs.targets.forEach(function (target) {
                if (target.name == link.target) {
                    targetFlag = true;
                    target.links.push(link.source);
                }

            })


            if (!sourceFlag) {
                var obj = {};
                obj.name = link.source;
                obj.links = [];
                obj.links.push(link.target)
                obj.default = graphs.sources.length;
                graphs.sources.push(obj);
            }
            if (!targetFlag) {
                var obj = {};
                obj.name = link.target;
                obj.links = [];
                obj.links.push(link.source)
                obj.default = graphs.targets.length;
                graphs.targets.push(obj);
            }
        })
        return graphs;
    }
    function DataRetrieval(inputData) {
        var groupbyOperation = d3.nest().key(function (d) {
            return d.Operation;
        }).entries(inputData);

        var group_by_process_name = d3.nest().key(function (d) {
            return d.Process_Name;
        }).entries(inputData);

        var group_by_process = d3.nest().key(function (d) {
            return d.Process;
        }).entries(inputData);

        var getdatabydomain =(function () {
                var domains ={};
            inputData.forEach(function (t) {
                if(t.hasOwnProperty('Domain')){
                    if(!domains.hasOwnProperty(t.Domain)){
                        domains[t.Domain] = t;
                    }
                }
            });
                return domains;
        })();
        return {
            getdatabyOperation: groupbyOperation,
            getdatabyProcessName: group_by_process_name,
            getdatabyProcess: group_by_process,
            getdatabyDomain : getdatabydomain
        }
    }
    function getIndexByName(inputData, name) {
        var index;
        for (var i = 0; i < inputData.length; i++) {
            if (inputData[i].name == name) {
                index = i;
                break;
            }
        }
        return index;
    }
    function sortArrayByName(inputData) {
        return inputData.sort(function (a, b) {
            return d3.ascending(a.name, b.name)
        })
    }
    function sortArrayByValue(inputData, property) {
        return inputData.sort(function (a, b) {
            return b[property] - a[property];
        })
    }
    function sortArrayBySimilarity(source, target, inputData) {
        // console.log(globalmatrix);
        // console.log(globalib);
        // console.log(globalgroupbyprocessname);

        d3.select("#matrix2D").selectAll("*").remove();
        var processes1 =[];
        var processes2 =[];
        var processes3 =[];
        for (var i=0; i<globalgroupbyprocessname.length; i++) {
            var obj = {};
            var obj2 = {};
            var obj3 = {};
            obj.name = globalgroupbyprocessname[i].key;
            obj.index = i;
            obj2.index = i;
            obj3.index = i;
            obj.refs = globalmatrix[i];
            var sumRefs = 0;
            var sumLibs = 0;
            for (var j = 0; j < obj.refs.length; j++) {
                if (obj.refs[j].value!=0){
                    sumRefs+=obj.refs[j].value.length;
                    sumLibs++;
                }
            }
            obj.sumRefs = sumRefs;
            obj.sumLibs = sumLibs;
            obj2.sumRefs = sumRefs;
            obj3.sumLibs = sumLibs;
            processes1.push(obj);
            processes2.push(obj2);
            processes3.push(obj3);
        }
        processes2.sort(function (a, b) {
            if (a.sumRefs < b.sumRefs) {
                return 1;
            }
            else
                return -1;
        });
        // Order processes3 by the total of libs
        processes3.sort(function (a, b) {
            if (a.sumLibs < b.sumLibs) {
                return 1;
            }
            else
                return -1;
        });


        // Copy the order from processes2 to processes
        for (var i=0; i<processes2.length; i++) {
            var index = processes2[i].index;
            processes1[index].indexSumRefs = i;
        }
        // Copy the order from processes3 to processes
        for (var i=0; i<processes3.length; i++) {
            var index = processes3[i].index;
            processes1[index].indexSumLibs = i;
        }
        function getRefCount(i, j){
            if (globalmatrix[i][j].value!=0){
                return globalmatrix[i][j].value.length;
            }
            else{
                return 0;
            }

        }
        function getDif(count1, count2){ // penalty function
            if (count1==0 && count2!=0)
                return 1000;
            else if (count1!=0 && count2==0)
                return 1000;
            else
                return Math.abs(count1-count2);
        }

        function processDif(processArray, firstProcessIndex){
            processArray[firstProcessIndex].isUsed = true;
            processArray[firstProcessIndex].indexSimilarity =0;

            var startIndex = firstProcessIndex
            var count= 1;
            while (count<processArray.length) {
                var minDif = 100000000;
                var minIndex = -1;
                for (var i=0; i<processArray.length; i++) {
                    if (processArray[i].isUsed==undefined) { // process is not ordered
                        // compute processes difference
                        var dif = 0;
                        for (var j = 0; j < globalib.length; j++) {
                            var count1 = getRefCount(startIndex, j);
                            var count2 = getRefCount(i, j);
                            dif += getDif(count1,count2); // Differential function *************
                        }
                        if (dif<minDif){
                            minDif = dif;
                            minIndex = i;
                        }
                    }
                }
                if (minIndex>=0){
                    console.log(minIndex+" " + processArray[minIndex].name);
                    processArray[minIndex].isUsed = true;
                    processArray[minIndex].indexSimilarity = count;
                    startIndex = minIndex;
                }
                count++;
            }
            return processArray;
        }

        function processLib(libArray, firstLibIndex){
            libArray[firstLibIndex].isUsed = true;
            libArray[firstLibIndex].indexSimilarity =0;

            var startIndex = firstLibIndex
            var count= 1;
            while (count<libArray.length) {
                var minDif = 100000000;
                var minIndex = -1;
                for (var l=0; l<libArray.length; l++) {
                    if (libArray[l].isUsed==undefined) { // process is not ordered
                        // compute libs difference
                        var dif = 0;
                        for (var i = 0; i < processes1.length; i++) {
                            var count1 = getRefCount(i, startIndex);
                            var count2 = getRefCount(i, l);
                            dif += getDif(count1,count2); // Differential function *************
                        }
                        if (dif<minDif){
                            minDif = dif;
                            minIndex = l;
                        }
                    }
                }
                if (minIndex>=0){
                    libArray[minIndex].isUsed = true;
                    libArray[minIndex].indexSimilarity = count;
                    startIndex = minIndex;
                }
                count++;
            }
            return libArray;
        }
        var libs =[];
        var libs2 =[];
        for (var l=0; l<globalib.length; l++) {
            var obj = {};
            var obj2 = {};
            obj.name = globalib[l];
            obj.index = l;
            obj2.index = l;
            var sumRefs = 0;
            for (var i = 0; i < processes1.length; i++) {
                if (globalmatrix[i][l].value!=0){
                    sumRefs+= globalmatrix[i][l].value.length;
                }
            }
            obj.sumRefs = sumRefs;
            obj2.sumRefs = sumRefs;
            libs.push(obj);
            libs2.push(obj2);
        }
        // Order libs2 by the total of references
        libs2.sort(function (a, b) {
            if (a.sumRefs < b.sumRefs) {
                return 1;
            }
            else
                return -1;
        });
        // Copy the order from libs2 to processes
        for (var i=0; i<libs2.length; i++) {
            var index = libs2[i].index;
            libs[index].indexSumRefs = i;
        }
        //var processes1 = processDif(processes1,processes3[0].index);
        processes1 = processDif(processes1,0);
        libs = processLib(libs,0);

        // Order options
        var orderOption =2;
        function getProcessIndex(index){  // order of process in row of the matrix
            var newIndex;
            if (orderOption==0) {// default order of processes
                newIndex = index;
            }
            else if (orderOption==1) {// order by the total lib references
                newIndex = processes1[index].indexSumRefs;
            }
            else{
                newIndex = processes1[index].indexSimilarity;
            }
            return newIndex;
        }
        function getLibIndex(index){  // order of process in column of the matrix
            var newIndex;
            if (orderOption==0) {// default order of processes
                newIndex = index;
            }
            else if (orderOption==1) {// order by the total lib references
                newIndex = libs[index].indexSumRefs;
            }
            else{
                newIndex = libs[index].indexSimilarity;
            }
            return newIndex;
        }
        for(var i=0;i<10;i++){
            console.log(getProcessIndex(i));
        }

        // var margintop=10;
        // var ColorScale = d3.scaleLinear()
        //     .domain([0, Math.sqrt(250)])
        //     .range([0, 1]);
        // var svg_height=globalgroupbyprocessname.length*(settings.MatrixArea.rect_height + settings.MatrixArea.padding) + 360;
        // var svg_width = globalib.length*(settings.MatrixArea.rect_width + settings.MatrixArea.padding) + settings.MatrixArea.row_text_width +20;
        // var svgMatrix = d3.select("#matrix2D")
        //     .append('svg')
        //     .attr('height', svg_height)
        //     .attr('width', svg_width);
        // var svg_g = svgMatrix.append('g').attr('transform','translate(0,10)');

    }
    function sortArrayByLinkSize(inputData) {
        return inputData.sort(function (a, b) {
            return b.links.length - a.links.length;
        })
    }
    function sortArrayByCountSize(inputData) {
        return inputData.sort(function (a, b) {
            var first_value = d3.max(a.links,function (d) {
                return d.values.length;
            });
            var second_value = d3.max(b.links,function (d) {
                return d.values.length;
            });
            return second_value - first_value;
        })
    }
    function create2DMatrix(rows, cols, links) {
        //Initialize 2D matrix with size rows x columns
        var matrix = new Array(rows);
        for (var i = 0; i < rows; i++) {
            matrix[i] = new Array(cols);
          //  matrix[i].fill(new Array(0));
        }
        links.forEach(function (link) {
            matrix[link.source][link.target] = link.value;
        });
        return matrix;
    }
    function drawMatrix(rowLabel, colLabel, inputData, position) {
        d3.select(position).selectAll("*").remove();
        var margintop=10;
        var ColorScale = d3.scaleLinear()
            .domain([0, Math.sqrt(250)])
            .range([0, 1]);
        var svg_height=rowLabel.length*(settings.MatrixArea.rect_height + settings.MatrixArea.padding) + 360;
        var svg_width = colLabel.length*(settings.MatrixArea.rect_width + settings.MatrixArea.padding) + settings.MatrixArea.row_text_width +20;
        var svgMatrix = d3.select(position)
            .append('svg')
            .attr('height', svg_height)
            .attr('width', svg_width);
        var svg_g = svgMatrix.append('g').attr('transform','translate(0,10)');

        //Draw x labels
        var textGroup = svg_g.append('g').attr('transform', 'translate('+(settings.MatrixArea.row_text_width+10)+',' + (rowLabel.length*(settings.MatrixArea.rect_height + settings.MatrixArea.padding)+5) + ')')
        var cols = textGroup.selectAll('text').data(colLabel)
            .enter()
            .append('text')
            .attr('x', function (d, i) {
                return (i) * (settings.MatrixArea.rect_width + settings.MatrixArea.padding);
            })
            .text(function (d) {
                return d.name;
            })
            .attr("class", function (d, i) {
                return "colLabel mono c" + i;
            })
            .attr('transform', function (d, i) {
                return 'rotate(90 ' + i * (settings.MatrixArea.rect_width + settings.MatrixArea.padding) + ',0)';
            });

        //Draw y labels

        var rows = svg_g.append('g');
        var horitext = rows.selectAll('text')
            .data(rowLabel).enter().append('text')
            .text(function (d) {
                return d.name +" ("+ d.links.length+")";
            })
            .attr("class", function (d, i) {
                return "rowLabel mono r" + i;
            })
            .attr('x', settings.MatrixArea.row_text_width)
            .attr('y', function (d, i) {
                return i * (settings.MatrixArea.rect_height + settings.MatrixArea.padding) + settings.MatrixArea.rect_height / 2;
            }).attr('text-anchor', 'end');

        //Draw matrix
        inputData.forEach(function (row, index) {
            var group = svg_g.append('g') //draw container for cells
                .attr('class','row')
                .attr('height',settings.MatrixArea.rect_height + settings.MatrixArea.padding)
                .attr('transform','translate('+(settings.MatrixArea.row_text_width+10)+','+(index*(settings.MatrixArea.rect_height + settings.MatrixArea.padding))+')')
            //Draw cells

            var cells = group.selectAll('rect')
                .data(row)
                .enter()
                .append('rect')
                .attr("class",'mat_rect')
                .attr('width',settings.MatrixArea.rect_width)
                .attr('height',settings.MatrixArea.rect_height)
                .attr('x',function (d,i) {
                    return  i*(settings.MatrixArea.rect_width + settings.MatrixArea.padding);
                })
                .attr('fill',function (d) {
                    if(d==undefined) return 'white';
                    else return d3.interpolateGreys(ColorScale(Math.sqrt(d.length)))
                    // return d.length==0 ? 'white' : d3.interpolateGreys(ColorScale(Math.sqrt(d.length)));
                }).on('mouseenter', function (d,i) {
                    if(d==undefined) return;
                    d3.selectAll('text.rowLabel').attr('opacity',0.2);
                    d3.selectAll('text.colLabel').attr('opacity',0.2);
                    d3.select('text.r'+index).attr('opacity',1);
                    d3.select('text.c'+i).attr('opacity',1);
                    div.transition()
                     .duration(200)
                        .style("opacity", 1);
                    var text = "";
                    d.forEach(function (value) { text +="Time: "+  value.Timestamp +"&nbsp; Lib: " +value.library +"<br>" })
                    div.html("<b>Number of calls: "+d.length+"</b><p>"+text)
                        .style("width","300px")
                        .style("left", (d3.event.pageX) + 20 + "px")
                        .style("top", (d3.event.pageY) + "px");
                }) .on('mouseleave',function (d,i) {
                    d3.selectAll('text.rowLabel').attr('opacity',1);
                    d3.selectAll('text.colLabel').attr('opacity',1);
                    div.transition()
                        .duration(200)
                        .style("opacity", 0);
                });
        })
    }
    function createNodesFromLinks(links) {
        var nodes ={sources:[], targets:[]};
        links.forEach(function (link) {
            var sourceFlag = false, targetFlag = false;
            nodes.sources.forEach(function (source) {
                if (source.name == link.source) {
                    sourceFlag = true; //Found
                    source.links.push({target:link.target,values:link.value})
                }

            });
            nodes.targets.forEach(function (target) {
                if (target.name == link.target) {
                    targetFlag = true;
                    target.links.push({target:link.source,values:link.value});
                }

            })


            if (!sourceFlag) {
                var obj = {};
                obj.name = link.source;
                obj.links = [];
                obj.links.push({target:link.target,values:link.value})
                obj.default = nodes.sources.length;
                nodes.sources.push(obj);
            }
            if (!targetFlag) {
                var obj = {};
                obj.name = link.target;
                obj.links = [];
                obj.links.push({target:link.source,values:link.value})
                obj.default = nodes.targets.length;
                nodes.targets.push(obj);
            }
        })
        return nodes;
    }
    function loadMatrix (input_links) {
        var local_links = JSON.parse(JSON.stringify(input_links));
        var nodes = createNodesFromLinks(local_links);
        local_links.forEach(function (link) {
            link.source = getIndexByName(nodes.sources, link.source);
            link.target = getIndexByName(nodes.targets, link.target);
        });
        var matrix = create2DMatrix(nodes.sources.length, nodes.targets.length, local_links);
        drawMatrix(nodes.sources, nodes.targets, matrix, '#matrix2D');
    }
    return {
        drawStats: function (position) {
            var margin_left = settings.ProcessArea.left;
            var bar_height = settings.ProcessArea.bar_height;
            var group_by_process = getData.getdatabyProcess;
            var xScale = d3.scaleLinear()
                .domain([0, d3.max(group_by_process, function (d) {
                    return d.values.length;
                })])
                .range([settings.ProcessArea.scale_xMin, settings.ProcessArea.scale_xMax]);

            d3.select(position).selectAll("*").remove();
            var svgStats = d3.select(position).append('svg').attr('width', '100%').attr('height', settings.ProcessArea.svg_height);
            group_by_process.forEach(function (process, index) {
                var group = svgStats.append('g').attr("transform", "translate(0," + index * bar_height + ")");
                var child_process = d3.nest().key(function (d) {
                    return d.Operation
                }).entries(process.values);
                child_process = child_process.sort(function (a, b) {
                    return b.values.length - a.values.length;
                })
                var xpos = margin_left;

                child_process.forEach(function (child) {
                    group.append('rect').attr('x', function (d) {
                        return xpos;
                    })
                        .attr('width', function (d) {
                            return xScale(child.values.length)
                        })
                        .attr('height', 30)
                        .attr('class', child.key)
                        .attr('fill', function (d) {
                            return colorPicker(child.key);
                        }).on('mouseover', function (d) {
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                        div.html('Operation: ' + child.key + "<br/> Total calls:" + child.values.length + "<br/>")
                            .style("left", (d3.event.pageX) + 5 + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                    }).on("click", function (d) {
                        var allrect = d3.select("#heatmap").selectAll('rect[group=detail]').style('opacity', 0);
                        d3.select("#heatmap").selectAll('rect.' + child.key.replace(" ", "_")).style('opacity', 1);
                    });
                    ;
                    xpos += xScale(child.values.length) + 2;
                })
                group.append('text').text(process.key + " (" + process.values.length + ")").attr('x', 0).attr('y', 18);
            })


        },
        drawStats2:function (position) {
            d3.select(position).selectAll("*").remove();
            var svgStats = d3.select(position).append('svg').attr('width', '100%').attr('height', settings.ProcessArea.svg_height);
            var group_O = svgStats.append('g');
            var group_by_operation = [{'key': 'WriteFile'}, {'key': 'CreateFile'}, {'key': 'SetRenameInformationFile'}, {'key': 'Load Image'}, {'key': 'Process Create'},
                {'key': 'RegCreateKey'}, {'key': 'RegDeleteValue'}, {'key': 'RegDeleteKey'}, {'key': 'UDP Send'}, {'key': 'UDP Receive'}, {'key': 'TCP Receive'}, {'key': 'TCP Send'}, {'key': 'TCP Connect'}]

            group_by_operation.forEach(function (operation, index) {
                var rect = group_O.append('g').attr('transform', 'translate(0,' + index * 15 + ')');
                rect.append('rect').attr('width', '20px').attr('height', '12px').attr('fill', function (d) {
                    return colorPicker(operation.key);
                })
                rect.append('text').text(operation.key).attr('x', '30px').style('color', 'black').style('font-size', '12px').attr('y', '8px')
            })
        },
        loadMatrix:function () {

           return loadMatrix(global_links);
        },
        drawMain: function (position) {
            d3.select(position).selectAll("*").remove();
            var lines = [];
            var group_by_process_name = getData.getdatabyProcessName;
            var group_by_process_create = getData.getdatabyOperation;
            group_by_process_create = group_by_process_create.filter(function (value) {
                return value.key == 'Process Create'
            })[0].values;
            var updated_data = UpdateProcessNameWithChild(group_by_process_name, group_by_process_create);
            for (var i = 0; i < updated_data.length; i++) {
                updated_data[i].children = [];
                for (var j = 0; j < updated_data[i].childs.length; j++) {
                    var obj = updated_data[updated_data[i].childs[j]];
                    updated_data[i].children.push(obj);
                }
                // sort children
                updated_data[i].children.sort(function (a, b) {
                    if (a.childs.length < b.childs.length) {
                        return -1;
                    }
                    else if (a.childs.length > b.childs.length) {
                        return 1;
                    }
                    else {
                        if (a.values[0].Step < b.values[0].Step) {
                            return 1;
                        }
                        else if (a.values[0].Step > b.values[0].Step) {
                            return -1;
                        }
                        else
                            return 0;
                    }
                });
            }

            updated_data.sort(function (a, b) {
                if (getSuccessors(a, []).length < getSuccessors(b, []).length) {
                    return 1;
                }
                else if (getSuccessors(a, []).length > getSuccessors(b, []).length) {
                    return -1;
                }
                else {
                    if (a.values[0].Step < b.values[0].Step) {
                        return -1;
                    }
                    else if (a.values[0].Step > b.values[0].Step) {
                        return 1;
                    }
                    else
                        return 0;
                }
            });
            var orderedArray = [];
            var nextIndex = 0;

            for (var i = 0; i < updated_data.length; i++) {
                dfs(updated_data[i], orderedArray);
            }

            // DFS
            function dfs(o, array) {
                if (o.isDone == undefined) {
                    array.push(o);
                    o.isDone = true;
                    if (o.children != undefined) {
                        for (var i = 0; i < o.children.length; i++) {
                            dfs(o.children[i], array);
                        }
                    }
                }
            }

            // DFS
            function getSuccessors(o, array) {
                if (o.children != undefined) {
                    for (var i = 0; i < o.children.length; i++) {
                        array.push(o.children[i]);
                    }
                    for (var i = 0; i < o.children.length; i++) {
                        getSuccessors(o.children[i], array)
                    }
                }
                return array;
            }

            group_by_process_name.forEach(function (d) {
                d.position = getProcessNameIndex(orderedArray, d.key);
            })
            group_by_process_name = group_by_process_name.sort(function (a, b) {
                return a.position - b.position;
            });
            // orderedArray is the topological ordering
            //  debugger;

            var margin_left = 20;
            var rect_height = 20, rect_margin_top = 5, group_rect_height = rect_height + rect_margin_top,
                rect_width = 0.9;
            var svgheight = group_by_process_name.length * (group_rect_height);
            var max_step = d3.max(globalData, function (d) {
                return d.Step;
            });
            var max_scale = window.innerWidth * 0.7;
            var StepScale = d3.scaleLinear()
                .domain([0, max_step])
                .range([0, max_scale]);

            var library = d3.nest().key(function (d) {
                return d.library
            }).entries(globalData)

            library = library.filter(function (value) {
                if (value.key != 'undefined' && value.values.length > 10) return value
            })
            var libarr = [];
            library.forEach(function (d) {
                libarr.push(d.key);
            })
            library = library.sort(function (a, b) {
                return b.values.length - a.values.length
            })
            var matrix = make2Darray(group_by_process_name.length, library.length);
            var svg_process_name = d3.select('#heatmap').append('svg').attr('margin-left','20px').attr('width', "100%").attr('height', svgheight).attr("border", 1);
            svg_process_name.append("svg:defs").append("svg:marker")
                .attr("id", "arrow")
                .attr("refX", 0)
                .attr("refY", 4)
                .attr("markerWidth", 8)
                .attr("markerHeight", 8).attr('fill', 'rgb(37, 142, 215)')
                .attr("orient", 0).append('path').attr('d', 'M0,0 L0,8 L8,4 z');

            group_by_process_name.forEach(function (row, index) {
                var group = svg_process_name.append('g').attr("transform", "translate(0," + index * group_rect_height + ")");

                group.append('line').attr('stroke-dasharray', '2, 5').attr('stroke', 'black').attr('stroke-width', 0.1)
                    .attr('x1', (StepScale(row.values[0].Step) * rect_width + margin_left + 10)).attr('y1', rect_height / 2)
                    .attr('x2', (((StepScale(row.values[row.values.length - 1].Step)) * rect_width + margin_left) + 10)).attr('y2', rect_height / 2);

                var processes = row.values.filter(function (filter) {
                    if (filter.hasOwnProperty('library') && libarr.includes(filter.library) == true) return filter;
                })
                var filtered_library = d3.nest().key(function (d) {
                    return d.library
                }).entries(processes)
                //console.log(filtered_library)
                filtered_library.forEach(function (d) {
                    var obj = {};
                    obj.source = index;
                    obj.target = libarr.indexOf(d.key);
                    obj.value = d.values;

                    lines.push(obj);
                })
                // console.log(filtered_library)

                group.append('text').text(row.key.substring(0, 20))
                    .attr('x', ((StepScale(row.values[row.values.length - 1].Step)) * rect_width + margin_left) + 10).attr('y', group_rect_height / 2)
                    .attr('text-anchor', 'start');

                var rect = group.selectAll('rect').data(row.values).enter().append('rect')
                    .attr('x', function (d, i) {
                        return (StepScale(d.Step)) * rect_width + margin_left;
                    })
                    .attr('class', function (d, i) {
                        return d.Operation.replace(" ", "_");
                    })
                    .attr('group', 'detail')
                    .attr('id', function (d) {
                        return d.Step;
                    }).attr('y', function (d) {
                        if (d.hasOwnProperty('VirusTotal')) {
                            if (d.VirusTotal.malicious > 0)
                                return 0;
                        }
                        else {
                            return 2.5;
                        }
                    })
                    .attr('width', rect_width)
                    .attr('height', function (d) {
                        if (d.hasOwnProperty('VirusTotal')) {
                            if (d.VirusTotal.malicious > 0)
                                return rect_height;
                        }
                        else {
                            return rect_height - 8;
                        }
                    })
                    .style('fill-opacity', 0.6)
                    .attr('fill', function (d) {
                        return colorPicker(d.Operation);
                    }).on('mouseover', function (d) {
                        if (d.Operation == 'UDP Send' && d.hasOwnProperty('VirusTotal')) {

                            div.transition()
                                .duration(200)
                                .style("opacity", 1).style('width', '250px');
                            div.html('<table><tr><td colspan="4">Source: https://www.virustotal.com</td></tr><tr><td><img src="images/clean.png" width="20" height="20"/></td><td> Clean (' + d.VirusTotal.harmless + ')</td>' +
                                '<td><img src="images/malicious.png" width="20" height="20"/></td><td><font color="red"><b>Malicious (' + d.VirusTotal.malicious + ')</b> </font></td></tr>' +
                                '<tr><td><img src="images/suspicious.png" width="20" height="20"/></td><td> Suspicious (' + d.VirusTotal.suspicious + ')</td>' +
                                '<td><img src="images/question.png" width="20" height="20"/></td><td> Undetected (' + d.VirusTotal.undetected + ')</td></tr><tr><td colspan="4">Target domain: ' + d.Domain + '</td></tr>' +
                                '<td colspan="4">Connecting time: ' + d.Timestamp + '</td></tr></table>')
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY - 28) + "px");
                        }
                        else {


                            div.transition()
                                .duration(200)
                                .style("opacity", 1);
                            div.html(d.Process_Name + "<br/>" + d.Timestamp + "<br/>")
                                .style("left", (d3.event.pageX) + 10 + "px")
                                .style("top", (d3.event.pageY - 28) + "px");

                        }
                    }).on('click', function (d) {
                        var paths = d3.selectAll('path.detail_path').style('opacity', 0);
                        d3.selectAll('path[source="' + (getProcessNameIndex(updated_data, d.Process_Name)) + '"]').style('opacity', 1);

                    })
            })


            orderedArray.forEach(function (d, index) {
                if (d.children.length > 0) {
                    d.children.forEach(function (child) {
                        svg_process_name.append('path').attr("class", 'detail_path')
                            .attr('d', d3.arc()
                                .innerRadius((getProcessNameIndex(updated_data, child.key) - index) * group_rect_height / 2 - 1)
                                .outerRadius((getProcessNameIndex(updated_data, child.key) - index) * group_rect_height / 2)
                                .startAngle(-Math.PI) //converting from degs to radians
                                .endAngle(Math.PI / 90))
                            .attr('fill', 'rgb(37, 142, 215)').attr('source', index).attr('target', getProcessNameIndex(updated_data, child.key))
                            .attr('transform', function (value) {
                                var posX = (StepScale(child.values[0].Step)) * rect_width + margin_left - 5;
                                var posY = (getProcessNameIndex(updated_data, child.key) + index) * group_rect_height / 2 + group_rect_height / 2;
                                return 'translate(' + posX + ',' + posY + ')';
                            }).attr("marker-end", "url(#arrow)")

                    })

                }

            });

            for (var i = 0; i < lines.length; i++) {
                var obj = new Object();
                obj.source = lines[i].source;
                obj.target = lines[i].target;
                obj.value = lines[i].value;
                matrix[lines[i].source][lines[i].target] = obj;
                // dllLines.append('line').attr('stroke-width', ddlLineScale(lines[i].value)).attr('class', 'dllline')
                //     .attr('x1', max_scale+60).attr('source', lines[i].source).attr('target', lines[i].target).attr('y1', lines[i].source * group_rect_height + rect_height / 2)
                //     .attr('x2', window.innerWidth-210).attr('y2', lines[i].target * ((dll_height + padding)) + (dll_height + padding) / 4)
            }
            globalmatrix = matrix;
            globalib = libarr;
            globalgroupbyprocessname = group_by_process_name;
            //console.log(matrix)
            //drawMatrix(matrix, libarr, group_by_process_name);

        },
        draw2DMatrix: function (position) {
            var graphs = ExtractGraph(globalData);
            graphs.links = graphs.links.filter(function (link) {
                return link.value.length > settings.MatrixArea.minValue;
            });
            graphs.indexLinks = [];
            var rect_width = (settings.MatrixArea.matrix_width - settings.MatrixArea.padding * (graphs.targets.length - 1)) / graphs.targets.length;
            var svgMatrix = d3.select(position).append('svg').attr('height', settings.MatrixArea.svg_height).attr('width', settings.MatrixArea.svg_width).attr('margin-top', "15px");
            var matrix = make2Darray(graphs.sources.length, graphs.targets.length);

        },
        sort2DMatrix: function (type) {
            var nodes = createNodesFromLinks(global_links);
            var sourcename =JSON.parse(JSON.stringify(nodes.sources)) ;
            var targetname =JSON.parse(JSON.stringify(nodes.targets));
            var local_links = JSON.parse(JSON.stringify(global_links));
            switch (type) {
                case "name":
                    sourcename = sortArrayByName(sourcename);
                    targetname = sortArrayByName(targetname);
                    break;
                case "numlinks":
                    sourcename = sortArrayByLinkSize(sourcename);
                    targetname = sortArrayByLinkSize(targetname);
                    break;
                case "numcount":
                    sourcename = sortArrayByCountSize(sourcename);
                    targetname = sortArrayByCountSize(targetname);
                    break;
                case "similarity":
                    sortArrayBySimilarity(sourcename, targetname,local_links);
                    break;
                default:
                    break;
            }
            //convert link by name to link by id
            local_links.forEach(function (link) {
                link.source = getIndexByName(sourcename, link.source);
                link.target = getIndexByName(targetname, link.target);
            });
            var matrix = create2DMatrix(sourcename.length, targetname.length, local_links);
            drawMatrix(sourcename, targetname, matrix, '#matrix2D')

        },
        getCallRange:function () {
            var graphs = ExtractGraph(globalData);//Extract Graph to get all data.
            var min = d3.min(graphs.links,function (d) {
                return d.value.length;
            });
            var max = d3.max(graphs.links,function (d) {
                return d.value.length;
            })
            return {mincall:min, maxcall:max}
        },
        updateRangeFilter:function (min,max) {
            global_links = ExtractGraph(globalData).links.filter(function (link) {
                return link.value.length > min;
            });
            loadMatrix(global_links);

        },
        updateDomainBox:function (position) {
            d3.select(position).selectAll("*").remove();
            var domainList = getData.getdatabyDomain;
                var selection = document.querySelector(position);
            var count=1;
            for (var key in domainList){
                var option = document.createElement('option');
                option.textContent =count+". "+key;
                option.value =domainList[key].Step;
                option.title =domainList[key].Process_Name + " ["+ domainList[key].Timestamp+ "]";
                if(domainList[key].VirusTotal.malicious >0){
                    option.className='malicious';
                    option.textContent =count+". "+key + '-> malicious by Virus Total';
                }
                selection.appendChild(option);
                count++;
            }


        }

    }

}
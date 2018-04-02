function make2Darray(rows, cols) {
    var arr = new Array(rows);
    for(var i=0;i<rows;i++){
        arr[i] = new Array(cols);
        arr[i].fill({value:0});
    }
    return arr;
}
function getObjectIndex(obj,property,value) {
    var index;
    obj.forEach(function (d,i) {
        if(d[property]==value) index = i;
    })
    return index;
}
function ProcessData(dataInput,domain) {
    var domainFormat = /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
    var previous_minute = +dataInput[0].Timestamp.slice(2, 4);
    var previous_second = +dataInput[0].Timestamp.slice(5, 7);
    var previous_milisecond = +dataInput[0].Timestamp.slice(8, 11);
    var metrics = 1000;
    var previous_time_step = (previous_minute * 60 + previous_second) * metrics + previous_milisecond;
    var current_time_step = 0;
    dataInput.forEach(function (datum, index) {
        datum.minute = +datum.Timestamp.slice(2, 4);
        datum.second = +datum.Timestamp.slice(5, 7);
        datum.milisecond = +datum.Timestamp.slice(8, 11);
        datum.Step = (datum.minute *60 + datum.second) * metrics + datum.milisecond - previous_time_step + current_time_step;
        current_time_step = datum.Step;
        previous_time_step = (datum.minute *60 + datum.second) * metrics + datum.milisecond;
        if (datum.Operation == 'Process Create') {
            datum.targetProcessName = datum.Path.replace(/^.*[\\\/]/, '');
            datum.childPID = datum.Detail.slice(5, 9);
        }
        if (datum.Operation == 'UDP Send') {

            var getdomain = datum.Path.slice(datum.Path.indexOf('->') + 3, -5);
            if (getdomain.match(domainFormat)) {
                if (getdomain.split('.').length > 2) {
                    getdomain = getdomain.slice(getdomain.indexOf('.') + 1);
                    datum.Domain = getdomain;
                } else {
                    datum.Domain = getdomain;
                }
                domain.forEach(function (dm_value) {
                    if (dm_value.domain == datum.Domain) {
                        var obj = {}
                        obj.count = +dm_value.count;
                        obj.harmless = +dm_value.harmless;
                        obj.malicious = +dm_value.malicious;
                        obj.suspicious = +dm_value.suspicious;
                        obj.undetected = +dm_value.undetected;
                        datum.VirusTotal = obj;
                    }
                })
            }

        }
        if (datum.Path.slice(-3).toLowerCase() == 'dll') {
            datum.library = datum.Path.replace(/^.*[\\\/]/, '')
        }
        datum.Process = getProcessName(datum.Operation);
    });
    return dataInput;
}
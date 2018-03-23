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
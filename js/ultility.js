function make2Darray(rows, cols) {
    var arr = new Array(rows);
    for(var i=0;i<rows;i++){
        arr[i] = new Array(cols);
        arr[i].fill({value:0});
    }
    return arr;
}
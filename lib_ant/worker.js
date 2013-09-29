var path = location.pathname.split("/"); // location.pathname = "/dir1/dir2/file.ext"
path.shift();// 先頭の空要素を捨てる
path.pop();// file.ext を捨てる
var dir = path.join("/") + "/";// dir = "dir1/dir2/"

//importScripts(dir + "antprobe.js");
importScripts("antprobe.js");

var sendMessage = function(type, param){
            if(typeof param !== "undefined"){
                self.postMessage({
                    type: type,
                    param: param
                });
            }else{
                self.postMessage({
                    type: type
                });
            }
        };

var antsEntity = new antprobe.AntsEntity();

self.addEventListener("message", function(e){
    var data = e.data;
    if(!data.type){
        throw "data.type no there !: " + data.type
    };
    switch(data.type){
        case "calcNext":
            antsEntity.calc();
            break;
        case "onload":
            var param = data.param;
            antsEntity.onload(param);
        case "reset":
            antsEntity.reset();
            sendMessage("logd", "resetDone")
            sendMessage("resetDone", antsEntity.pheromoneMap);
            break;
        case "configure":
            break;
        case "close":
            close();
            sendMessage("closeDone");
            break;
        default:
            throw "unknown event:" + data.type;
    }
});


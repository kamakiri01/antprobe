//=================================================
// variables 
//=================================================
var STAGE_WIDTH = 512;
var STAGE_HEIGHT = 512;
var CITY_SIZE = 3;
var STAGE_BACKGROUND_COLOR = "lightgray";
var CITY_ARRAY_EXAMPLE = [
    {x:10,
        y:10},
    {x:310,
        y:10},
    {x:310,
        y:310},
    {x:10,
        y:210},
    {x:210,
        y:310},
    {x:290,
        y:200}
];
var　currentCityArrayHolder = CITY_ARRAY_EXAMPLE; //実行中の都市の座標配列

//=================================================
// process
//=================================================
enchant();
window.onload = function(){
    var is_working = false; //frag

    //=================================================
    // DOM target objects
    //=================================================
    var statusForm = document.getElementById("form");
    statusForm.value = "wait";
    var start = document.getElementById("start");
    is_working = false;
    start.addEventListener("click", function(){
        if(is_working){
            proxy.stop();
            this.value = "start";
            is_working = false;
            statusForm.value ="stop";
            $("#create").removeAttr("disabled");
            $("#apply").removeAttr("disabled");
        }else{
            proxy.start();
            this.value = "stop";
            is_working = true;
            statusForm.value = "working";
            $("#create").attr("disabled","disabled");
            $("#apply").attr("disabled","disabled");
        }
    });
    var reset = document.getElementById("reset");
    reset.value = "reset";
    reset.addEventListener("click", function(){
        proxy.reset();
    });
    var cityCount = document.getElementById("cityCount");
    //パラメータ設定のDOM操作
    var showCityCountNumFromForm = function(){
        $("#cityCountNum").text($("#cityCount").val());
    };
    var showAntPriorityPheromoneNumFromForm = function(){
        $("#ant_priority_pheromone_num").text($("#ant_priority_pheromone").val());
    };
    var showAntPriorityHeuristicNumFromForm = function(){
        $("#ant_priority_heuristic_num").text($("#ant_priority_heuristic").val());
    };
    var showAntColnyScaleNumFromForm= function(){
        $("#ant_colony_scale_num").text($("#ant_colony_scale").val());
    };
    var showAntDensityPheromoneNumFromForm= function(){
        $("#ant_density_pheromone_num").text($("#ant_density_pheromone").val());
    };
    var showPheromoneEvaporationNumFromForm = function(){
        $("#pheromone_evaporation_num").text($("#pheromone_evaporation").val());
    };
    showCityCountNumFromForm();
    showAntPriorityPheromoneNumFromForm();
    showAntPriorityHeuristicNumFromForm();
    showAntColnyScaleNumFromForm();
    showAntDensityPheromoneNumFromForm();
    showPheromoneEvaporationNumFromForm();
    $("#cityCount").change(function(){ showCityCountNumFromForm(); });
    $("#ant_priority_pheromone").change(function(){ showAntPriorityPheromoneNumFromForm(); });
    $("#ant_priority_heuristic").change(function(){ showAntPriorityHeuristicNumFromForm(); });
    $("#ant_colony_scale").change(function(){showAntColnyScaleNumFromForm(); });
    $("#ant_density_pheromone").change(function(){showAntDensityPheromoneNumFromForm(); });
    $("#pheromone_evaporation").change(function(){showPheromoneEvaporationNumFromForm(); });

    //=================================================
    // Util antprobe functions
    //=================================================
    var createCitySpriteArray = function(cityArray){
        var citySpriteArray = [];
        for(var i=0;i<cityArray.length;i++){
            var c = new Circle(CITY_SIZE, "rgba(0,190,0, 1)");
            c.x = cityArray[i].x;
            c.y = cityArray[i].y;
            c.num = i;
            c.addEventListener("touchstart", function(e){
                // console.log("["+this.num+"] x:"+this.x+", y:"+this.y+" .");
            });
            c.addEventListener("touchmove", function(e){
                if(is_working === false){
                    this.x += (e.x - this.x)/2;
                    this.y += (e.y - this.y)/2;
                }
            });
            c.addEventListener("touchend", function(e){
                if(is_working === false){
                    console.log(this.num + "is touchended");
                    currentCityArrayHolder[this.num] = {x:this.x, y:this.y};
                }
            });
            citySpriteArray[i] = c;
        }
        return citySpriteArray;
    };
    var addChildCitySpriteArray = function(array){
        for(var i=0;i<array.length;i++){
            enchant.Core.instance.rootScene.addChild(array[i]);
        }
    };
    var setCitySpritesToScene = function(cityArray){
        var citySpriteArray = createCitySpriteArray(cityArray);
        addChildCitySpriteArray(citySpriteArray);
        return citySpriteArray;
    };
    var removeCitySpritesFromScene = function(citySpriteArray){
        for(var i=citySpriteArray.length;i>=0;i--){
            enchant.Core.instance.rootScene.removeChild(citySpriteArray[i]);
        }
    };
    //=================================================
    // main logics
    //=================================================
    //
    var proxy = new antprobe.AntsProxy();
    var data = new antprobe.AntConfiguration();
    data.setConfig(CITY_ARRAY_EXAMPLE);
    proxy.onload(data);
    var game = new Core(STAGE_WIDTH, STAGE_HEIGHT);
    game.fps = 15;
    game.rootScene.backgroundColor = STAGE_BACKGROUND_COLOR;
    game.onload = function(){
        var layer = new LineLayer();
        game.rootScene.addChild(layer);
        var citySpriteArray = setCitySpritesToScene(CITY_ARRAY_EXAMPLE);
        proxy.view = layer;
        var drawLinesToStage = function(vl, data){
            vl.areaWipe();
            var drawDepth = 0.5;
            for(var i=0;i<data.length;i++){
                for(var j=0;j<data[i].length;j++){
                    drawLine(citySpriteArray[i], citySpriteArray[j], data[i][j]*drawDepth);
                }
            }
            $("#stepCountNum").text(proxy.stepCount);
        };
        proxy._viewFunc = drawLinesToStage;
        // 都市配列の再生成関数
        var createOnClick = function(){
            var num = cityCount.value;
            currentCityArrayHolder = createRandomCity(num, STAGE_WIDTH, STAGE_HEIGHT);
            removeCitySpritesFromScene(citySpriteArray);
            citySpriteArray = setCitySpritesToScene(currentCityArrayHolder);
            data.setConfig(currentCityArrayHolder, 
                $("#ant_priority_heuristic").val(),
                $("#ant_priority_pheromone").val(),
                $("#ant_colony_scale").val(),
                $("#ant_density_pheromone").val(),
                $("#pheromone_evaporation").val()
             );
            proxy.abort();
            proxy = new antprobe.AntsProxy();
            proxy.onload(data);
            proxy.view = layer;
            proxy._viewFunc = drawLinesToStage;
            console.log("[generate new cities.]");
        };
        $("#create").click(createOnClick);
        //アリコロニーパラメータの再設定関数
        var applyOnClick = function(){
            removeCitySpritesFromScene(citySpriteArray);
            citySpriteArray = setCitySpritesToScene(currentCityArrayHolder);
            data.setConfig(currentCityArrayHolder, 
                $("#ant_priority_heuristic").val(),
                $("#ant_priority_pheromone").val(),
                $("#ant_colony_scale").val(),
                $("#ant_density_pheromone").val(),
                $("#pheromone_evaporation").val()
             );
            proxy.abort();
            proxy = new antprobe.AntsProxy();
            proxy.onload(data);
            proxy.view = layer;
            proxy._viewFunc = drawLinesToStage;
            console.log("[apply settings.]");
        };
        $("#apply").click(applyOnClick);
    };
    game.start();
};


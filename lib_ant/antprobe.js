/*
 * antprobe
 *
 */
var DIR = "./lib_ant/"; //relation from .html
var debugMode = false;
var ANT_COLONY_SCALE = 50;
var ANT_PRIORITY_PHEROMONE = 4;
var ANT_PRIORITY_HEURISTIC = 4;
var PHEROMONE_EVAPORATION = 0.6;
var ANT_PAINT_DENSITY = 1;
var HEURISTIC_SCALE = 5;
var INTERVAL_TIME = 10; //use to control computing speed.
var antprobe = (function(){
        var AntsProxy = function(){
            this.worker = null; //::AntEntity
            this.antsEntity = null;  //:: AntEntity //when cannot use worker
            this.enable_worker = null;  //::bool
            this.is_working =null; //::bool
            this.stepCount = null; //::[Int]
        };
        var AntsEntity = function(){
            this.count = 0; //:: Int    //ant world clock
            this.ants = null;   //::[Ant]
            this.cityList = null;   //::[{x:float,y:float}]
            this.cityDistance = null;   //[[int]]
            this.cityDistanceHeuristic = null; //inverse of cityDistance
            this.pheromoneMap = null;   //[int]]
            this.antPaintingDensity = null; //[int]
            this.evaporation = null; //::float 蒸発係数
        };
        var AntConfiguration = function(){
            this.cityList = null;
            this.ant_priority_heuristic = null;
            this.ant_priority_pheromone = null;
            this.ant_colony_scale = null;
            this.antPaintingDensity = null;
            this.pheromone_evaporation = null;
        };
        var Ant = function(pherom, dist){
            this.isActive = null;   //::bool
            this.isRepat = true;   //:bool
            this.priority_pheromone = pherom;   //::float   //compare with desirabillity
            this.priority_heuristic = dist; //::float
            this.startCityId = null;
            this.untrailedCityList = null;  //::[bool] if trailed, true
            this.cityValues = null; //::[int]   //user choise nextCity
            this.currentCity = null;    //::[int]
            this.nextCity = null;
            this.trailedCityStack = null;// [int] CityId ordList 
            this.parentEntity = null;
            this.cityDistance = null;   //get from antEntity when onload.
        };

/*
 * Proxyのメソッド
 */
        /*
         * 設定パラメータを変更する
         *
         * @param
         * 設定オブジェクト
         */
        AntsProxy.prototype.configure = function(ant_configuration){
            if(this.enable_worker && this.worker){
                this.sendMessage("configure", ant_configuration);
            }
        };

        /*
         * 停止状態の場合実行状態に遷移させる
         */
        AntsProxy.prototype.start = function(){
            if(!this.is_working){
                this.sendMessage("calcNext");
            }
            this.is_working = true;
        };

        /*
         * 実行状態の場合停止状態に遷移させる
         * 停止は逐次実行を現段階で止めることで行われ、処理は即座に停止しない
         */
        AntsProxy.prototype.stop = function(){
            this.is_working = false;
        };

        /*
         * Entityの状態を破棄して新しい初期化状態を作る
         */
        AntsProxy.prototype.reset = function(){
            this.stepCount = 0;
            this.sendMessage("reset");
            console.log("reset");
        };

        /*
         * Entityのスレッドを停止して破棄する
         */
        AntsProxy.prototype.abort = function(){
            if(this.is_Working === true){
                this.is_Working = false;
            }
            //if worker_enable
            this.worker.terminate();
            console.log("[proxy]suceess to abort worker.");
//            this.sendMessage("close");
        };


        /*
         * プロキシが持つイベント発行メソッド。
         * 対象はworker。
         */
        AntsProxy.prototype.sendMessage = function(type, param){
            if(typeof param !== "undefined"){
                this.worker.postMessage({
                    type: type,
                    param: param
                });
            }else{
                this.worker.postMessage({
                    type: type
                });
            }
        };

        /*
         * プロキシが外部から書かれるView更新メソッド。
         */
        AntsProxy.prototype.viewFunc = function(vl, data){
            this._viewFunc(vl, data);
        };

        /*
         * プロキシが持つビュー更新メソッド。
         *
         * @param
         * 都市要素同士のフェロモンマッピング
         */
        AntsProxy.prototype.updateView = function(data){
            if(this.view !== undefined){
                this.viewFunc(this.view, data);
            }
            this.stepCount += 1;
            if(this.is_working){
                var that = this;
                (function(){
                    window.setTimeout(function(){that.sendMessage("calcNext");}, INTERVAL_TIME);
                })(that);
            }
        };

        /*
         * AntsProxy生成時の設定
         * Workerの生成とイベントリスナを生成する
         */
        AntsProxy.prototype.onload = function(data){
            this.is_working = false;
 //           var cityList = data.cityList;
            //workerの生成
            if(window.Worker){
                this.stepCount = 0;
                logd("success create worker");
                this.worker = new Worker(DIR + "worker.js");
                var that = this;

                //プロキシが「受信」するメッセージのイベントリスナ
                this.worker.addEventListener("message", function(e){
                    var data = e.data;
                    if(!data.type){
                        throw "data.type no there !: " * data.type;
                    }
                    switch(data.type){
                        //新しい状態を送信する
                    case "updateState":
                        var dat = data.param;
                        that.updateView(dat);
                        break;
                    case "resetDone":
                        var da = data.param;
                        that.viewFunc(that.view, da);
                        break;
                    case "closeDone":
                        that.worker = null;
                        //コンソールログを表示
                        break;
                    case "logd":
                        logd(data.param);
                        break;
                    case "logt":
                        logt(data.param);
                        break;
                    default:
                        console.log("[AntProxy]unknown event type: " + data.type);
                    }
                });
//                this.sendMessage("onload", cityList);
                this.sendMessage("onload", data);
            }else{
                console.log("your browser is cannnot use worker.");
            }
        };
/*
 * ------------------------------------------------------------
 */

/*
 *AntsEntityの各種メソッド
 *
 */

        /*
         * AntsEntityのインスタンス生成後に呼ぶ
         */
        AntsEntity.prototype.onload = function(data){
            sendMessage("logd", data);

            this.cityList = data.cityList;
            this.evaporation = data.pheromone_evaporation;
            this.antPaintingDensity = data.antPaintingDensity;

            this.calcCityDistance();

            this.resetPheromoneMap();

            //generate ants.
            sendMessage("logd", "ANT_COLONY_SCALE IS " + data.ant_colony_scale);
            this.ants = new Array(data.ant_colony_scale);
            for(var i=0;i<data.ant_colony_scale;i++){
                this.ants[i] = new Ant(data.ant_priority_pheromone, 
                        data.ant_priority_heuristic);
                this.ants[i].onload(this, i % this.cityList.length);
                //Antのスタート地点は個体ごとに異なる
            }
        };
        /*
         * 実体の初期化
         */
        AntsEntity.prototype.reset = function(){
            this.resetPheromoneMap();
            this.calcCityDistance();
        };

        /*
         * メンバーのcityListから都市間距離マッピングを作る
         */
        AntsEntity.prototype.calcCityDistance = function(){
            this.cityDistance = [];
            this.cityDistanceHeuristic = [];
            var l = this.cityList.length;
            for(var i=0;i<l;i++){
                this.cityDistance[i] = [];
                this.cityDistanceHeuristic[i] = [];
                for(var j=0;j<l;j++){
                    if(i === j){
                        this.cityDistance[i][j] = 0;
                        this.cityDistanceHeuristic[i][j] = 0;
                    }else{
                        this.cityDistance[i][j] = 
                            getDistance(this.cityList[i], this.cityList[j]);
                        this.cityDistanceHeuristic[i][j] = 1/this.cityDistance[i][j];
                    }
                }
            }
            sendMessage("logd", "[Entity]calc DistanceMap success");
        };

        /*
         * フェロモンマップの初期化
         */
        AntsEntity.prototype.resetPheromoneMap = function(){
            this.pheromoneMap = [];
            var l = this.cityList.length;
            for(var i=0;i<l;i++){
                this.pheromoneMap[i] = [];
                for(var j=0;j<l;j++){
                    this.pheromoneMap[i][j] = 0.1;    //default pheromone.
                }
            }
            sendMessage("logd", "[Entity]reset PheromoneMap success " + this.pheromoneMap[0][0]);
        };

        /*
         * workerで行いたい計算
         *
         * 計算の実体としてはここに個々のアリの評価値生成やジェネレーション遷移が含まれる
         */
        AntsEntity.prototype.calc = function(){
            //Ant群の次のターゲット都市の決定
            //移動の実行とフェロモン塗布状況の更新、アリの未踏都市リストの更新
            sendMessage("logd", "calc...");
            /*
             * 経路の逐次処理の誤解があったためアルゴリズムの変更
            var l = this.ants.length;
            //次の都市の決定
            for(var i=0;i<l;i++){
                this.ants[i].evalCityProb();
            };
            // フェロモン揮発処理
            this.calcVoltilize();

            // アリの選んだ都市に応じて経路にフェロモン塗布
            this.paintPheromone();
            
            // アリを次の都市へ移動
            for(var i=0;i<l;i++){
                this.ants[i].moveToNextCity();
            };
            */
            //アルゴリズム通りの処理に変更（できればこの部分はフラグで切り替えるように残したい）
            var al = this.ants.length;
            var cl = this.cityList.length;
            //各アリごとに一周する経路を作成する
            for(var i=0;i<al;i++){
                for(var j=0;j<cl;j++){
                    //確率分布の生成、移動
                    this.ants[i].evalCityProb();
                    this.ants[i].trailedCityStack.push(this.ants[i].nextCity);
                    this.ants[i].moveToNextCity();
                }
                sendMessage("logd", "[Entity.calc] this.ants["+i+"].trailedCityStack , " + this.ants[i].trailedCityStack);
                this.consumeUntrailedCityStack();
            }
            this.calcVoltilize();

            var arr = [];
            for(var i=0;i<this.pheromoneMap.length;i++){
                arr[i] = [];
                arr[i] = this.pheromoneMap[i];
            }
//            sendMessage("logt", arr);
            sendMessage("updateState",arr);
        };
        
        /*
         * フェロモンの揮発処理
         */
        AntsEntity.prototype.calcVoltilize = function(){
            var l = this.pheromoneMap.length;
            for(var i=0;i<l;i++){
                var m = this.pheromoneMap[i].length;
                for(var j=0;j<m;j++){
                    this.pheromoneMap[i][j] = this.pheromoneMap[i][j] * this.evaporation;
                    this.pheromoneMap[i][j] = Math.round(this.pheromoneMap[i][j]*100) / 100;
                }
            }
        };

        /*
         * 保持している全てのアリの今いる都市と向かう予定の都市の値から経路の評価を行う
         * (都市ごとにフェロモンを撒くアルゴリズムでのみ使う)
         */
        AntsEntity.prototype.paintPheromone = function(){
            var l = this.ants.length;
            for (var i=0;i<l;i++){
                var m = this.ants[i].currentCity;
                var n = this.ants[i].nextCity;

                this.pheromoneMap[m][n] += this.antPaintingDensity/(this.cityDistance[m][n]);
            }
        };
        /*
         * 保持している全てのアリの巡回順リストを読み込んで、その経路に距離の逆数量フェロモンを撒く
         * (一週ごとにフェロモンを撒くアルゴリズムでのみ処理する)
         */
        AntsEntity.prototype.consumeUntrailedCityStack = function(){
            var al = this.ants.length;
            var cl = this.cityList.length;
            for(var i=0;i<al;i++){
                sendMessage("logd", "[consumeUntrailedCityStack]this.ants["+i+"].trailedCityStack, "+this.ants[i].trailedCityStack);
                //各アリに対して移動距離合計を取る
                var cl = this.ants[i].trailedCityStack.length;
                var dist = 0;
                for(var j=0;j<cl;j++){
                    var x1=0, x2=0;
                    //x1, x2は今からフェロモンを撒く都市のidの組
                    if(j === 0){
                        x1 = this.ants[i].trailedCityStack[cl-1];
                        x2 = this.ants[i].trailedCityStack[j];
                    }else{
                        x1 = this.ants[i].trailedCityStack[j-1];
                        x2 = this.ants[i].trailedCityStack[j];
                    }
                    dist += getDistance(this.cityList[x1], this.cityList[x2]);
                    sendMessage("logd", ""+ x1 +", "+x2);
                }
                sendMessage("logd", "dist(sum)= "+dist);
                //経路にぞれぞれフェロモンを均一に撒いていく
                for(var k=0;k<cl;k++){
                    var x1=0, x2=0;
                    if(k === 0){
                        x1 = this.ants[i].trailedCityStack[cl-1];
                        x2 = this.ants[i].trailedCityStack[k];
                    }else{
                        x1 = this.ants[i].trailedCityStack[k-1];
                        x2 = this.ants[i].trailedCityStack[k];
                    }
                    this.pheromoneMap[x1][x2] += this.antPaintingDensity/dist*HEURISTIC_SCALE;
                    sendMessage("logd", "PheromoneMap["+x1+"]["+x2+"] = " + this.pheromoneMap[x1][x2]);
                }
                this.ants[i].trailedCityStack = [];
            }
        };

/*
 * ------------------------------------------------------------
 */

/*
 * Antのメソッド
 * influence of dist or pheromone is defined in constractor.
 */
        /*
         * 起動時のメソッド
         */
        Ant.prototype.onload = function(antEntityInstance, startCityNum){
            this.isActive = true;
            this.parentEntity = antEntityInstance;

            this.startCityId = startCityNum;
            this.cityValues = [];

            var l = antEntityInstance.cityList.length;
            this.untrailedCityList = [];
            for(var i=0;i<l;i++){
                this.untrailedCityList[i] = false;
            }
            sendMessage("logd", "[Ant.onload]cityList length is "+ l);

            this.currentCity = startCityNum;   //always, start from 0 city.
            this.untrailedCityList[0] = true;
            this.trailedCityStack = [];
        };

        /*
         * 未踏都市の評価値の計算
         */
        Ant.prototype.evalCityProb = function(){
            if(this.isActive === true){
                var l = this.parentEntity.cityList.length;
                for(var i=0;i<l;i++){
                    if(this.currentCity === i || this.untrailedCityList[i] === true){
                        this.cityValues[i] = 0;
                    }else if(this.untrailedCityList[i] === false){
                        //具体的なPの計算
                        this.cityValues[i] = 
                            Math.pow(this.parentEntity.pheromoneMap[this.currentCity][i], this.priority_pheromone) *
                            Math.pow(this.parentEntity.cityDistanceHeuristic[this.currentCity][i], this.priority_heuristic);
                    }
                }
                sendMessage("logd", this.cityValues);
                //この時点で、このAntのPは計算を終えている
                this.nextCity = choiceFromProb(this.cityValues);
                if(this.nextCity === undefined){
                    this.nextCity = this.startCityId;
                }
                sendMessage("logd", "[Ant.evalCityProb]choose "+ this.nextCity);
            }
        };
        Ant.prototype.moveToNextCity = function(){
            if(this.isActive === true){
                this.untrailedCityList[this.currentCity] = true; //double check
                //次の都市が代入されていないかスタート都市と同じのとき
                if(this.nextCity === null || this.nextCity === undefined || this.nextCity === this.startCityId){
                    if(this.isRepat === false){
                        //繰り返さないとき
                        this.isActive = false;
                        sendMessage("logd", "change noActive");
                    }else{
                        sendMessage("logd", "ant is goaled.try next");
                        //連続して探索するとき
                        var l = this.untrailedCityList.length;
                        for(var i=0;i<l;i++){
                            this.untrailedCityList[i] = false;
                        }
                        this.currentCity = this.startCityId;
                        this.nextCity = null;
                    }
                }else{
                    this.untrailedCityList[this.nextCity] = true;
                    this.currentCity = this.nextCity;
                    this.nextCity = null;
                }
            }
        };

/*
 * ------------------------------------------------------------
 */

/*
 *AntConfigurationの各種メソッド
 */
        AntConfiguration.prototype.setCityArray = function(cityArray){
            this.cityList =  cityArray;
        };
        AntConfiguration.prototype.setHeuristic = function(heuristic){
            this.ant_priority_heuristic = heuristic;
        };
        AntConfiguration.prototype.setPheromone = function(pheromone){
            this.ant_priority_pheromone =  pheromone;
        };
        AntConfiguration.prototype.setColonyScale = function(colonyScale){
            this.ant_colony_scale = colonyScale;
        };
        AntConfiguration.prototype.setPaintDensity = function(paintDensity){
            this.antPaintingDensity = paintDensity;
        };
        AntConfiguration.prototype.setEvaporationSpeed = function(evaporationSpeed){
            this.pheromone_evaporation = evaporationSpeed;
        };

        AntConfiguration.prototype.setConfig = function(cityArray, heuristic, pheromone, colonyScale, paintDensity, evaporationSpeed){
            if(cityArray === undefined){
                return {};
            }
            if(heuristic === undefined){
                heuristic = ANT_PRIORITY_HEURISTIC;
            }
            if(pheromone === undefined){
                pheromone = ANT_PRIORITY_PHEROMONE;
            }
            if(colonyScale === undefined){
                colonyScale = ANT_COLONY_SCALE;
            }
            if(paintDensity === undefined){
                paintDensity = ANT_PAINT_DENSITY;
            }
            if(evaporationSpeed === undefined){
                evaporationSpeed = PHEROMONE_EVAPORATION;
            }
            this.setCityArray(cityArray);
            this.setHeuristic(heuristic);
            this.setPheromone(pheromone);
            this.setColonyScale(colonyScale);
            this.setPaintDensity(paintDensity);
            this.setEvaporationSpeed(evaporationSpeed);
        };

/*
 * antprobeが提供するコンストラクタを返す
 */
        return {
            AntsProxy: AntsProxy,
            AntsEntity: AntsEntity,
            AntConfiguration: AntConfiguration
        };
    }
)();

//=================================================
// Util functions
//=================================================

//debug
var logd = function(data){
    if(debugMode === true){
        console.log(data);
    }
};
var logt = function(data){
    if(debugMode === true){
        console.table(data);
    }
};
var getDistance = function(c1, c2){
    var d = Math.sqrt(Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y));
    return d;
};
var choiceFromProb = function(array){
    var sum = 0;
    var l = array.length;
    for(var i=0;i<l;i++){
        sum += array[i];
    }
    var temp = Math.random() * sum;
    for(var i=0;i<l;i++){
        temp -= array[i];
        if(temp < 0){
            // sendMessage("logd", "[util]choiceFromProb. l="+l+". sum="+sum+".temp="+temp);
            // sendMessage("logd", "array is this");
            // sendMessage("logd", array);
            return i;
        }
    }
    // sendMessage("logd", "[util]bad calculation in choiceFromProb. l="+l+". sum="+sum+".temp="+temp);
    // sendMessage("logd", array);
    return undefined;
};
var createRandomCity = function(n, width, height){
    var city_array = [];
    for(var i=0;i<n;i++){
        city_array[i] = {
            x:Math.round(Math.random()*width),
            y:Math.round(Math.random()*height)
        };
    }
    return city_array;
};


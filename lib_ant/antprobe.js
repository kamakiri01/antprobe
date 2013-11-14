/*
 * antprobe
 *
 */
var DIR = "./lib_ant/"; //relation from .html
var debugMode = false; //output status to console
var ANT_COLONY_SCALE = 50; //default computation scale
var ANT_PRIORITY_PHEROMONE = 4; //criterion of heuristic
var ANT_PRIORITY_HEURISTIC = 4; //criterion of weiht 
var PHEROMONE_EVAPORATION = 0.6; //disappearance speed of weited routes
var ANT_PAINT_DENSITY = 1; //influence of one ant
var HEURISTIC_SCALE = 5; //adujust heuristic effect 
var INTERVAL_TIME = 10; //use to control computing speed.
var antprobe = (function(){
    /*
     * メインスレッド側で動作するインターフェイス
     * Worker側に置かれるAntEntityとの通信プロキシ
     * @constructor
     */
        var AntsProxy = function(){
            /*
             * Workerインスタンスを格納
             * @type {AntEntity}
             */
            this.worker = null;
            /*
             * 実行環境のWebWorker有効性
             * @type {bool}
             */
            this.enable_worker = null;
            /*
             * AntEntityの実行状態
             * @type {bool}
             */
            this.is_working =null;
            /*
             * AntEntityのクロック
             * @type {Number}
             */
            this.stepCount = null;
        };
        /*
         * Workerスレッド側で動作する計算の実体クラス
         * psotMessageでAntProxyと通信
         * @constructor
         */
        var AntsEntity = function(){
            /*
             * 各々の経路を辿るAntを格納する配列
             * @type {Ant[]}
             */
            this.ants = null;
            /*
             * 都市配列
             * @type {Object[]}
             */
            this.cityList = null;
            /*
             * 各都市間の距離テーブル
             * @type {Number[][]}
             */
            this.cityDistance = null;
            /*
             * 各都市間の距離による重みづけ
             * 距離の逆数で行われる
             * @type {Number[][]}
             */
            this.cityDistanceHeuristic = null;
            /*
             * 各都市間のフェロモン塗布状態
             * @type {Number[][]}
             */
            this.pheromoneMap = null;
            /*
             * 一匹のAntが一度に塗布するフェロモン量
             * @type {Number}
             */
            this.antPaintingDensity = null;
            /*
             * フェロモンの1クロックあたりの蒸発係数
             * @type {Number}
             */
            this.evaporation = null;
        };
        /*
         * AntEntity作成時に使う設定パラメータフォーマット
         * @constructor 
         */
        var AntConfiguration = function(){
            /*
             * 適用する都市配列
             * @type {Object[][]}
             */
            this.cityList = null;
            /*
             * 適用する都市間の重みづけ
             * @type {Number}
             */
            this.ant_priority_heuristic = null;
            /*
             * 適用するフェロモンの重みづけ
             */
            this.ant_priority_pheromone = null;
            /*
             * 経路探索させるAntの数
             * @type {Number}
             */
            this.ant_colony_scale = null;
            /*
             * 一匹のAntが一度に塗布するフェロモン量
             * @type {Number}
             */
            this.antPaintingDensity = null;
            /*
             * 適用するフェロモン揮発係数
             */
            this.pheromone_evaporation = null;
        };
        /*
         * 経路探索するアリのクラス
         * @param {Number} pherom 経路に塗布されたフェロモンの評価度合い
         * @param {Number} dist 都市間の距離の評価度合い
         * @constructor
         */
        var Ant = function(pherom, dist){
            /*
             * Antが経路探索状態であるか
             * @type {Bool}
             */
            this.isActive = null; 
            /*
             * 複数回経路探索を行うか
             * @type {Bool}
             */
            this.isRepat = true; 
            /*
             * フェロモン評価の重みづけ
             * @type {Number}
             */
            this.priority_pheromone = pherom; 
            /*
             * 経路評価の重みづけ
             * @type {Number}
             */
            this.priority_heuristic = dist; 
            /*
             * 起点の都市番号
             * @type {Number}
             */
            this.startCityId = null;
            /*
             * 未踏の都市配列
             * @type {Number[]}
             */
            this.untrailedCityList = null;
            /*
             * 経路決定時の未踏都市の評価値配列
             * @type {Number[]}
             */
            this.cityValues = null;
            /*
             * 現在いる都市番号
             * 最新の探索済み都市番号
             * @type {Number}
             */
            this.currentCity = null;
            /*
             * 次に訪れる都市番号
             * @type {Number}
             */
            this.nextCity = null;
            /*
             * 探索済み都市配列
             * @type {Number[]}
             */
            this.trailedCityStack = null;
            /*
             * 自身を管理するAntEntityへの参照
             * @type {AntEntity}
             */
            this.parentEntity = null;
        };
/*
 * AntProxyのメソッド
 */
        /*
         * 設定パラメータを変更する
         * @param {AntConfiguration} ant_configuration 設定オブジェクト
         */
        AntsProxy.prototype.configure = function(ant_configuration){
            if(this.enable_worker && this.worker){
                this.sendMessage("configure", ant_configuration);
            }
        };

        /*
         * AntProxyが停止状態の場合、実行状態に遷移させる
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
         * AntEntityにメッセージを送る
         * @param {String} type メッセージの種類(必須)
         * @param {String} param メッセージの中身(任意)
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
         * Viewモデルから書かれるView更新メソッド_viewFuncの呼び出しラッパーメソッド。
         * @param {view} vl 描画先オブジェクト
         * @param {Number[][]} data  描画データ 
         */
        AntsProxy.prototype.viewFunc = function(vl, data){
            this._viewFunc(vl, data);
        };
        /*
         * プロキシが持つビュー更新メソッド。
         * 描画と次の探索フェーズの呼び出しを行う。
         * @param {Number[][]} data 描画データ
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
         * @param {Object} configData 設定パラメータ
         */
        AntsProxy.prototype.onload = function(configData){
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
                this.sendMessage("onload", configData);
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
         * AntsEntityのインスタンス生成後に呼ぶ初期化メソッド
         * @param {Object} configData 設定パラメータ
         */
        AntsEntity.prototype.onload = function(configData){
            sendMessage("logd", configData);
            this.cityList = configData.cityList;
            this.evaporation = configData.pheromone_evaporation;
            this.antPaintingDensity = configData.antPaintingDensity;
            this.calcCityDistance();
            this.resetPheromoneMap();
            sendMessage("logd", "ANT_COLONY_SCALE IS " + configData.ant_colony_scale);
            //generate ants.
            this.ants = new Array(configData.ant_colony_scale);
            for(var i=0;i<configData.ant_colony_scale;i++){
                this.ants[i] = new Ant(configData.ant_priority_pheromone, 
                        configData.ant_priority_heuristic);
                this.ants[i].onload(this, i % this.cityList.length);
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
         * 巡回経路の作成
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
         * (一都市探索ごとにフェロモンを撒くアルゴリズムでのみ使う)
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
         * (一巡ごとにフェロモンを撒くアルゴリズムでのみ処理する)
         */
        AntsEntity.prototype.consumeUntrailedCityStack = function(){
            var al = this.ants.length;
            // var cl = this.cityList.length;
            for(var i=0;i<al;i++){
                sendMessage("logd", "[consumeUntrailedCityStack]this.ants["+i+"].trailedCityStack, "+this.ants[i].trailedCityStack);
                //各アリに対して移動距離合計を取る
                var cl = this.ants[i].trailedCityStack.length;
                var dist = 0;
                for(var j=0;j<cl;j++){
                    var w1=0, w2=0;
                    //w1, w2は今からフェロモンを撒く都市のidの組
                    if(j === 0){
                        w1 = this.ants[i].trailedCityStack[cl-1];
                        w2 = this.ants[i].trailedCityStack[j];
                    }else{
                        w1 = this.ants[i].trailedCityStack[j-1];
                        w2 = this.ants[i].trailedCityStack[j];
                    }
                    dist += getDistance(this.cityList[w1], this.cityList[w2]);
                    sendMessage("logd", ""+ w1 +", "+w2);
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
         * Antインスタンス初期化メソッド
         * @param {AntEntity} antEntityInstance 生成元のAntEntity
         * @param {Number} startCityNum 探索を開始する起点の都市番号 
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
                if(this.nextCity == null || this.nextCity === undefined || this.nextCity == this.startCityId){
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
        /*
         * 都市配列を設定する
         * @param {Object[]} cityArray 都市配列
         */
        AntConfiguration.prototype.setCityArray = function(cityArray){
            this.cityList =  cityArray;
        };
        /*
         * 都市間重みづけの評価係数を設定する
         * @param {Number} heuristic 都市間重みづけの評価値
         */
        AntConfiguration.prototype.setHeuristic = function(heuristic){
            this.ant_priority_heuristic = heuristic;
        };
        /*
         * フェロモンによる重みづけの評価係数を設定する
         * @param {Number} pheromone フェロモンの評価値
         */
        AntConfiguration.prototype.setPheromone = function(pheromone){
            this.ant_priority_pheromone =  pheromone;
        };
        /*
         * 生成するAntの数を設定する
         * @param {Number} colonyScale Antの数
         */
        AntConfiguration.prototype.setColonyScale = function(colonyScale){
            this.ant_colony_scale = colonyScale;
        };
        /*
         * 一匹が一度に塗布するフェロモン量を設定する
         * @param {Number} paintDensity 塗布量の基準値
         */
        AntConfiguration.prototype.setPaintDensity = function(paintDensity){
            this.antPaintingDensity = paintDensity;
        };
        /*
         * フェロモンの揮発速度を設定する
         * @param {Number} evaporationSpeed 揮発係数
         */
        AntConfiguration.prototype.setEvaporationSpeed = function(evaporationSpeed){
            this.pheromone_evaporation = evaporationSpeed;
        };
        /*
         * 一括設定
         * @param {Object[]} cityArray 都市配列
         * @param {Number} heuristic 都市間重みづけの評価値
         * @param {Number} pheromone フェロモンの評価値
         * @param {Number} colonyScale Antの数
         * @param {Number} paintDensity 塗布量の基準値
         * @param {Number} evaporationSpeed 揮発係数
         */
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
/*
 * デバッグモード時にコンソール出力する
 * @param {string} 出力内容
 */
var logd = function(data){
    if(debugMode === true){
        console.log(data);
    }
};
/*
 * デバッグモード時に二次元配列をコンソール出力する
 * @param {String[][]} 出力内容
 */
var logt = function(data){
    if(debugMode === true){
        console.table(data);
    }
};
/*
 * 二点間の距離を取得
 * @param {Object} c1 点1
 * @param {Object} c2 点2
 * @return {Number} 距離の値
 */
var getDistance = function(c1, c2){
    var d = Math.sqrt(Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y));
    return d;
};
/*
 * 確率分布の配列から確率に従って一つを選び、番号を返す
 * @param {Array.<>} array 確率分布配列
 * @return {Number} 選択した番号
 */
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
/*
 * 無作為に都市データを生成する
 * @param {Number} n 生成する都市の数
 * @param {Number} width 幅の上限
 * @param {Number} height 高さの上限
 * @return {Object[]} city_array 都市配列
 */
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


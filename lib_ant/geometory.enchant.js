/*
 * 円描画クラス
 *
 */
var Circle = enchant.Class.create(enchant.Sprite, {
    initialize: function(rad, color){
        enchant.Sprite.call(this, rad*2, rad*2);
        var sf = new Surface(rad*2, rad*2);
        this.image = sf;
        this.sCtx = sf.context;
        if(color === undefined){
            color = 'rgba(192, 192, 192, 1)';
        }
        this.drawColor = color;
        this.reflesh(rad);
    },
    reflesh: function(rad){
        this.sCtx.beginPath();
        this.sCtx.clearRect(0,0,rad*2, rad*2);
        this.sCtx.strokeStyle = this.drawColor;
        this.sCtx.beginPath();
        this.sCtx.arc(rad, rad, rad, 0, Math.PI*2, true);
        this.sCtx.arc(rad, rad, rad-1, 0, Math.PI*2, false);
        this.sCtx.fill();
        this.sCtx.closePath();
        this.sCtx.stroke();
    }
});

var Triangle = enchant.Class.create(enchant.Sprite, {
    initialize: function(side, color){
        enchant.Sprite.call(this, 
            side/Math.cos(Math.PI/6), 
            side/Math.cos(Math.PI/6));
        var tl = side/Math.cos(Math.PI/6);
        var sf = new Surface(tl,tl);
        this.image = sf;
        this.sCtx = sf.context;
        if(color === undefined){
            color = 'rgba(192, 192, 192, 1)';
        }
        this.drawColor = color;
        this.reflesh(tl);
    },
    reflesh: function(rad){
    }
});

var LineLayer = enchant.Class.create(enchant.Sprite, {
    initialize: function(){
        enchant.Sprite.call(this, 
            enchant.Core.instance.width, 
            enchant.Core.instance.height);  
        var width = enchant.Core.instance.width;
        var height = enchant.Core.instance.height;  
        this.image = new Surface(width, height); 
        this.compositeOperation = 'lighter';
        var that = this;
    },
    areaWipe: function(){
        var sCtx = this.image.context;
        sCtx.clearRect(0,0,enchant.Core.instance.width, 
            enchant.Core.instance.height);
    }
});

//ラインの描画メソッド
var drawLine = function(e0, e1, param){
    if(e0.type !== e1.type){return;}
    var sCtx = LineLayer.collection[0].image.context;
    sCtx.beginPath();
    if(e0.isCapture === true && e1.isCapture){
        sCtx.lineWidth = 3;
    }else{
        sCtx.lineWidth = 1;
    }

    var dx = e1.x - e0.x;
    var dy = e1.y - e0.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    //距離に応じた透過率でラインの描画を行う
    if(dist!== 0 && e0.type == e1.type){
        var strokeCol = param*5;
        var strokeColor = 'rgba(192, 80, 77, ';
        //タイプで色分け
        if(e0.type == 1){
            strokeColor = 'rgba(80, 192, 77, ';
        }
        sCtx.strokeStyle = strokeColor + strokeCol+')';        
        sCtx.moveTo(e0.x + e0.width/2, e0.y + e0.height/2);
        sCtx.lineTo(e1.x + e1.width/2, e1.y + e1.height/2);
        sCtx.stroke();
    }
};

class YTPlayer extends ELEM{
    ready = false;
    player = null;
    playerState = -2;
    static isAPIReady = false;
    static APIResolvers = [];
    constructor(width=560,height=315){
        //div is the wrapper of the iframe
        super("div","class:yt-wrapper",0,"position:relative;");
        let that = this;
        this.id = Math.floor(Math.random()*10000000000000000).toString(36);
        //the aspect ratio at this point doesn't matter, it can be tweaked by css
        //<iframe width="560" height="315" src="https://www.youtube.com/embed/RWbnNr-NM3A" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        //src:https_://www.youtube.com/embed/RWbnNr-NM3A;
        this.iframe = this.add(
            "iframe",
            `
            width:${width};
            height:${height};
            title:YouTube video player;
            frameborder:0;
            allowfullscreen:;
            allow:accelerometer_; autoplay_; clipboard-write_; encrypted-media_; gyroscope_; picture-in-picture;
            id:${this.id};
            enablejsapi:true;
            `,0,
            `width:100%;
            height:100%;`
        );
        let bus = new Events();
        this.on = bus.on.bind(bus);
        this.emit = bus.emit.bind(bus);
        
        let reqid;
        this.playing = false;
        this.on("play",()=>{
            that.playing = true;
            console.log("playing");
        });
        ["pause","end"].map(e=>that.on(e,()=>{
            that.playing = false;
            console.log("pausing");
            this.emit("timechange",that.player.getCurrentTime());
        }));
        this.on("ready",()=>{
            this.emit("timechange",that.player.getCurrentTime());
        });
        
        let animate = function(){
            if(that.playing)that.emit("timechange",that.player.getCurrentTime());
            window.requestAnimationFrame(animate);
        };
        window.requestAnimationFrame(animate);
    }
    async initialize(url){
        let that = this;
        let vid = this.parseURL(url);
        this.iframe.attr("src",`https://www.youtube.com/embed/${vid}?enablejsapi=1&rel=0`);
        await new Promise((res,rej)=>{
            //console.log(that.constructor.isAPIReady);
            if(that.constructor.isAPIReady){
                res();
            }else{
                that.constructor.APIResolvers.push(res);
            }
        });
        await new Promise((res,rej)=>{
            that.player = new YT.Player(this.id,{
                events:{
                    "onReady": res,
                    "onStateChange": (status)=>{
                        that.playerState = status;
                        //console.log("state changed: ",status);
                        switch(status.data){
                            case -1:
                            that.emit("unstart");
                            break;
                            case 0:
                            that.emit("end");
                            break;
                            case 1:
                            that.emit("play");
                            break;
                            case 2:
                            that.emit("pause");
                            break;
                            case 3:
                            that.emit("buffer");
                            break;
                            case 5:
                            that.emit("cue");
                            break;
                        }
                    }
                }
            });
        });
        //everything loaded
        console.log("everything loaded up");
        that.emit("ready");
        return this;
    }
    get rate(){
        return this.player.getPlaybackRate();
    }
    set rate(val){
        return this.player.setPlaybackRate();
    }
    get time(){
        return this.player.getCurrentTime();
    }
    set time(t){
        return this.player.seekTo(t,true);
    }
    get duration(){
        return this.player.getDuration();
    }
    parseURL(url){
        let regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        let match = url.match(regExp);
        return (match&&match[7].length==11)? match[7] : false;
    }
    togglePlay(){
        if(!this.player)return false;
        if(this.playing){
            this.player.pauseVideo();
        }else{
            this.player.playVideo();
        }
    }
};




//Warning: ugly global pollution below

//youtube's code will take this function
function onYouTubeIframeAPIReady(){
    YTPlayer.isAPIReady = true;
    console.log("ready");
    YTPlayer.APIResolvers.map(f=>f());
}

//global initialization
(function(){
    //inserting a script tag, as copied from https://developers.google.com/youtube/iframe_api_reference
    let tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();
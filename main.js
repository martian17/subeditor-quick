class TimestampInput extends ELEM {
    str = "0:00:00.000";
    constructor() {
        super("input", "type:text;class:tsinput");
        let that = this;
        this.e.value = this.str;
        let bus = new Events();
        this.on = bus.on.bind(bus);
        this.emit = bus.emit.bind(bus);
        super.on("input", () => {
            try {
                let str = that.e.value;
                let [time, err] = fromTimeStamp(str);
                if (err) {
                    return;
                }
                let tsstr = toTimeStamp(time);
                if (tsstr === that.str && time === that.time) {
                    return;
                }
                that.str = tsstr;
                //code below ensures the rounding up consistency
                time = fromTimeStamp(tsstr)[0];
                if (time === that.time) {
                    return;
                }
                //round up consistency code end
                that.time = time;
                that.emit("input", that.time, that.str);
            } catch (err) {
                //no commit on fail, so should be safe
                return;
            }
        });
        super.on("focusout", () => {
            that.e.value = that.str;
            let time = fromTimeStamp(that.str);
        });
        this.on("input", (time, str) => {
            console.log(time, str);
        });
    }
    setTime(t) { //float
        this.time = t;
        this.str = toTimeStamp(t);
        this.e.value = this.str;
        return this;
    }
};


class Upload extends DropArea {
    constructor(data) {
        super();
        this.data = data;
        this.on("file", (file) => {
            let str = file.toString();
            var reader = new FileReader();
            reader.onload = function(e) {
                data.loadSubtitle(e.target.result);
            };
            reader.readAsText(file);
            
        })
    }
};


class Download extends ELEM {
    constructor(data) {
        super("div", "class:download", "Download");
        this.on("click",()=>{
            let str = data.toString();
            console.log(str);
            downloadText("en.gen.sbv",str);
        });
    }
};


class SubEdit extends ELEM {
    constructor(sub,data) {
        super("div", "class:subedit", 0, `
        width:100%;
        height:100px;
        padding:0.3em;
        position:relative;
        overflow:hidden;
        `);
        let that = this;
        this.sub = sub;
        this.data = data;
        let text = this.add("textarea", 0, 0, `
        display:block;
        height:90px;
        width:70%;
        float:left;
        `);
        let right = this.add("div", 0, 0, `
        display:block;
        height:90px;
        width:20%;
        float:left;
        `);
        let st = right.add(new TimestampInput());
        let ed = right.add(new TimestampInput());
        this.text = text;
        this.st = st;
        this.ed = ed;


        st.on("input", (time, str) => {
            sub.start = time;
        });
        ed.on("input", (time, str) => {
            sub.end = time;
        });
        this.update();
        sub.on("change", () => {
            that.update();
        });
        
        text.on("input",()=>{
            sub.str = text.e.value;
        });


        text.on("keydown", (e) => {
            let data = this.data;
            if (e.key === "Backspace") {
                let pos = getCursorPos(text.e).end;
                console.log(pos);
                if (pos === 0 && sub.prev !== null) {
                    e.preventDefault();
                    //conjoin it with the previous one
                    let prev = sub.prev;
                    let end = sub.end;
                    let str = sub.str;
                    sub.remove();
                    prev.end = end;
                    prev.str = prev.str.trim() + " " + str.trim();
                    data.emit("subchange");
                }
            }
            let time = data.time;
            if (e.key === "Enter") {
                if (e.ctrlKey) {
                    //move the trailing potion to the next sub, and change the timestamps
                    e.preventDefault();
                    if (sub.next === null) {
                        return; //next DNE, can't do a thing
                    }
                    let next = sub.next;
                    if (next.start !== sub.end || time <= sub.start || sub.end <= time) {
                        return;
                    }
                    sub.end = time;
                    next.start = time;
                    let pos = getCursorPos(text.e).start;
                    let val = text.e.value;
                    let front = val.slice(0, pos);
                    let back = val.slice(pos).trim();
                    sub.str = front.trim();
                    if(back !== ""){
                        next.str = back.trim() + " " + next.str.trim();
                    }
                    next.emit("change");
                    sub.emit("change");
                    data.emit("subchange");
                } else if (e.shiftKey) {
                    //enter as usual
                    //do nothing
                } else {
                    e.preventDefault();
                    //make a new sub
                    if (time <= sub.start || sub.end <= time) {
                        return;
                    }
                    let pos = getCursorPos(text.e).start;
                    let val = text.e.value;
                    let front = val.slice(0, pos);
                    let back = val.slice(pos);
                    sub.split(time, front, back);
                    data.emit("subchange");
                }
            }

        });
        this.on("change");
    }
    update() {
        let sub = this.sub;
        let text = this.text;
        let st = this.st;
        let ed = this.ed;
        text.e.value = sub.str;
        st.setTime(sub.start);
        ed.setTime(sub.end);
    }
};

class Editor extends ELEM {
    constructor(data) {
        super("div", 0, 0, "overflow-y:hidden;position:relative;min-height:10px;");
        this.data = data;
        let that = this;
        data.on("subloaded", () => {
            //load the subtitle
            this.load();
        });
        data.on("timechange", () => {
            that.load();
        });
        data.on("subchange", () => {
            that.load();
        });
    }
    loaded = {};
    cache = {};
    load() {
        let data = this.data;
        let time = this.data.time;
        //look for the right sub
        let sub = data.getSub(time);
        if (!sub) {
            this.unloadAll();
            this.loaded = {};
            return;
        }
        let loaded = this.loaded;
        let sublist = sub.getAdjacents();
        let loadedflag = true;
        //check if they are already loaded
        for (let i = 0; i < sublist.length; i++) {
            let ssub = sublist[i];
            if (!(ssub.id in loaded)) loadedflag = false;
        }
        //console.log(loadedflag);
        //happily do nothing
        if (loadedflag) return false;
        this.unloadAll();
        let loaded1 = {};
        for (let i = 0; i < sublist.length; i++) {
            let ssub = sublist[i];
            loaded1[ssub.id] = ssub;
            this.loadSub(ssub);
        }
        this.loaded = loaded1;
    }
    loadSub(sub) {
        console.log("loading",sub);
        this.cache[sub.id] = this.add(new SubEdit(sub,this.data));
    }
    unloadSub(sub) {
        this.cache[sub.id].remove();
    }
    unloadAll() {
        let cache = this.cache;
        let loaded = this.loaded;
        for (let key in loaded) {
            this.unloadSub(loaded[key]);
        }
    }
};


class ViewWindow extends ELEM {
    constructor(data) {
        super("div");
        let player = this.add(new YTPlayer());
        player.initialize("https://www.youtube.com/watch?v=RWbnNr-NM3A");
        player.style("height:80vh;width:100%;");
        let input = this.add(new TimestampInput());
        player.on("timechange", (t) => {
            input.setTime(t);
            data.time = t;
            data.emit("timechange");
        });
        data.on("playsignal",()=>{
            player.togglePlay();
        });
        data.on("seek-relative",(sec)=>{
            let time = player.time+sec;
            player.player.seekTo(time);
        });
    }
};

let dddd;
let main = async function() {
    let data = new Data();
    window.addEventListener("keydown",(e)=>{
        if(e.shiftKey){
            if(e.key === " "){
                e.stopPropagation();
                e.preventDefault();
                data.emit("playsignal");
            }else if(e.key === "ArrowLeft"){
                data.emit("seek-relative",-1);
                data.emit("timechange");
            }else if(e.key === "ArrowRight"){
                data.emit("seek-relative",1);
                data.emit("timechange");
            }else if(e.key === "ArrowUp"){
                data.emit("seek-relative",-5);
                data.emit("timechange");
            }else if(e.key === "ArrowDown"){
                data.emit("seek-relative",5);
                data.emit("timechange");
            }
        }
    });
    dddd = data;

    let body = new ELEM(document.body);
    let [left, right] = newarr(2, i => body.add("div", 0, 0, "float:left;width:50%"));
    let topsec = right.add("div","class:topsec");
    topsec.add(new Upload(data));
    topsec.add(new Download(data));

    //editor section
    left.add(new Editor(data));

    right.add(new ViewWindow(data));
};

main();
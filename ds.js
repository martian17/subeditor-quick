class Data{
    bucket = [];
    time = 0;
    head = null;
    tail = null;
    constructor(){
        let bus = new Events();
        this.on = bus.on.bind(bus);
        this.emit = bus.emit.bind(bus);
    }
    loadSubtitle(str){
        this.bucket = [];
        let bucket = this.bucket;
        let arr = parseSbv(str);
        for(let i = 0; i < arr.length; i++){
            let sub = (new Sub(this)).hydrate(arr[i]);
            sub.loopMinutes((i)=>{
                if(!bucket[i])bucket[i] = {};
                bucket[i][sub.id] = sub;
            });
            arr[i] = sub;
        }
        for(let i = 0; i < arr.length-1; i++){
            let sub1 = arr[i];
            let sub2 = arr[i+1];
            sub1.next = sub2;
            sub2.prev = sub1;
        }
        this.head = arr[0];
        this.tail = arr[arr.length-1];
        this.emit("subloaded");
    }
    removeChild(sub){
        let bucket = this.bucket;
        sub.loopMinutes((i)=>{
            delete bucket[i][sub.id];
        });
        if(sub.prev)sub.prev.next = sub.next;
        if(sub.next)sub.next.prev = sub.prev;
        if(sub === this.head){
            this.head = sub.next;
        }
        if(sub === this.tail){
            this.tail = sub.prev;
        }
    }
    traverseFindSub(time,sub){
        if(time < sub.start){
            //go back
            while(sub !== null){
                let [s,e] = sub.domain;
                if(s <= time && time <= e){
                    return sub;
                }
                sub = sub.prev;
            }
        }else{
            //go front
            while(sub !== null){
                let [s,e] = sub.domain;
                if(s <= time && time <= e){
                    return sub;
                }
                sub = sub.next;
            }
        }
        //shouldn't happen
        return sub;
    }
    getSub(time){//get sub diring or after time
        let m = Math.floor(time/60);
        let bucket = this.bucket;
        for(let i = m; i < this.bucket.length; i++){
            let b = bucket[i];
            if(!isEmpty(b)){
                let sub0 = firstElem(b);
                //traverse from sub0 to find the closest match
                return this.traverseFindSub(time,sub0);
            }
        }
        return this.tail;
    }
    toArray(){
        let sub = this.head;
        console.log(sub);
        let arr = [];
        while(sub !== null){
            arr.push(sub);
            sub = sub.next;
        }
        return arr;
    }
    toString(){
        let arr = this.toArray();
        return arr.map(sub=>sub.toString()).join("\n\n");
    }
};


class Sub{
    prev = null;
    next = null;
    str = "";
    start = 0;
    end = 0;
    parent = null;
    time = 0;
    constructor(parent){
        this.parent = parent;
        this.id = ID();//double invocation, could be costly
        
        let bus = new Events();
        this.on = bus.on.bind(bus);
        this.emit = bus.emit.bind(bus);
    }
    hydrate(sub){
        for(let key in sub){
            this[key] = sub[key];
        }
        return this;
    }
    serialize(){
        let obj = {
            start:this.start,
            end:this.end,
            str:this.str,
            id:this.id
        };
        return obj;
    }
    get domain(){
        let start;
        if(this.prev === null){
            start = -Infinity;
        }else{
            start = this.prev.end;
        }
        let end = this.end;
        if(this.next === null)end = Infinity;
        return [start,end];
    }
    get smin(){
        return Math.floor(this.start/60);
    }
    get emin(){
        return Math.floor(this.end/60);
    }
    loopMinutes(cb){//loop through the minutes
        let s = this.smin;
        let e = this.emin;
        for(let i = s; i <= e; i++){
            cb(i);
        }
    }
    remove(){
        this.parent.removeChild(this);
        this.emit("remove");
    }
    
    getPrevs(n){
        let sub = this;
        let arr = [];
        while(sub){
            arr.push(sub);
            if(arr.length >= n)break;
            sub = sub.prev;
        }
        return arr;
    }
    getNexts(n){
        let sub = this;
        let arr = [];
        while(sub){
            arr.push(sub);
            if(arr.length >= n)break;
            sub = sub.next;
        }
        return arr;
    }
    toString(){
        let start = toTimeStamp(this.start);
        let end = toTimeStamp(this.end);
        return start+","+end+"\n"+this.str.trim();
    }
    
    getAdjacents(){
        if(!this.prev){
            return this.getNexts(3);
        }else if(!this.next){
            return this.getPrevs(3);
        }
        return this.prev.getNexts(3);
    }
    
    
    split(time,front,back){
        let ns = new Sub(this.parent);
        let next = this.next;
        this.next = ns;
        next.prev = ns;
        ns.next = next;
        ns.prev = this;
        this.str = front.trim();
        ns.str = back.trim();
        
        ns.start = time;
        ns.end = this.end;
        this.end = time;
        console.log(time,front,back);
        if(this.parent.tail === this){
            this.parent.tail = ns;
        }
        this.emit("change");
    }
};

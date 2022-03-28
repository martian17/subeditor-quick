let ELEM = (()=>{
    let attrParser = function(str){
        //escape ":" and ";"
        let attrs = [["",""]];
        let mode = 0;
        for(let i = 0; i < str.length; i++){
            let attr = attrs.pop();
            let char = str[i];
            if(char === "_"){//escape character
                attr[mode] += str[i+1];
                i++;
                attrs.push(attr);
            }else if(char === ":"){
                mode++;
                attrs.push(attr);
            }else if(char === ";"){
                mode = 0;
                attrs.push(attr);
                attrs.push(["",""]);
            }else{
                attr[mode] += str[i];
                attrs.push(attr);
            }
        }
        attrs = attrs.map(([an,av])=>[an.trim(),av.trim()]).filter((a)=>{
            if(a[0] === ""){
                return false;
            }
            return true;
        });
        return attrs;
    };


    let getELEM = function(nname,attrs,inner,style){
        if(nname instanceof ELEM){//it's an ELEM
            return nname;
        }else{
            
            return new this.Child_Constructor(nname,attrs,inner,style);
        }
    };



    class ELEM{
        nodeType = 1;
        parent = null;
        //exposing util functions
        static attrParser = attrParser;
        //for internal uses
        Child_Constructor = ELEM;
        attrParser = attrParser;
        getELEM = getELEM;
        constructor(nname,attrs,inner,style){
            this.children = new MapList();
            if(nname === "text"){
                this.e = document.createTextNode(attrs);
                this.nodeType = 3;//text node
                return;
            }else if(typeof nname === "string"){
                if(nname[0].match(/[a-z]/)){//is elem name
                    this.e = document.createElement(nname);
                }else{
                    this.e = document.querySelector(nname);
                }
                let e = this.e;
                if(attrs){
                    this.attrParser(attrs).map((a)=>{
                        e.setAttribute(a[0],a[1]);
                    });
                }
                if(inner){
                    this.setInner(inner);
                }
                if(style){
                    e.style = style;
                }
                this.e = e;
            //}else if(return element instanceof Element || element instanceof HTMLDocument){//if html element
            }else if(nname instanceof Node){
                if(nname.nodeType === 1){
                    this.e = nname;
                    let childNodes = nname.childNodes;
                    for(let i = 0; i < childNodes.length; i++){
                        let child = new this.Child_Constructor(childNodes[i]);
                        if(!child)continue;//child creation failed (unsupported node type)
                        child.parent = this;
                        this.children.push(child);
                    }
                }else if(nname.nodeType === 3){//text
                    this.e = nname;
                    this.nodeType = 3;
                }else{
                    return false;
                }
            }else{
                throw new Error("Unexpected input type "+nname);
            }

            /*
            //children getter/setter
            Object.defineProperties(this, {
                "children": {
                     "get": ()=>that.e.children,
                     "set": ()=>{}
                }
            });
            */
        }
        setInner(inner){
            //console.log(inner);
            this.children.clear();
            this.e.innerHTML = inner;
            let childNodes = this.e.childNodes;
            for(let i = 0; i < childNodes.length; i++){
                let child = new this.Child_Constructor(childNodes[i]);
                if(!child)continue;//child creation failed (unsupported node type)
                child.parent = this;
                this.children.push(child);
            }
        }
        push_back(){
            let elem = this.getELEM.apply(this,[...arguments]);
            //console.log(elem);
            elem.remove();
            elem.parent = this;
            this.children.push(elem);
            this.e.appendChild(elem.e);
            return elem;
        }
        pop_back(){
            let elem = this.children.getTail();
            elem.remove();
            return elem;
        }
        push_front(){
            let elem = this.getELEM.apply(this,[...arguments]);
            elem.remove();
            elem.parent = this;
            this.children.push(elem);
            this.e.appendChild(elem.e);
            return elem;
        }
        pop_front(){
            let elem = this.children.getHead();
            elem.remove();
            return elem;
        }
        attr(a,b){
            this.e.setAttribute(a,b);
        }
        style(str){
            let e = this.e;
            this.attrParser(str).map(([name,val])=>{
                e.style[name] = val;
            });
        }
        remove(){
            if(this.parent){
                this.parent.removeChild(this);//children is a linked list
            }else if(this.e.parentNode){
                console.log("Warning: removing an element through raw dom");
                this.e.parentNode.removeChild(this.e);
            }
        }
        removeChild(elem){
            this.children.delete(elem);
            this.e.removeChild(elem.e);
            elem.parent = null;
        }
        insertBefore(elem1,elem2){
            if(elem2 instanceof ELEM){//inserting to the child
                elem1.remove();
                this.e.insertBefore(elem1.e,elem2.e);
                this.children.insertBefore(elem1,elem2);
                elem1.parent = this;
            }else{//inserting to the siblings
                let parent = this.parent;
                if(!parent){
                    throw new Error("parent to the node not defined");
                }
                elem1 = this.getELEM.apply(this,[...arguments]);
                parent.insertBefore(this,elem1);
            }
        }
        insertAfter(elem1,elem2){
            if(elem2 instanceof ELEM){//insert elem2 to this.children
                let next = this.children.getNext(elem1);
                if(next === null){
                    //just push
                    this.push(elem2);
                }else{
                    this.insertBefore(elem2,next);
                }
            }else{//insert to sibling
                let parent = this.parent;
                if(!parent){
                    throw new Error("parent to the node not defined");
                }
                elem1 = this.getELEM.apply(this,[...arguments]);
                parent.insertAfter(this,elem1);
            }
        }
        replace(elem,rep){
            this.insertAfter(elem,rep);
            elem.remove();
        }
        on(evt){
            let that = this;
            let cbs = [];
            for(let i = 1; i < arguments.length; i++){
                let cb = arguments[i];
                cbs.push(cb);
                this.e.addEventListener(evt,cb);
            }
            return {
                remove:function(){
                    for(let i = 0; i < cbs.length; i++){
                        that.e.removeEventListener(evt,cbs[i]);
                    }
                }
            };
        }
        
        style(str){//setting style
            let pairs = this.attrParser(str);
            let e = this.e;
            pairs.map(([sname,val])=>{
                e.style[sname] = val;
            });
        }
        
        once(evt){
            let that = this;
            let cbs = [];
            //console.log(evt,arguments);
            for(let i = 1; i < arguments.length; i++){
                let cb = arguments[i];
                let evtfunc = function(cb,e){
                    //console.log(cbs,cbs.map);
                    for(let i = 0; i < cbs.length; i++){
                        that.e.removeEventListener(evt,cbs[i]);
                    }
                    cbs = [];
                    cb(e);
                }.bind(null,cb);
                cbs.push(evtfunc);
                this.e.addEventListener(evt,evtfunc);
            }
            return {
                remove:function(){
                    for(let i = 0; i < cbs.length; i++){
                        that.e.removeEventListener(evt,cbs[i]);
                    }
                }
            };
        }
        
        getX(){
            let e = this.e;
            return e.offsetLeft;
        }
        getY(){
            let e = this.e;
            return e.offsetTop;
        }
        getWidth(){
            let e = this.e;
            return e.offsetWidth;
        }
        getHeight(){
            let e = this.e;
            return e.offsetHeight;
        }
        getNext(){
            if(!this.parent){
                throw new Error("unsupported operation: parent not registered");
            }
            return this.parent.children.getNext(this);
        }
        getPrev(){
            if(!this.parent){
                throw new Error("unsupported operation: parent not registered");
            }
            return this.parent.children.getPrev(this);
        }
    };


    //aliases
    ELEM.prototype.add = ELEM.prototype.push_back;
    ELEM.prototype.push = ELEM.prototype.push_back;
    ELEM.prototype.pop = ELEM.prototype.pop_back;

    return ELEM;
})();
class MapList{
    constructor(){
        this.objmap = new Map();
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    get size(){
        return this.objmap.size;
    }
    push_back(elem){
        if(this.has(elem))this.delete(elem);
        let ref = {
            prev:null,
            next:null,
            elem
        };
        this.objmap.set(elem,ref);
        if(this.tail === null){//empty
            this.head = ref;
            this.tail = ref;
        }else{
            this.tail.next = ref;
            ref.prev = this.tail;
            this.tail = ref;
        }
    }
    pop_back(){
        let tail = this.tail;
        if(tail === null){
            console.log("warning: trying to pop an empty list");
            return false;
        }
        this.tail = tail.prev;
        this.tail.next = null;
        //gj garbage collector
        this.objmap.delete(tail.elem);
        return tail.elem;
    }
    push_front(elem){
        if(this.has(elem))this.delete(elem);
        console.log("inserting front: ",elem);
        if(this.head === null){
            this.push(elem);
        }else{
            this.insertBefore(elem,this.head.elem);
        }
    }
    pop_front(){
        if(this.head === null){
            return null;
        }else{
            let h = this.head.elem;
            this.delete(h);
            return h;
        }
    }
    delete(elem){
        if(!this.objmap.has(elem)){
            console.log("warning: trying to delete an empty element");
            return false;
        }
        let ref = this.objmap.get(elem);
        if(ref.prev === null){//replacing the head
            this.head = ref.next;
        }else{
            ref.prev.next = ref.next;
        }
        if(ref.next === null){
            this.tail = ref.prev;
        }else{
            ref.next.prev = ref.prev;
        }
        this.objmap.delete(elem);
    }
    has(elem){
        return this.objmap.has(elem);
    }
    getNext(elem){
        if(!this.objmap.has(elem)){
            throw new Error("Error: trying to get an element that does not exist");
        }
        let ref = this.objmap.get(elem);
        if(ref.next === null)return null;
        return ref.next.elem;
    }
    getPrev(elem){
        if(!this.objmap.has(elem)){
            throw new Error("Error: trying to get an element that does not exist");
        }
        let ref = this.objmap.get(elem);
        if(ref.prev === null)return null;
        return ref.prev.elem;
    }
    getHead(){
        if(this.head === null){
            return null;
        }
        return this.head.elem;
    }
    getTail(){
        if(this.tail === null){
            return null;
        }
        return this.tail.elem;
    }
    insertBefore(elem1,elem2){//elem1 is the new node
        if(!this.objmap.has(elem2)){
            console.log("warning: trying to insert before a non-member element");
            return false;
        }
        if(elem1 === elem2){
            console.log("Warning: trying to insert before itself");
            return false;
        }
        if(this.has(elem1))this.delete(elem1);
        let ref2 = this.objmap.get(elem2);
        let ref1 = {
            prev:ref2.prev,
            next:ref2,
            elem:elem1
        };
        this.objmap.set(elem1,ref1);
        let ref0 = ref2.prev;
        ref2.prev = ref1;
        if(ref0 === null){
            //ref2 used to be the head
            this.head = ref1;
        }else{
            ref0.next = ref1;
        }
    }
    insertAfter(elem1,elem2){//elem2 is the new node
        if(!this.objmap.has(elem1)){
            console.log("warning: trying to insert after a non-member element");
            return false;
        }
        if(elem1 === elem2){
            console.log("Warning: trying to insert after itself");
            return false;
        }
        if(this.has(elem2))this.delete(elem2);
        let ref1 = this.objmap.get(elem1);
        let ref2 = {
            prev:ref1,
            next:ref1.next,
            elem:elem2
        };
        this.objmap.set(elem2,ref2);
        let ref3 = ref1.next;
        ref1.next = ref2;
        if(ref3 === null){
            //ref1 used to be the tail
            this.tail = ref2;
        }else{
            ref3.prev = ref2;
        }
    }
    foreach(cb){
        let ref = this.head;
        while(ref !== null){
            let next = ref.next;//in case ref gets deleted
            cb(ref.elem);
            ref = next;
        }
    }
    clear(){
        this.head = null;
        this.tail = null;
        this.objmap.clear();
    }
    replace(elem,rep){
        let ref = this.objmap.get(elem);
        ref.elem = rep;
        this.objmap.delete(elem);
        this.objmap.set(rep,ref);
        return elem;
    }
    toArray(){
        let arr = [];
        this.foreach((elem)=>{
            arr.push(elem);
        });
        return arr;
    }
};


//aliases
MapList.prototype.push = MapList.prototype.push_back;
MapList.prototype.pop = MapList.prototype.pop_back;




//check if node and export module
if(typeof module !== "undefined"){
    module.exports = MapList;
}

//util functions
const Events = function(){
    let that = this;
    const eventTable = {};
    this.eventTable = eventTable;
    this.on = function(type, cb){
        if(!(type in eventTable)){
            eventTable[type] = [];
        }
        eventTable[type].push(cb);
        return {
            fire:function(){
                cb.apply(arguments);
            },
            remove:function(){
                let l = eventTable[type];
                l.splice(l.indexOf(cb),1);//garbage collection
                if(l.length === 0){
                    delete eventTable[type];
                    return true;//all listeners removed
                }else{
                    return false;
                }
            }
        }
    };
    this.emit = function(type){
        const elist = eventTable[type] || [];
        console.log(type,elist);
        for(let i = 0; i < elist.length; i++){
            elist[i].apply(this,[...arguments].slice(1));
        }
    };
    this.wait = function(type){
        return new Promise((res,rej)=>{
            let ev = that.on(type,(val)=>{
                res(val);
                ev.remove();
            });
        });
    };
};


//async utility
let LoadWaiter = function(){
    let queue = [];
    let waiting = true;
    this.ready = function(){
        return new Promise((res,rej)=>{
            if(waiting){
                queue.push(res);
            }else{
                res();
            }
        });
    };
    this.pause = function(){
        waiting = true;
    };
    this.resolve = function(){
        waiting = false;
        queue.map(cb=>cb());//resolve all
        queue = [];
    };
};

let Pause = function(t){
    return new Promise((res,rej)=>{
        setTimeout(res,t);
    });
};


//kinda sketch but works
class Pauser{
    pausing = false;
    callstack = [];
    waitcb;
    constructor(){
        //does nothing
    }
    wait(){
        let args = [... arguments];
        if(!this.pausing){
            return Promise.resolve(args);
        }
        let that = this;
        return new Promise((res,rej)=>{
            that.callstack.push({res,args});
            if(that.waitcb){
                that.waitcb();//call the resolver only once
                that.waitcb = null;
            }
        });
    }
    async pause(){
        this.pausing = true;
        let that = this;
        await new Promise((res,rej)=>{
            that.waitcb = res;
        });
        return this.callstack[0].args;
    }
    resume(){
        let args = [...arguments];
        this.pausing = false;
        this.callstack.map(({res})=>res(args));
        this.callstack = [];
    }
};



let IDSPACE = function(){
    let id = 0;
    this.new = function(){
        return (id++)+"";
    }
};





let Watcher = function(elem){
    console.log("watching: ",elem);
    let ID = new IDSPACE();
    let bus = new Events();
    let shadowBus = new Events();//for self check funcs
    let selfCheckFuncs = {};
    this.on = function(type,cb){
        if(typeof type === "function"){
            if(!("__id" in type)){
                let id = ID.new();
                selfCheckFuncs[id] = type;
                type._id = id;
            }
            let id = type._id;
            let remover = shadowBus.on(id,cb);
            return {
                fire:function(){
                    cb.apply(arguments);
                },
                remove:function(){
                    if(remover.remove()){//all listeners removed
                        delete selfCheckFuncs[id];
                        delete type._id;
                    }
                }
            };
        }else{
            return bus.on(type,cb);
        }
    };
    
    let metadata = {
        "innerText":""
    };
    
    let functable = {
        "innerText":function(){
            let content = metadata["innerText"];
            console.log(content,elem.innerText);
            if(content !== elem.innerText){
                console.log("different!!!");
                metadata["innerText"] = elem.innerText;
                bus.emit("innerText",content);
            }
        }
    };
    
    setInterval(()=>{
        for(let type in bus.eventTable){
            if(type in functable){
                functable[type]();
            }else{
                console.log("warning: regisered event type not present");
            }
        }
        for(id in selfCheckFuncs){
            if(selfCheckFuncs[id](elem)){
                shadowBus.emit(id);
            }
        }
    },100);//every 100ms
};


let SyncedInterval = function(t){
    let cbs = [];
    this.set = function(cb){
        cbs.push(cb);
        return {
            cancel:function(){
                cbs.splice(cbs.indexOf(cb),1);
            }
        };
    };
    let stop = true;
    let main = function(){
        cbs.map(cb=>cb());
        if(!stop)setTimeout(main,t);
    };
    this.stop = function(){
        stop = true;
    };
    this.start = function(){
        if(stop){
            stop = false;
            main();
        }else{
            console.log("the timeout loop has already been started");
        }
    };
};



let WaitRelease = function(waitable){
    let releaser;
    this.wait = function(){
        return new Promise((res,rej)=>{
            if(!waitable){
                res();
            }else{
                releaser = res;
            }
        });
    };
    this.release = function(){
        if(releaser)releaser();
        releaser = null;
    };
    this.setWait = function(){
        waitable = true;
    };
    this.setUnWait = function(){
        waitable = false;
    };
};


//animation stuff
let Animation = function(){
    let queue = [];
    this.nextFrame = function(){
        return new Promise((req,res)=>{
            queue.push(req);
        });
    }
    
    this.pause = false;
    let start = 0;
    let mainLoop = function(t){
        if(start === 0)start = t;
        let dt = t - start;
        start = t;
        this.t = t;
        this.dt = dt;
        queue.map(q=>q(dt));
        queue = [];//freeing the old queue basically
        if(!this.pause)requestAnimationFrame(mainLoop);
    };
    requestAnimationFrame(mainLoop);
};
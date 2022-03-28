class DropArea extends ELEM{
    constructor(){
        super("div","class:droparea","Drop Files Here");
        console.log(this);
        let that = this;
        ['dragenter', 'dragover', 'dragleave', 'drop'].map(n=>{
            that.assignSuperEvent(n,(e)=>{
                e.preventDefault();
            });
        });
        super.on("drop",(e)=>{
            console.log("something dropped");
            let items = e.dataTransfer.items;
            if(!items[0])return;
            let item = items[0];
            if(item.kind !== "file")return;
            let file = item.getAsFile();
            that.emit("file",file);
        });
        let bus = new Events();
        this.on = bus.on.bind(bus);
        this.emit = bus.emit.bind(bus);
    }
    assignSuperEvent(n,cb){
        return super.on(n,cb);
    }
    onfile(cb){
        this.on("file",cb);
    }
};
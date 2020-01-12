let express=require('express');
let socket=require('socket.io');
var crypto = require("crypto");



let app = express();
let server = app.listen(4000, function(){
    console.log('listening @ port 4000');
});

app.use(express.static('public'));


//socket
let io = socket(server);

globalUsers=[];

class Channel {
    constructor(name) {
        console.log('ch made');
        this.users = [];
        this.name = name;
        this.hello = function () {
            console.log('hello in ' + this.name);
        };
    }
}

class HiveChannel extends Channel{
    constructor(name, voteLimit) {
        //Channel.call(this, name);
        super(name);
        
        this.voteLimit = voteLimit;
        this.timeOutVar;
        this.votingTime = 5;
        this.suggestionList = [];
        this.hiveOutput = "";
        let ch = this;
        

        this.onFunctions = function (socket) {
            //proposal recieved; return if not accepted response
            socket.on('chat', function (data) {
                //empty not allowed
                if (data.message.toString().trim() == "") {
                    return;
                }
                //only allow ONE PER PERSON
                if (ch.suggestionList.find(suggestion => suggestion.authorId == socket.id) != undefined) {
                    return;
                }
                //add a new sugestion to the list
                ch.suggestionList.push({
                    id: crypto.randomBytes(20).toString('hex'),
                    paragraph: data.message,
                    score: 0,
                    authorId: socket.id
                });
                console.log('listan nu');
                console.log(ch.suggestionList);
                //avgör om alla suggestions har kommit in
                if (ch.suggestionList.length >= ch.users.length) {
                    ch.timeOutVar = setTimeout(ch.checkVotes, 10000,ch); //timeout for röstning
                    io.to(ch.name).emit('voteFrame', {
                        suggestions: ch.suggestionList,
                        timeOut: ch.votingTime*ch.users.length
                    });
                }
            });
            //inkrementera poäng på förslag när nån röstar
            socket.on('vote', function (id) {
                let currentUser = ch.users.find(u => u.id == socket.id);
                //Do not accept vote on your own suggestion
                if (currentUser.id == ch.suggestionList.find(s => s.id == id).authorId) {
                    return;
                }
                if (currentUser.channelData.numvotes < ch.voteLimit) {
                    currentUser.channelData.numvotes++;
                    currentUser.channelData.voteCount--;
                    ch.suggestionList.find(s => s.id == id).score++;
                }
                if (ch.users.find(u => u.channelData.numvotes < ch.voteLimit) == undefined) {
                    ch.checkVotes(this);
                }
                ;
            });
        };
        this.onJoin = function (socket) {
            socket.emit('initiate', ch.hiveOutput);
            let currentUser = globalUsers.find(u => u.id == socket.id);
            ch.users.push(currentUser);
            currentUser.channelData.voteCount=ch.voteLimit; //set votelimit from channel
            currentUser.channelData.numvotes=0;

            console.log(ch.users);
            io.to(ch.name).emit('userChange', {
                usernames: ch.users.map(u => u.name),
                scores: ch.users.map(u => u.score),
                voteCount: ch.users.map(u => u.channelData.voteCount)
            });
        };
        this.onDisconnect = function (socket) {
            ch.users.find(u => u.id == socket.id).channelData={};
            ch.users.splice(ch.users.findIndex(u => u.id == socket.id), 1);
            io.to(ch.name).emit('userChange', {
                usernames: ch.users.map(u => u.name),
                scores: ch.users.map(u => u.score),
                voteCount: ch.users.map(u => u.channelData.voteCount)
            });
        };
    }
    checkVotes(chan){
        let winnerSuggestion=chan.suggestionList[0];
        chan.suggestionList.forEach(suggestion => {
            if (suggestion.score>winnerSuggestion.score){
                winnerSuggestion=suggestion;
            }
        });
        chan.users.find(user => user.id==winnerSuggestion.authorId).score++; //Adds another score to the author of the suggestion 
        console.log(chan.hiveOutput);
        //Adds the winning suggestion to the frame (with our w/o space [" "])
        if(winnerSuggestion.paragraph == "." || winnerSuggestion.paragraph == "," || winnerSuggestion.paragraphhiveOutput == "!" || winnerSuggestion.paragraph == "?") {
            chan.hiveOutput += winnerSuggestion.paragraph;
        } else {
            chan.hiveOutput+=(" " + winnerSuggestion.paragraph);
        }
        io.to(chan.name).emit('voteResult', chan.hiveOutput); 
    
        chan.suggestionList.splice(0,chan.suggestionList.length);
        clearTimeout(chan.timeOutVar);
        chan.users.forEach(element => {
            element.channelData.numvotes=0;
            element.channelData.voteCount=chan.voteLimit;
        });
        io.to(chan.name).emit('userChange', { //changes the userlist for all users
            usernames: chan.users.map(u => u.name), 
            scores: chan.users.map(u => u.score),
            voteCount: chan.users.map(u => u.channelData.voteCount)
        }); 
    }
}

channels = [new HiveChannel('channel1',3), new HiveChannel('channel2',3)];


io.on('connection',function(socket){
    socket.emit('goToLogin',channels.map(c => c.name)); 
    //login user and notify all users on login
    socket.on('login',function(data){
        thisuser={   //initiate user to userlist
            id: socket.id,
            name: data.username,
            score: 0,
            channelData: {},
        };
        globalUsers.push(thisuser);

        socket.channel=channels.find(c => c.name==data.channel);
        socket.join(socket.channel.name);
        
        socket.channel.onJoin(socket);
        socket.channel.onFunctions(socket);
    });

    socket.on('newChannel',function(data){
        channels.push(new HiveChannel(data.name,3));
        socket.emit('goToLogin',channels.map(c => c.name));
    });


    //send disconnect notice to all client
    socket.on('disconnect', function(){ 
        //console.log(socket.user.username + ' disconnected!');
        globalUsers.splice(globalUsers.findIndex(u => u.id==socket.id),1);
        if (socket.channel != undefined){
            console.log('try-disco');
            socket.channel.onDisconnect(socket);
        }
    });

});
let express=require('express');
let socket=require('socket.io')
var crypto = require("crypto");


let app = express();
let server = app.listen(4000, function(){
    console.log('listening @ port 4000');
});

app.use(express.static('public'));
let suggestionList = [];
//socket
let io = socket(server);

let users=[]; //användarlista
const voteLimit = 3;


let timeOutVar;

/*
Denna funktion kollar vilket förslag som vunnit, och sen resettar den allt. 
Så den tömmer suggestionsList och sätter allas numvotes till 0 så att alla kan få rösta igen.
*/
let checkVotes=function(){
    console.log(users);
        maxVotes=suggestionList[0];
        suggestionList.forEach(element => {
            if (element.score>maxVotes.score){
                maxVotes=element;
            }
        });
        io.sockets.emit('voteResult', maxVotes.paragraph);
        suggestionList=[];
        clearTimeout(timeOutVar);
        users.forEach(element => {
            element.numvotes=0;
        });
}

io.on('connection',function(socket){
    //notify clients on login
    socket.on('login',function(data){
        users.push({
            id: socket.id,
            numvotes: 0,
            name: data.username
        });
        socket.broadcast.emit('userConnect',{
            name: data.username,
            id: socket.id
        });
        users.forEach(element => {
            console.log(element.name);
            socket.emit('userConnect',{name: element.name});
        });
    })
    
    //send disconnect notice to all client
    socket.on('disconnect', function(){ 
        console.log(socket.id + ' disconnected!');
        users.splice(users.findIndex(u => u.id==socket.id),1);
        io.sockets.emit('userDisconnect',{
            name: socket.id,
            id: socket.id
        });
    });

    //proposal recieved
    socket.on('chat',function(data){
        //empty not allowed
        if (data.message.toString().trim()==""){
            return;
        }
        //only allow ONE PER PERSON
        if (suggestionList.find(sl => sl.id=socket.id)!=undefined){
            return;
        }
        //io.sockets.emit('chat',data)
        suggestionList.push({
            id: crypto.randomBytes(20).toString('hex'),
            paragraph: data.message,
            score: 0,
            userid: socket.id
        });
        console.log(suggestionList);
        if (suggestionList.length>=users.length){
            timeOutVar=setTimeout(checkVotes, 10000); //timeout for röstning
            io.sockets.emit('voteFrame',suggestionList);
        }
    });

    //inkrementera poäng på förslag när nån röstar
    socket.on('vote',function(id){
        let currentUser = users.find(u => u.id==socket.id);
        if (currentUser.numvotes<voteLimit){
            console.log(id);
            currentUser.numvotes++;
            suggestionList.find(s => s.id==id).score++;
        }
        console.log(suggestionList);
        if (users.find(u => u.numvotes<voteLimit)==undefined){checkVotes()};
    });

});
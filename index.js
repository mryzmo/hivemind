let express=require('express');
let socket=require('socket.io');
var crypto = require("crypto");
let hiveOutput = "";


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
    suggestionList.forEach(suggestion => {
        if (suggestion.score>maxVotes.score){
            maxVotes=suggestion;
        }
    });
    users.find(user => user.id==maxVotes.authorId).score++; //Adds another score to the author of the suggestion 
    
    //Adds the winning suggestion to the frame (with our w/o space [" "])
    if(maxVotes.paragraph == "." || maxVotes.paragraph == "," || maxVotes.paragraphhiveOutput == "!" || maxVotes.paragraph == "?") {
        hiveOutput+= maxVotes.paragraph;
    } else {
        hiveOutput+= " " + maxVotes.paragraph;
    }
    io.sockets.emit('voteResult', hiveOutput); 

    suggestionList=[];
    clearTimeout(timeOutVar);
    users.forEach(element => {
        element.numvotes=0;
    });
    io.sockets.emit('userChange', { //changes the userlist for all users
        usernames: users.map(u => u.name), 
        scores: users.map(u => u.score)
    }); 
}

io.on('connection',function(socket){
  
    socket.emit('goToLogin');

    //login user and notify all users on login
    socket.on('login',function(data){
        users.push({   //initiate user to userlist
            id: socket.id,
            numvotes: 0,
            name: data.username,
            score: 0
        });
        // users.find(u => u.id==socket.id).name = data.username; //set username for user 
        socket.emit('showResuls', hiveOutput);
        io.sockets.emit('userChange', { //changes the userlist for all users
            usernames: users.map(u => u.name), 
            scores: users.map(u => u.score)
        }); 
        console.log(users);
    })

    //send disconnect notice to all client
    socket.on('disconnect', function(){ 
        let dcUser = users.find(u => u.id==socket.id);
        if(dcUser==undefined) {
            return;
        }
        console.log(dcUser.username + ' disconnected!');
        users.splice(users.findIndex(u => u==dcUser),1);
        io.sockets.emit('userChange', { //changes the userlist for all users
            usernames: users.map(u => u.name), 
            scores: users.map(u => u.score)
        }); 
        console.log(users);
    });

    //proposal recieved; return 0 if not accepted response
    socket.on('chat',function(data){
        //empty not allowed
        if (data.message.toString().trim()==""){
            return;
        }

        //only allow ONE PER PERSON
        if (suggestionList.find(suggestion => suggestion.authorId==socket.id)!=undefined){
            return;
        }
        //add a new sugestion to the list
        suggestionList.push({
            id: crypto.randomBytes(20).toString('hex'),
            paragraph: data.message,
            score: 0,
            authorId: socket.id
        });
        console.log(suggestionList);

        //avgör om alla suggestions har kommit in
        console.log(users.length); console.log(suggestionList.length);
        if (suggestionList.length>=users.length){
            timeOutVar=setTimeout(checkVotes, 10000); //timeout for röstning
            io.sockets.emit('voteFrame',suggestionList);
        }
        console.log(users);
    });

    //inkrementera poäng på förslag när nån röstar
    socket.on('vote',function(id){
        let currentUser = users.find(u => u.id==socket.id);
        //Do not accept vote on your own suggestion
        if (currentUser.id == suggestionList.find(s => s.id==id).authorId) {
            return;
        }
        if (currentUser.numvotes<voteLimit){
            console.log(id);
            currentUser.numvotes++;
            suggestionList.find(s => s.id==id).score++;
        }
        console.log(suggestionList);
        if (users.find(u => u.numvotes<voteLimit)==undefined){checkVotes()};
    });
    console.log(users);
});
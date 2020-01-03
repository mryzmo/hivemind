//make connection
var socket = io.connect('http://192.168.1.159:4000');

var message = document.getElementById('message');
var btn = document.getElementById('send');
var output=document.getElementById('output');
let hivechat=document.getElementById('hivechat');
let hivevote=document.getElementById('hivevote');
let timer = document.getElementById('timer');
let timeLeft=10; //tiden på timern vid röstning
let appState=0; //app state, 0 = suggestion, 1=voting
let userPanel=document.getElementById('users');
let usernameBox=document.getElementById('username');
let loginButton = document.getElementById('loginbutton')
let loginBox = document.getElementById('loginbox')
let hiveApp = document.getElementById('hiveapp')


loginButton.addEventListener("click",function(){
    socket.emit('login',{username: usernameBox.value});
    loginBox.style.display='none';
    hiveApp.style.display='block';
})

/*usernameBox.addEventListener("keydown", function(e) {
    if(e.keyCode==13){
        e.preventDefault();
        loginButton.dispatchEvent(e,"click");
    }
});*/

let submitProposal = function(){
    socket.emit('chat',{
        message: message.value});
    message.value="";
}

message.addEventListener("keydown", function(e) {
    if(e.keyCode==13){
        e.preventDefault();
        submitProposal();
    }
});

console.log('hej')
btn.addEventListener('click',submitProposal);


socket.on('chat',function(data){ 
    output.innerHTML+=' '+data.message;
});

socket.on('voteResult',function(data){ 
    output.innerHTML+=' '+data;
    while(hivevote.firstChild){
        hivevote.removeChild(hivevote.firstChild);
    }
    console.log(hivevote);
    hivechat.style.display="block";
    appState=0;
});

let tickTock = function(){
    if (timeLeft < 1){
        return;
    }
    timer.innerText=timeLeft;
    timeLeft--;
    setTimeout(tickTock, 1000);
}

socket.on('voteFrame',function(data){
    timeLeft=10;
    setTimeout(tickTock, 1000);
    hivechat.style.display="none";
    if (appState==0){
        appState=1;
        data.forEach(suggestion => {
            let votebtn=document.createElement("BUTTON");
            votebtn.innerText=suggestion.paragraph;
            //votebtn.setAttribute('id',suggestion.id)
            votebtn.addEventListener('click',function(){socket.emit('vote',suggestion.id)}); //när man trycker på knappen
            hivevote.appendChild(votebtn);
        });
    }
});

socket.on('userConnect',function(data){
    userPanel.innerHTML+="<p id="+data.id+'>'+data.name+"</p>";
})

socket.on('userDisconnect',function(data){
    var element = document. getElementById(data.id);
    element.parentNode.removeChild(element);
})
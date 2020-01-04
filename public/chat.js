//make connection
let socket = io.connect('http://'+ location.hostname + ':4000');
console.log(location.hostname)
let message = document.getElementById('message');
let btn = document.getElementById('send');
let output=document.getElementById('output');
let hivechat=document.getElementById('hivechat');
let hivevote=document.getElementById('hivevote');
let timer = document.getElementById('timer');
let userPanel=document.getElementById('users');
let scorePanel=document.getElementById('scores');
let usernameBox=document.getElementById('username');
let loginButton = document.getElementById('loginbutton')
let loginBox = document.getElementById('loginbox')
let hiveApp = document.getElementById('hiveapp')

let timeLeft=10; //tiden på timern vid röstning och förslagsläggning
let appState=0; //app state, 0 = suggestion, 1=voting


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
    timeLeft=10;
}

message.addEventListener("keydown", function(e) {
    if(e.keyCode==13){
        e.preventDefault();
        submitProposal();
    }
});

console.log('hej')
btn.addEventListener('click',submitProposal);

socket.on('goToLogin', function() {
    loginBox.style.display='block';
    hiveApp.style.display='none';
});

socket.on('voteResult',function(data){ 
    output.innerHTML=data;
    while(hivevote.firstChild){
        hivevote.removeChild(hivevote.firstChild);
    }
    console.log(hivevote);
    hivechat.style.display="block";
    appState=0;
});

//Här laddas det som redan skrivits åt nyanlända
socket.on('initiate',data => output.innerHTML=data);

let tickTock = function(){
    if (timeLeft < 1){
        timer.innerText="";
        return;
    }
    timeLeft--;
    timer.innerText=timeLeft;
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

socket.on('userChange',function(data){
    userPanel.innerHTML = "";
    scorePanel.innerHTML = "";
    data.usernames.forEach(user => {
        userPanel.innerHTML += `<p>${user}</p>`;
    });
    data.scores.forEach(score => {
        scorePanel.innerHTML += `<p>${score}</p>`;
    });
});
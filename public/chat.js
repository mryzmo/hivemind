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
let votesPanel = document.getElementById('votesCast');
let usernameBox=document.getElementById('username');
let loginButton = document.getElementById('loginbutton');
let loginBox = document.getElementById('loginbox');
let hiveApp = document.getElementById('hiveapp');
let channelButtons=document.getElementById('channelButtons');
let newChannelBtn=document.getElementById('newChannel');
let channelNameBox=document.getElementById('newChannelName');

let timeLeft=10; //tiden på timern vid röstning och förslagsläggning
let appState=0; //app state, 0 = suggestion, 1=voting


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
    // timeLeft=10;
}

message.addEventListener("keydown", function(e) {
    if(e.keyCode==13){
        e.preventDefault();
        submitProposal();
    }
});

newChannelBtn.addEventListener('click',function(){
    socket.emit('newChannel',{name: channelNameBox.value})
});

btn.addEventListener('click',submitProposal);



socket.on('goToLogin', function(data) {
    loginBox.style.display='block';
    hiveApp.style.display='none';
    while(channelButtons.firstChild){
        channelButtons.removeChild(channelButtons.firstChild);
    }

    data.forEach(channel => {
        let chanbtn=document.createElement("BUTTON");
        chanbtn.innerText=channel;
        chanbtn.addEventListener('click',function(){
            socket.emit('login',{username: usernameBox.value,channel: channel});
            loginBox.style.display='none';
            hiveApp.style.display='block';
        }); //när man trycker på knappen
        channelButtons.appendChild(chanbtn);
    });
});

socket.on('voteResult',function(data){ 
    output.innerHTML=data;
    timer.style.display="none";
    while(hivevote.firstChild){
        hivevote.removeChild(hivevote.firstChild);
    }
    console.log(hivevote);
    hivechat.style.display="block";
    btn.style.background = "#575ed8"; //byter tillbaka bakgrunden på Propose-knappeN
    appState=0;
});

//Här laddas det som redan skrivits åt nyanlända
socket.on('initiate',data => output.innerHTML=data);

let tickTock = function(){
    if (timeLeft < 1){
        timer.innerText="";
        return;
    }
    timer.innerText="Vote countdown: " + timeLeft;
    timeLeft--;
    setTimeout(tickTock, 1000);
}

socket.on('voteFrame',function(data){
    console.log(data.timeOut);
    timeLeft=data.timeOut;
    setTimeout(tickTock, 1000);
    hivechat.style.display="none";
    timer.style.display="block";
    if (appState==0){
        appState=1;
        data.suggestions.forEach(suggestion => {
            let votebtn=document.createElement("BUTTON");
            votebtn.innerText=suggestion.paragraph;
            //Gör författarens eget förslag grått
            if (suggestion.authorId == socket.id) {
                votebtn.style.background = "#e9e9e9";
            }
            //votebtn.setAttribute('id',suggestion.id)
            votebtn.addEventListener('click',function(){socket.emit('vote',suggestion.id)}); //när man trycker på knappen
            hivevote.appendChild(votebtn);
        });
    }
});

socket.on('userChange',function(data){
    userPanel.innerHTML = "";
    scorePanel.innerHTML = "";
    votesPanel.innerHTML = "";
    data.usernames.forEach(user => {
        userPanel.innerHTML += `<p>${user}</p>`;
    });
    data.scores.forEach(score => {
        scorePanel.innerHTML += `<p>${score}</p>`;
    });
    console.log(data.voteCount);
    data.voteCount.forEach(vote => {
        votesPanel.innerHTML += `<p>${vote}</p>`;
    })
});

socket.on('suggestionAccepted',function() {
    btn.style.background = "#e9e9e9";
});
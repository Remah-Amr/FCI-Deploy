// var socket = io.connect('http://localhost:5000');
var socket = io.connect('https://remah-3rabi.herokuapp.com');
const personName = document.getElementById('personName').value
const personImageUrl = document.getElementById('personImageUrl').value
const personId = document.getElementById('personId').value

document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;

socket.emit('new-user', roomName, personName,personImageUrl)

socket.on('user-connected', (name,imageUrl) => {
   connectMessage('connected',name)
   document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
})

socket.on('logout', userName => {
    connectMessage('disconnected' ,userName)
    document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;

})

socket.on('chat', (data) => {
    
    // feedback.innerHTML = '';// i need after i send msg this feed back gone from all users 
    appendMessage(data.message,data.personName,data.personImageUrl,data.type)
    document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
});


// when click send on button
document.getElementById('send').addEventListener('click', () => { 
if (document.getElementById('textarea1').value !== '') {
var msg = document.getElementById('textarea1').value 
// appendMessage(msg,personName,personImageUrl) 
document.getElementById('textarea1').value = '' 
document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
socket.emit('chat', { // send event to server which we back to all users except current user
    msg,personName,personImageUrl,roomName,Date1:new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4)
})
}

});

document.getElementById('textarea1').addEventListener('keyup', event => {
    if (document.getElementById('textarea1').value !== '') {
        if (event.keyCode === 13) {
            var msg = document.getElementById('textarea1').value 
            // appendMessage(msg,personName,personImageUrl) 
            document.getElementById('textarea1').value = '' 
            document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
            socket.emit('chat', { // send event to server which we back to all users except current user
               msg,personName,personImageUrl,roomName,Date1:new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4)
            })
        }
    }
})

function appendMessage(message,name,imageUrl,type) {
    if(type === 'text'){
        document.getElementById('chat').innerHTML += 
        // '<p><strong>' + message + '</strong></p>'
        '<li class="collection-item avatar #fffde7 yellow lighten-5">'+
        '<i class="material-icons circle"> '+
            `<img src="${imageUrl}" width="40px" height="40px" >`+
        '</i>'+
        '<span class="title"><strong>'+name+' </strong> </span>'+
        '<p class="black-text">'+message+'</p>'+
        '<a href="" class="secondary-content">'+
            '<span class="orange-text">'+new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4)+'</span>'+
        '</a>'+
        '</li>'
    } else {
        document.getElementById('chat').innerHTML += 
        // '<p><strong>' + message + '</strong></p>'
        '<li class="collection-item avatar #fffde7 yellow lighten-5">'+
        '<i class="material-icons circle"> '+
            `<img src="${imageUrl}" width="40px" height="40px" >`+
        '</i>'+
        '<span class="title"><strong>'+name+' </strong> </span>'+
        `<p class="black-text"><a href="${message}">`+message+'</a></p>'+
        '<a href="" class="secondary-content">'+
            '<span class="orange-text">'+new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4)+'</span>'+
        '</a>'+
        '</li>'
    }
}

function connectMessage(message,name) {
    document.getElementById('chat').innerHTML += 
    // '<p><strong>' + message + '</strong></p>'
    '<li class="collection-item orange-text">'+name +' '+ message +' </li>'
      
    }

socket.on('send-image',data => {
    if(personId.toString() != data.id.toString()){
        document.getElementById('chat').innerHTML += 
        '<li class="collection-item avatar #fffde7 yellow lighten-5">'+
          '<i class="material-icons circle"> '+
              `<img src="${data.personImageUrl}" width="40px" height="40px" >`+
          '</i>'+
          '<span class="title" style="display: block;"><strong>'+data.personName+' </strong> </span>'+
          `<img src="${data.message}" width="500px" height="500px" >`+
          '<a href="" class="secondary-content">'+
            '<span class="orange-text">'+new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4)+'</span>'+
          '</a>'+
        '</li>'
        document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
    }
    // socket.emit('send-image',data,personId,new Date().toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + new Date().toDateString().substr(4))
})
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const expressHbs = require('express-handlebars');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const session = require('express-session');
const { ensureAuthenticated, ensureGuest } = require('./helper/auth');
const Handlebars = require('handlebars')
const server = require('http').Server(app)
const io = require('socket.io')(server)
const flash = require('connect-flash')
const {multerConfigImage, multerConfigVideo} = require('./multer')
const cloud = require('./cloudinaryConfig')
const fs = require('fs')


  // load user model
const message = require('./models/message');
const User = require('./models/user');
const pvtMsg = require('./models/pvtMsg');
const Room = require('./models/room')
const Exam = require('./models/exam')

// load passport
require('./config/passport')(passport);


// Middleware express-session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  }))
  
  // passport middleware must be after express-session
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  // flash middleware
  app.use(flash())
  
  // template engines // extname special to mainlayout only and hbs first "extension name" for all layouts but not main
  app.engine('hbs', expressHbs({ layoutsDir: 'views/layouts/', defaultLayout: 'main-layout', extname: 'hbs',helpers:{
    ifCond : function (v1, operator, v2, options) {
    
      switch (operator) {
          case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
          case '===':
              return (v1 === v2) ? options.fn(this) : options.inverse(this);
          case '!=':
              return (v1 != v2) ? options.fn(this) : options.inverse(this);
          case '!==':
              return (v1 !== v2) ? options.fn(this) : options.inverse(this);
          case '<':
              return (v1 < v2) ? options.fn(this) : options.inverse(this);
          case '<=':
              return (v1 <= v2) ? options.fn(this) : options.inverse(this);
          case '>':
              return (v1 > v2) ? options.fn(this) : options.inverse(this);
          case '>=':
              return (v1 >= v2) ? options.fn(this) : options.inverse(this);
          case '&&':
              return (v1 && v2) ? options.fn(this) : options.inverse(this);
          case '||':
              return (v1 || v2) ? options.fn(this) : options.inverse(this);
          default:
              return options.inverse(this);
      }
    }
  }})); // since hbs not built in express we have to register hbs engine to express TO USING IT
  app.set('view engine', 'hbs'); // we say to node use pug to dynamic templating , "consider the default templating engine"
  app.set('views', 'views'); // and their templatings will be at views folder 'default ' thats second paramater , i can change name ,else i don't need it because its the default
  // app.engine('handlebars', engines.handlebars);
  
  
  // middleware bodyParser
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: false }))
  
  app.use(express.static('public'));
  app.use('/img',express.static('img'));
  
  // global variables
  app.use(function (req, res, next) {
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null; // This will make a user variable available in all templates, provided that req.user is populated.
    next();
  })

  // get login
app.get('/login', ensureGuest, (req, res, next) => {
    res.render('login');
  });
  
  // get register
  app.get('/signup', ensureGuest, (req, res, next) => {
    res.render('signup');
  });
  
  
  // post register
  app.post('/signup', multerConfigImage, async (req, res, next) => { 
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const role = req.body.role
    if(req.file && name && password && email && role){
      const result = await cloud.uploads(req.file.path)
      User.findOne({ email: req.body.email }).then(user => {
        if (user) {
          req.flash('error', 'Email already in use!');
          res.redirect('/signup');
        }
        else {
         
      
          // delete image local
          fs.unlinkSync(req.file.path)
      
          const newUser = {
            name,
            email,
            password,
            imageUrl:result.url,
            role
          }
       
          bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(newUser.password, salt, function (err, hash) {
              if (err) throw err;
              newUser.password = hash;
              new User(newUser).save().then(result => {
                res.redirect('/login');
              }).catch(err => {
                console.log(err);
              })
            });
    
          })
        }
      });
    } else {
      res.render('signup',{error: "you must fill all options"})
    }
   
  });
  
  // post login
  app.post('/login', (req, res, next) => {
    if(!req.body.email || !req.body.password){
      return res.render('login',{error : "You have to fill all options"})
    }
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, next);
  });
  
  
  // logout
  app.get('/logout', (req, res) => {
    req.logout();// Passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
    res.redirect('/login');
    // req.flash('success_msg','You logged out successfully');
  })

app.get('/',ensureAuthenticated,async (req,res)=>{
    const person = await User.findById(req.user._id).lean()
    const rooms = await Room.find().lean()
    res.render('groups',{person,rooms})
})

app.get('/classmates',ensureAuthenticated,async (req,res)=>{
    try{
        var users = await User.find().lean()
        users = users.filter(e => e._id.toString() != req.user._id.toString())
        const person = await User.findById(req.user._id).lean()
        res.render('classmates',{users,person})

    } catch(err){
        console.log(err)
    }
})

app.get('/private/:toName',ensureAuthenticated,async (req,res)=>{
  var toName = req.params.toName
  var to = await User.findOne({name: toName}).lean()
  const msgs = await pvtMsg.find({ users: { $all: [to._id.toString(), req.user._id.toString()] } }).lean()
  // msgs.map(e => 
  //   e.Date = e.Date.toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + e.Date.toDateString().substr(4)
  // )
  if(req.user){
    const person = await User.findById(req.user._id).lean()
    res.render('private',{person,toName,toId:to._id,msgs})
} else {
  res.render('private')
}
  
})

const rooms = {}
const users = {}

app.get('/:room', ensureAuthenticated, async (req, res) => { // we want it
    rooms[req.params.room] = { users: {} }
    var msgs = await message.find({ roomName: req.params.room }).lean() // want
    // msgs.map(e => 
    //   e.Date = e.Date.toLocaleTimeString().replace(/:\d+ /, ' ') +' ' + e.Date.toDateString().substr(4)
    // )
    const user = await User.findById(req.user._id).lean(); // want to handle sender name
    res.render('chat', {
      roomName: req.params.room,
      msgs: msgs,
      person:user
    })
  })

app.post('/send-image',multerConfigImage,async (req,res) => {
  try{
    if(!req.file){
      req.flash('error',"You must add an image") 
      return res.redirect(`/${req.body.roomName}`)
    }
    const result = await cloud.uploads(req.file.path)

        // create Date object for current location
        var date = new Date();
        // convert to milliseconds, add local time zone offset and get UTC time in milliseconds
        const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
        // create new Date object for a different timezone using supplied its GMT offset.
        const egyptTime = new Date(utcTime + (3600000 * 2));
        const Date1 = egyptTime.toLocaleTimeString().replace(/:\d+ /, ' ') + ' ' + egyptTime.toDateString().substr(4)

    const newmsg = new message({
      personName: req.body.personName,
      personImageUrl:req.body.personImageUrl,
      message:result.url,
      roomName:req.body.roomName,
      type : 'image',
      Date:Date1
    })
    await newmsg.save();
    const newMsg = {
      id:req.user._id,
      personName: req.body.personName,
      personImageUrl:req.body.personImageUrl,
      message:result.url,
      roomName:req.body.roomName,
      type : "image"
    }
    fs.unlinkSync(req.file.path)
    res.redirect(`/${req.body.roomName}`)
    io.sockets.to(req.body.roomName).emit('send-image',newMsg)
  } catch(err){
    console.error(err)
    req.flash('error',err)
    res.redirect(`/${req.body.roomName}`)
  }
})
  

app.use('/room',require('./routes/room'))
app.use('/exam',require('./routes/exam'))
// app.get('/exam/security',async (req,res) => {
//   let allowed = 1
//   const exam = await Exam.findOne({name: 'security'})
//       console.log(exam.users)
//       exam.users.map(user => {
//             if(req.user._id.toString() == user.userId.toString())
//             {
//                allowed = 0
//             }
//         })
//   const person = await User.findById(req.user._id).lean()
//   if(allowed){ return res.render('security',{layout: false,person,examName : "security"}) }
//   req.flash('error','You already do this exam')
//   res.redirect('/')
// })

app.use((error,req,res,next)=>{ // in add product Controller & global vars
    console.log(error);
      res.redirect('/');
  })
// connect db
mongoose.connect('mongodb+srv://remah:remah654312@cluster0-ytypa.mongodb.net/FCI-dev?retryWrites=true&w=majority', { useNewUrlParser: true,useUnifiedTopology:true })
  .then(result => {
    console.log('connected!');
  });

const port = process.env.PORT || 5000

server.listen(port, () => {
    console.log(`server started successfully ${port}!`)
  })
  
  
  
  io.on('connection', socket => { // fire when we make connection to browser , each client has own socket
  
    socket.on('new-user', (room, name,imageUrl) => {
      rooms[room].users[socket.id] = name // equal to users.(socket.id)
      socket.join(room) // room here is name not object like 'first' , which I make package called first then put in this all socket.ids belong to this name 'first'
    //   socket.to(room).broadcast.emit('user-connected', name) // here i send only  to socket.ids which include in  my socket name 'first'
      io.sockets.to(room).emit('user-connected',name,imageUrl);
      // Rooms are left automatically upon disconnection.
    })
  
  
    socket.on('disconnect', () => {
      // disconnect user 'i think built in like connection 'true'
      // when user leave the socket , which mean when i enter to page like chat use socket.io will initilze socket.id
      // then if i leave the page or reload it that time  socket.id change which mean logout from prev id 
      getUserRooms(socket).forEach(room => {
        socket.to(room).broadcast.emit('logout', rooms[room].users[socket.id])
      })
    })
  
  
    // listen for message or event sent from client
    socket.on('chat', data => {
        const newMsg = new message({
            personName: data.personName,
            personImageUrl:data.personImageUrl,
            message:data.msg,
            roomName:data.roomName,
            Date:data.Date1,
            type :data.msg.search('http') != -1 && data.msg.indexOf('http') == 0? 'link' : 'text'
        })
        newMsg.save();
        io.sockets.to(data.roomName).emit('chat',newMsg);
        // socket.to(data.roomName).broadcast.emit('chat', data)
    
    });
    
    socket.on('private',(msg,toName,personName,personImageUrl,personId,toId,Date1)=>{
      const newPvtMsg = new pvtMsg ({
        personName,personImageUrl,message:msg,users :[personId,toId],Date:Date1
      })
      console.log(newPvtMsg.Date)
      newPvtMsg.save() 
      socket.to(users[toName]).emit('private',msg,personName,personImageUrl)
    })

    socket.on('private-connected',(name)=>{
      users[name] = socket.id
    })
  
   socket.on('send-image',async (data,personId,Date1) => {
      const msgExist = await message.findOne({personName:data.personName,message:data.message})
      console.log(msgExist)
      if(!msgExist){
        const newMsg = new message({
          personName: data.personName,
          personImageUrl:data.personImageUrl,
          message:data.message,
          roomName:data.roomName,
          Date:Date1,
          type : 'image'
        })
        await newMsg.save();
      }
   })

  })
  
  
  
  // second paramater in reduce is the current value ,since rooms become array of arrays each value has 2 fields like this
  // [ [ 'first', { users: [Object] } ],[ 'second', { users: [Object] } ] ] 
  function getUserRooms(socket) { // that's return all rooms our user is part of this 'in our case only one room'
    return Object.entries(rooms).reduce((names, [name, room]) => { // name is the key 'roomName' like 'first' , room which the value of the first which as object'{ users: { fI0Fxyiwcx8AoF3xAAAC: 'lolo ' } }'
      if (room.users[socket.id] != null) names.push(name) // see if our user in this room or not then push roomName
      return names
    }, []) // names which i collect in , so initial value is an empty array 
  } 
  

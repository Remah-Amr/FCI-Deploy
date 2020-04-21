const express = require('express')
const router = express.Router()
const {multerConfigImage, multerConfigVideo} = require('../multer')
const cloud = require('../cloudinaryConfig')
const { ensureAuthenticated, ensureGuest } = require('../helper/auth');
const Room = require('../models/room')
const User = require('../models/user')
const fs = require('fs')

router.post('/new',multerConfigImage,async (req,res) => {
  try{
    const name = req.body.name
    const password = req.body.password
    const description = req.body.description
    if(req.file && name && password && description){
      const result = await cloud.uploads(req.file.path)
      fs.unlinkSync(req.file.path)
      const newRoom = new Room({
          name,code:password,owner:req.user._id,imageUrl:result.url,description
      })
      await newRoom.save()
      return res.redirect('/')
    }
    req.flash('error', 'You must fill all options');
    res.redirect('/');
  } catch(err){
    req.flash('error',err)
    res.redirect('/')
  }
})

router.get('/verify/:roomName',async(req,res) => {
  try{
    const name = req.params.roomName
    const user = await User.findById(req.user._id).lean(); 
    const verifiedUser = await Room.findOne({name, 
    $or: [
    { users : req.user._id },
    { owner: req.user._id },
    ] 
  })
  if(verifiedUser)  return res.redirect(`/${name}`)
  res.render('code',{roomName:name,person:user})
  } catch(err){
    req.flash('error',err)
    res.redirect('/')
  }
  
})

router.post('/add-user',async (req,res) => {
  try{
    const code = req.body.password
    const name = req.body.roomName
    const user = await User.findById(req.user._id).lean(); // want to handle sender name
    const verifiedRoom = await Room.findOne({name,code})
    if(verifiedRoom) 
    {
      verifiedRoom.users.push(req.user._id)
      await verifiedRoom.save()
      return res.redirect(`/${name}`)
    }
    res.render('code',{roomName:name,person:user,error:"Code is not correct"})
  } catch(err){
    req.flash('error',err)
    res.redirect('/')
  }
})

module.exports = router
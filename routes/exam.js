const express = require('express')
const router = express.Router()
const {ensureAuthenticated} = require('../helper/auth')
const User = require('../models/user')
const Exam = require('../models/exam')

router.get('/all',ensureAuthenticated,async (req,res) => {
    const person = await User.findById(req.user._id).lean()
    const exams = await Exam.find().populate('owner').lean()
    person._id = person._id.toString()
    exams.map(o =>{
        o.owner._id = o.owner._id.toString()
    })
    res.render('exams',{
        person,
        exams
    })
})

router.get('/do/:examName',async (req,res)=>{
    try{
    const person = await User.findById(req.user._id).lean()
     res.render('codeExam',{person,examName:req.params.examName})
    } catch(err){
        // console.error(err)
        // req.flash('error',"please try again")
        res.redirect('/exam/all')
    }
})

router.post('/do/:examName',ensureAuthenticated,async(req,res)=>{
    try{
        const verifiedExam = await Exam.findOne({name:req.body.examName,code: req.body.password})
        if(!verifiedExam) {
            req.flash('error','code is not correct')
            return res.redirect('/exam/all')
        }
        let allowed = 1
        const exam = await Exam.findOne({name: req.params.examName})
            exam.users.map(user => {
                  if(req.user._id.toString() == user.userId.toString())
                  {
                     allowed = 0
                  }
              })
        const person = await User.findById(req.user._id).lean()
        if(allowed){ return res.render(req.params.examName,{layout: false,person,examName : req.params.examName}) }
        req.flash('error','You already do this exam')
        res.redirect('/exam/all')
    } catch(err){
        // console.error(err)
        // req.flash('error',"please try again")
        res.redirect('/exam/all')
    }
})

// router.get('/security',async (req,res) => {
//     let allowed = 1
//     const exam = await Exam.findOne({name: 'security'})
//         exam.users.map(user => {
//               if(req.user._id.toString() == user.userId.toString())
//               {
//                  allowed = 0
//               }
//           })
//     const person = await User.findById(req.user._id).lean()
//     if(allowed){ return res.render('security',{layout: false,person,examName : "security"}) }
//     req.flash('error','You already do this exam')
//     res.redirect('/')
//   })

router.post('/finish/:examName',ensureAuthenticated,async (req,res) => {
    const exam = await Exam.findOne({name : req.params.examName})
    exam.users.push({userId:req.user._id,degree:req.body.correctAnswers})
    await exam.save()
    req.flash('error','You finish this exam and your answers are submitted')
    res.redirect('/exam/all')
})

router.get('/results/:examName',ensureAuthenticated,async (req,res) => {
    const exam = await Exam.findOne({name : req.params.examName}).populate('users.userId').lean()
    const person = await User.findById(req.user._id).lean()
    res.render('results',{
        person,exam
    })
})

router.post('/new',ensureAuthenticated,async (req,res) => {
    try {
        const name = req.body.name
        const code = req.body.password
        const fullMark = req.body.fullMark
        const duration = req.body.duration
        if(name && code && fullMark && duration){
            const newExam = new Exam({
                name,code,fullMark,duration,owner:req.user._id
            })
            console.log(newExam)
            await newExam.save()
            req.flash('error',"Exam was added")
            res.redirect('/exam/all')
        } else {
            req.flash('error','You must fill all options')
            res.redirect('/exam/all')
        }
    } catch(err){
        req.flash('error','Please Try again')
        res.redirect('/exam/all')
    }
})

module.exports = router

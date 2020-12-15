'use strict'

const { Schema } = require("mongoose");

var mongoose= reuire('mongoose');
var Schema= mongoose.Schema;

var MessageSchema= Schema({
    text:String,
    created_at:String,
    emitter:{type:Schema.ObjectId,ref:'User'},
    receiver:{type:Schema.ObjectId,ref:'User'},
});

module.exports=mongoose.model('Message',MessageSchema);
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const totalRevenueSchema = new Schema({
    orgId:{
        type:Number,
        required:true,
        unique:true
    },
    value:{
        type:Number,
    },
    count:{
        type:Number,
    }
},
{ timestamps: true }
)

const totalRevenueModel = mongoose.model('totalRev',totalRevenueSchema)


module.exports = {totalRevenueModel}

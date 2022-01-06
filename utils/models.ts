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

const quarterlyRevenueSchema = new Schema({
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

const dealCountrySchema = new Schema({
    pId:{
        type:Number,
        required:true,
        unique:true
    },
    country:{
        type:String,
    },
    orgId:{
        type:Number,
        unique:false
    }
},
{ timestamps: true }
)

const totalRevenueModel = mongoose.model('totalRev',totalRevenueSchema)
const quarterlyRevenueModel = mongoose.model('quarterlyRev',quarterlyRevenueSchema)
const dealCountryModel = mongoose.model('dealCountry',dealCountrySchema)


module.exports = {totalRevenueModel,quarterlyRevenueModel,dealCountryModel}

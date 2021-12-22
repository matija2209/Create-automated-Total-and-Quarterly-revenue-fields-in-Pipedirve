import {getPipedriveObjects} from './utils/pipedrive'
require('dotenv').config()
import mongoose ,{ Schema, model, connect, Model, mongo } from 'mongoose';
var moment = require('moment')


const main = async ()=>{
    const deals = await getPipedriveObjects({
        endpoint:'deals',
        method:'GET',
        limit:400,
        params:{
            sort:"won_time DESC",
            status:"won"
        }
    })
    moment().subtract(2, 'years')
    const quarterlyRevenue = 2
    const totalRevenue = deals
    .filter((deal:any)=>moment(deal.won_time) > moment().subtract(2, 'years'))
    .map((deal:any)=>{})

}

main()
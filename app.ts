import {getPipedriveObjects,editPipedriveObjects} from './utils/pipedrive'
require('dotenv').config()
import mongoose ,{ Schema, model, connect, Model, mongo } from 'mongoose';
import { delay } from './utils/helpers';
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
    const quarterlyRevenue = 2
    const totalRevenue = deals
    .filter((deal:any)=>moment(deal.won_time) > moment().subtract(2, 'years'))
    .map((deal:any)=>{
        return {
            orgId:deal.org_id?.value,
            value:deal?.value,
            count:1
        }
    })
    .reduce((acc:any,cur:any)=>{
        const match = acc.find((row:any)=>row.orgId === cur.orgId)
        if (acc.length === 0 || !match) {
            acc.push(cur)
            return acc
        }
        return acc.map((deal:any)=>{
            if (deal.orgId !== cur.orgId) return deal
            return {
                ...deal,
                value : deal.value + cur.value,
                count : deal.count + cur.count
            }
        })
    },[])
    for (const org of totalRevenue){
        await delay(50)
        await editPipedriveObjects({
            method:'PUT',
            endpoint:'organizations',
            pId:org.orgId,
            data : {
                '7ef8c3b4cc96236b7d239fdb24b5d49171852d45' : org.value
            }

        })
    }
    debugger

}

main()
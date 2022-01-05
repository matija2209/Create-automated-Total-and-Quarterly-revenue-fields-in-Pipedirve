import {getPipedriveObjects,editPipedriveObjects} from './utils/pipedrive'
require('dotenv').config()
import mongoose ,{ Schema, model, connect, Model, mongo } from 'mongoose';
import { delay } from './utils/helpers';
import {getTotalRevDataFromMongo} from './utils/db'
import {insertDocument,updateDocument,deleteDocument} from './utils/db'
var moment = require('moment')

const dbURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PW}@cluster0.nwtcd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
mongoose.connect(dbURI)

export type filterType = 'totalRevenueModel' | 'quarterlyRevenueModel'

const clearIrrelevantKeysFromDealObj = (deals:[]) => { 
    return deals.map((deal:any)=>{
        return {
            orgId:deal.org_id?.value,
            value:deal?.value,
            count:1
        }
    })
}

const filterDealsByDate = (deals:[],filterType:filterType)=>{
    switch (filterType) {
        case 'totalRevenueModel':
            return deals.filter((deal:any)=>moment(deal.won_time) > moment().subtract(2, 'years')) 
        case 'quarterlyRevenueModel':
            return deals.filter((deal:any)=>moment(deal.won_time).year() === moment().year() && moment(deal.won_time).quarter() === moment().quarter()) 
        default:
            break;
    }
}

const sumDealsValuesPerOrgId = (deals:[{orgId:String}])=>{
    return deals.reduce((acc:any,cur:any)=>{
        try {
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
        } catch (err:any) {
            const message = err.message
            debugger
        }
    },[])
    .filter((org:any)=>org.orgId)
}

const getTotalRevPerOrgId = (deals:[],filterType:filterType) => {
    const compose = (f:any,g:any) => (...args:any) => f(g(...args))
    const manipulateDeals = (...fns:any)=>{
        return fns.reduce(compose)
    }
    const readyData = manipulateDeals(
        sumDealsValuesPerOrgId,
        clearIrrelevantKeysFromDealObj,
        filterDealsByDate,
    )(deals,filterType)
    return readyData
}

const getOrgsThatNeedsUpdating = (dataFromMongo:any,totalRevenue:any)=>{
    // if (typeof dataFromMongo === 'undefined') throw Error('no documents in MongoDd')
    const newEntriesToBeSavedInMongo = new Array()
    const existingOrgsThatNeedUpdate = totalRevenue.map((org:any)=>{
        const matchedOrg = dataFromMongo.find((mongoOrg:any)=> mongoOrg.orgId === org.orgId)
        const isMatch = matchedOrg?._id ? true : false

        if (isMatch) {
            if (matchedOrg.value === org.value) return // Skip if the value between MongoDb and Pipedrive (new) doesn't differ
            return {
                ...org,
                id : matchedOrg._id
                
            }
        }
        newEntriesToBeSavedInMongo.push({
            ...org
        }) // No match with MongoDb, it'll add new entry
        return
    })
    .filter((org:any)=>org)
    return ({
        existingOrgsThatNeedUpdate,
        newEntriesToBeSavedInMongo
    })
}

const processOutdatedEntries = async (mongoData:any)=>{
    const toRemove = mongoData.filter((record:any)=>{
        return moment(mongoData[0].updatedAt) < moment().subtract(30,'d')
    })
    // THIS NEEDS TO BE UPDATED
    for (const doc of toRemove){
        await deleteDocument(doc._id,'totalRevenueModel')
        await editPipedriveObjects({endpoint:'organizations',method:'PUT',pId:doc.orgId,data:{
            '7ef8c3b4cc96236b7d239fdb24b5d49171852d45':0
            }
        })
        await delay(100)
    }
}

const updatePdField = async (org:any,filterType:filterType)=>{
    await delay(100)
    switch (filterType) {
        case 'totalRevenueModel':
            await editPipedriveObjects({endpoint:'organizations',method:'PUT',pId:org.orgId,data:{
                '7ef8c3b4cc96236b7d239fdb24b5d49171852d45':org.value
                }
            })
            break;
        case 'quarterlyRevenueModel':
            await editPipedriveObjects({endpoint:'organizations',method:'PUT',pId:org.orgId,data:{
                '116b12f68bdadc102aed71c5f96db5cd1c3afd62':org.value
                }
            })
            break
        default:
            break;
    }
    console.log(`- updated org ${org.orgId} total revenue with value ${org.value}EUR`);
    return
}

const createNewEntries = async (newEntriesToBeSavedInMongo:any,filterType:filterType)=>{
    
    for (const org of newEntriesToBeSavedInMongo){
        updatePdField(org,filterType)
        insertDocument(org,filterType)
    }        
}

const updateEntries = async (existingOrgsThatNeedUpdate:any,filterType:filterType)=>{
    for (const org of existingOrgsThatNeedUpdate){
        updatePdField(org,filterType)
        updateDocument(
            org.id,
            {
                value:org.value,
                count:org.count
            },
            filterType
        )
    }
}

const main = async () =>{
    const deals = await getPipedriveObjects({
        endpoint:'deals',
        method:'GET',
        limit:400,
        params:{
            sort:"won_time DESC",
            status:"won"
        }
    })
    const toDo:Array<filterType> = [
        'quarterlyRevenueModel',
        'totalRevenueModel'
    ]
    for (const field of toDo){
        const newValuesPerOrg = getTotalRevPerOrgId(deals,field)
        const dataFromMongo = await getTotalRevDataFromMongo(field)
        await processOutdatedEntries(dataFromMongo)
        const {existingOrgsThatNeedUpdate,newEntriesToBeSavedInMongo} = getOrgsThatNeedsUpdating(dataFromMongo,newValuesPerOrg)
        // Insert new documents
        createNewEntries(newEntriesToBeSavedInMongo,field)
        // Update existing documents
        updateEntries(existingOrgsThatNeedUpdate,field)
    }
    return
}

function run_async () {
    main().then(()=>{
        console.log("Finished")
        process.exit()
    }, run_async.bind(null)).catch((err)=>{
        console.log(err);
        
    })
    
}

run_async()

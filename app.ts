import {getPipedriveObjects,editPipedriveObjects} from './utils/pipedrive'
require('dotenv').config()
import mongoose ,{ Schema, model, connect, Model, mongo } from 'mongoose';
import { delay } from './utils/helpers';
import {getActionDataFromMongo} from './utils/db'
import {insertDocument,updateDocument,deleteDocument} from './utils/db'
import { debug } from 'console';
var moment = require('moment')

const dbURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PW}@cluster0.nwtcd.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
mongoose.connect(dbURI)

export type filterType = 'totalRevenueModel' | 'quarterlyRevenueModel' | 'dealCountryModel'

const clearIrrelevantKeysFromDealObj = (deals:[],filterType:filterType) => { 
    return deals.map((deal:any)=>{
        return {
            orgId:deal.org_id?.value,
            value:deal?.value,
            count:1,
            pId:deal.id
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
            return deals
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
            console.log(message);  
        }
    },[])
    .filter((org:any)=>org.orgId)
}

const findRevenuePerOrg = (deals:[],filterType:filterType) => {
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

const findOrgsWithMissingOrLackingValue = (dataFromMongo:any,totalRevenue:any)=>{
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
            '7ef8c3b4cc96236b7d239fdb24b5d49171852d45':0 // Pipedrive API field for Total Revenue - CHANGE TO YOURS!!!
            }
        })
        await delay(100)
    }
}

const updatePdField = async (org:any,filterType:filterType)=>{
    // await delay(100)
    // await new Promise((resolve,reject)=>setTimeout(resolve,50))
    try {
        switch (filterType) {
            case 'totalRevenueModel':
                await editPipedriveObjects({endpoint:'organizations',method:'PUT',pId:org.orgId,data:{
                    '7ef8c3b4cc96236b7d239fdb24b5d49171852d45':org.value // Pipedrive API field for Quarterly Revenue - CHANGE TO YOURS!!!
                    }
                })
                break;
            case 'quarterlyRevenueModel':
                await editPipedriveObjects({endpoint:'organizations',method:'PUT',pId:org.orgId,data:{
                    '116b12f68bdadc102aed71c5f96db5cd1c3afd62':org.value
                    }
                })
                break
            case 'dealCountryModel':
                await editPipedriveObjects({endpoint:'deals',method:'PUT',pId:org.pId,data:{
                    'a85247c3174ca33db9c904c8f3b9b387eefd0341':org.country
                    }
                })
                break
            default:
                break;
        }

    } catch (err:any) {
        const message = err.message
    }
    console.log(`- updated org ${org.orgId} total revenue with value ${org.value}EUR`);
    return
}

const createNewEntries = async (newEntriesToBeSavedInMongo:any,filterType:filterType)=>{
    for (const org of newEntriesToBeSavedInMongo){
        await updatePdField(org,filterType)
        await insertDocument(org,filterType)
    }        
}

const updateEntries = async (existingOrgsThatNeedUpdate:any,filterType:filterType)=>{
    for (const org of existingOrgsThatNeedUpdate){
        await updatePdField(org,filterType)
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

const addCountryToObj = async (deals:Array<{}>)=>{
    const payload = new Array()
    for (const deal of deals) {
        const orgId = deal['orgId']
        console.log(`-\t\t extracting country data from org: ${orgId}`);
        let country
        if (orgId) {
            const orgData = await getPipedriveObjects({endpoint:'organizations',method : 'GET',bulkAction:false,id:orgId})
            country = orgData.address_country
        } else {
            country = "missing information"
        }
        payload.push({
            ...deal,
            country,
        })
    }
    return payload
}


const processRevenueFields = async () =>{
    const deals = await getPipedriveObjects({endpoint:'deals',method:'GET',limit:500,params:{sort:"won_time DESC",status:"won"},bulkAction:true})
    const actions:Array<filterType> = ['quarterlyRevenueModel','totalRevenueModel']
    for (const action of actions){
        const storedDataPerAction = await getActionDataFromMongo(action)
        await processOutdatedEntries(storedDataPerAction)
        const newDataPerAction = findRevenuePerOrg(deals,action)
        const {existingOrgsThatNeedUpdate,newEntriesToBeSavedInMongo} = findOrgsWithMissingOrLackingValue(storedDataPerAction,newDataPerAction)
        // Insert new documents
        await createNewEntries(newEntriesToBeSavedInMongo,action)
        // Update existing documents
        await updateEntries(existingOrgsThatNeedUpdate,action)
    }
    return
}
const processDealFields = async ()=>{
    const deals = await getPipedriveObjects({endpoint:'deals',method:'GET',limit:3000,params:{sort:"won_time DESC",status:"won"},bulkAction:true})
    const alreadyProcessedData = await getActionDataFromMongo('dealCountryModel')
    
    const dataNotPresentInMongo = deals.filter((deal:any)=>{
        const matchedProduct = alreadyProcessedData.find((document:any)=>document.pId === deal.id)
        const isPresentInExistingData = matchedProduct?.pId ? true : false
        return !isPresentInExistingData
    })
    const goData = clearIrrelevantKeysFromDealObj(dataNotPresentInMongo,'dealCountryModel')
    if (goData.length === 0) return
    const newDataPerAction  = await addCountryToObj(goData)
    await createNewEntries(newDataPerAction,'dealCountryModel')
}

function run_async () {
    // processRevenueFields().then(()=>{
    //     console.log("Finished Orgs fields")
    //     process.exit()
    // }, run_async.bind(null)).catch((err)=>{
    //     console.log(err);
    // })
    processDealFields().then(()=>{
        console.log("Finished Deals fields")
        process.exit()
    }, run_async.bind(null)).catch((err)=>{
          console.log(err);
    })
    
}

run_async()


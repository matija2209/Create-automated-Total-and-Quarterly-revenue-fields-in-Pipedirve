import { ObjectId } from "bson";
import {filterType} from "../app"
const models = require('./models')
const ObjectId = require('mongoose').Types.ObjectId; 

const getActionDataFromMongo = async (filterType:filterType)=>{
    let results 
    switch (filterType) {
        case 'totalRevenueModel':
            const tRev = await models.totalRevenueModel.find({}).exec();
            results = tRev.map((de:any)=>de.toObject())
        case 'quarterlyRevenueModel':
            const qRevenue = await models.quarterlyRevenueModel.find({}).exec();
            results = qRevenue.map((de:any)=>de.toObject())
        case 'dealCountryModel':
            const dealCountry = await models.dealCountryModel.find({}).exec();
            results = dealCountry.map((de:any)=>de.toObject())
        default:
            break;
    }
    if (results) {
        return results
    } 
    return []
}


const updateDocument = async (_id:ObjectId,data:{},modelName:filterType):Promise<void> =>{
    const conditions = {_id}
    const dateToUpdate =  {
        $set: {...data}
    }
    switch (modelName) {
        case 'totalRevenueModel':
            await models.totalRevenueModel.updateOne(conditions,dateToUpdate,{
                upsert:false,
                strict:false
                }
            )
            break;
        case 'quarterlyRevenueModel':
            await models.quarterlyRevenueModel.updateOne(conditions,dateToUpdate,{
                upsert:false,
                strict:false
                }
            )
        case 'dealCountryModel':
            await models.dealCountryModel.updateOne(conditions,dateToUpdate,{
                upsert:false,
                strict:false
                }
            )
        default:
            break;
    }
}

const insertDocument = async (data:{},modelName:filterType)=>{
    try {
        switch (modelName) {
            case 'totalRevenueModel':
                var insertRecord = await new models.totalRevenueModel(data)
                insertRecord.save()
                break
            case 'quarterlyRevenueModel':
                var insertRecord = await new models.quarterlyRevenueModel(data)
                insertRecord.save()
                break
            case 'dealCountryModel':
                var insertRecord = await new models.dealCountryModel(data)
                insertRecord.save()
            default:
                break;
            }
            
    } catch (err:any){
        console.log("Error inserting document :",err.message);
    }
    return

}

const deleteDocument = async (_id:ObjectId,modelName:filterType)=>{
    switch (modelName) {
        case 'totalRevenueModel':
            await models.totalRevenueModel.deleteOne({_id})
            break;
        case 'quarterlyRevenueModel':
            await models.quarterlyRevenueModel.deleteOne({_id})
        case 'dealCountryModel':
            var insertRecord = new models.deleteOne({_id})
            insertRecord.save()
        default:
            break;
    }
}

export {getActionDataFromMongo,updateDocument,insertDocument,deleteDocument}
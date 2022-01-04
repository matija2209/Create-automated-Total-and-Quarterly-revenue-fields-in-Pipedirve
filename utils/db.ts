import { ObjectId } from "bson";
import {filterType} from "../app"
const models = require('./models')
const ObjectId = require('mongoose').Types.ObjectId; 

const getTotalRevDataFromMongo = async (filterType:filterType)=>{
    switch (filterType) {
        case 'totalRevenueModel':
            const tRev = await models.totalRevenueModel.find({}).exec();
            return tRev.map((de:any)=>de.toObject())
        case 'quarterlyRevenueModel':
            const qRevenue = await models.quarterlyRevenueModel.find({}).exec();
            return qRevenue.map((de:any)=>de.toObject())
        default:
            break;
    }
}


const updateDocument = async (_id:ObjectId,data:{},modelName:'totalRevenueModel' | 'quarterlyRevenueModel'):Promise<void> =>{
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
        default:
            break;
    }
}

const insertDocument = (data:{},modelName:'totalRevenueModel' | 'quarterlyRevenueModel')=>{
    try {
        switch (modelName) {
            case 'totalRevenueModel':
                var insertRecord = new models.totalRevenueModel(data)
                insertRecord.save()
                break
            case 'quarterlyRevenueModel':
                var insertRecord = new models.quarterlyRevenueModel(data)
                insertRecord.save()
                break
            default:
                break;
            }
            
    } catch (err:any){
        console.log("Error inserting document :",err.message);
    }
    return

}

const deleteDocument = async (_id:ObjectId,modelName:'totalRevenueModel' | 'quarterlyRevenueModel')=>{
    switch (modelName) {
        case 'totalRevenueModel':
            await models.totalRevenueModel.deleteOne({_id})
            break;
        case 'quarterlyRevenueModel':
            await models.quarterlyRevenueModel.deleteOne({_id})
        default:
            break;
    }
}

export {getTotalRevDataFromMongo,updateDocument,insertDocument,deleteDocument}
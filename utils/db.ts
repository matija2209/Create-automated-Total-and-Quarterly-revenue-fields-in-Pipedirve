import { ObjectId } from "bson";

const models = require('./models')
const ObjectId = require('mongoose').Types.ObjectId; 

const getTotalRevDataFromMongo = async ()=>{
    const pdDealsFromMongo = await models.totalRevenueModel.find({}).exec();
    return pdDealsFromMongo.map((de:any)=>de.toObject())
}

const updateDocument = async (_id:ObjectId,data:{}):Promise<void> =>{
    const conditions = {_id}
    const dateToUpdate =  {
        $set: {...data}
    }
    const updateRecord = await models.totalRevenueModel.updateOne(conditions,dateToUpdate,{
        upsert:false,
        strict:false
    }
    )
}

const insertDocument = (data:{})=>{
    try {
        const insertRecord = new models.totalRevenueModel(data)
        insertRecord.save()
    } catch (err:any){
        console.log("Error inserting document :",err.message);
    }
    return

}

export {getTotalRevDataFromMongo,updateDocument,insertDocument}
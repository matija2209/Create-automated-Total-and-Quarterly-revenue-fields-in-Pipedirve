import {AxiosRequestConfig,AxiosResponse} from 'axios'
import axios from 'axios'
import {delay} from '../utils/helpers'

type fetchPipedriveObjects = {
    endpoint : 'deals' | 'persons' | 'products' | 'organizations',
    limit? : number,
    method : 'POST'|'GET'|'PUT'|'DELETE',
    term? : string,
    params : {} | null,
    data? : {}
}

type editPipedriveObject = {
    endpoint : 'deals' | 'persons' | 'products' | 'organizations',
    method : 'POST'|'GET'|'PUT'|'DELETE',
    pId : number,
    data? : {}

}

export const editPipedriveObjects = async ({...obj}:editPipedriveObject):Promise<Array<any>|any> => {
    var options:AxiosRequestConfig = {
        headers: { "Content-Type": "application/json" },
        params : {
            api_token : process.env.PIPEDRIVE_API_KEY,
            start:0,
            sort:'add_time DESC'
        },
        url : `https://harmony.pipedrive.com/api/v1/${obj.endpoint}/${obj.pId}`,
        method:obj.method,
        timeout: 60000, //optional,
    };

    options.data = obj.data
    const request:AxiosResponse = await axios(options);
    return request
}

export const getPipedriveObjects = async ({...obj}:fetchPipedriveObjects):Promise<Array<any>|any> => {
    var options:AxiosRequestConfig = {
        headers: { "Content-Type": "application/json" },
        params : {
            api_token : process.env.PIPEDRIVE_API_KEY,
            start:0,
            sort:'add_time DESC'
        },
        url : `https://harmony.pipedrive.com/api/v1/${obj.endpoint}`,
        method:obj.method,
        timeout: 60000, //optional,
    };

    if (obj.method !== 'GET'){
        options.data = obj.data
        const request:AxiosResponse = await axios(options);
        return request
    }
    if (obj.params){
        const newParams = {
            ...options.params,
            ...obj.params
        }
        options.params = newParams
    }
 
    try {
        let pdResults = new Array()
        let maxLimit = obj?.limit

        if (!maxLimit) {
            maxLimit = 9999
        }
        while (options.params.start <  maxLimit){
            const request:AxiosResponse = await axios(options);
            const orders = request.data
            pdResults.push(orders['data'])
            await delay(800)
            console.log(`\t- extracting ${obj.endpoint} @`,options.params.start);
            if (!orders['additional_data']['pagination']['more_items_in_collection']) break
            options.params.start = orders['additional_data']['pagination']['next_start'] 
        }
        return pdResults.flat()
    }
    catch (err:any) {
        const message = err.message
        throw new Error(`failed fetching ${obj.endpoint}`)
    }
}
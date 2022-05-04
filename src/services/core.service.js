const Neon = require('@cityofzion/neon-js');
const axios = require('axios');
const { aggregate } = require('../models/token.model');

const url = "http://seed1t4.neo.org:20332";
const privateKey = "";

const n3config = {
    "networkMagic": 877933390,
    "rpcAddress": url ,
    "account": new Neon.wallet.Account(privateKey),
    "rpcClient": new Neon.rpc.RPCClient(url)
}

const feedProviders = ["https://feed.feedio.xyz/v1/feed", "https://feed.feedio.xyz/v1/feedChainlink"];
const providerWeightage = [0.8, 0.2];

const process = () => {
    fetchProviderResponses();
    aggregateResponse();
}

const fetchProviderResponses = async () => {

    var providerResponses = [];
    for (let index = 0; index < feedProviders.length; index++) {
        const provider = feedProviders[index];
        let response = null;
        try {
            response = await axios.get(provider);
        } catch(ex) {
            response = null;
            console.log(ex);
        }
    
        if (response) {
            const responseData = response.data.data;
            providerResponses.push(responseData);
        } else {
            providerResponses.push({});
        }
    }

    console.log(providerResponses);
    return providerResponses;
}

const aggregateResponse = (providerResponses) => {

}

const fetchOnChainPrices = () => {

    
}

const invokeSCFunction = async (account, contract, operation, arguments, config) => {
    
    const ContractCallParams = {
        scriptHash: contract,
        operation: operation,
        args: arguments,
    }
    const script = Neon.sc.createScript(ContractCallParams);      
    const signers =  [ { account: account.scriptHash, scopes: Neon.tx.WitnessScope.Global } ];

    var transaction = new Neon.tx.Transaction({ signers, script });
    await Neon.experimental.txHelpers.setBlockExpiry(transaction, config);
    await Neon.experimental.txHelpers.addFees(transaction, config);

    const signedTransaction = transaction.sign(account, config.networkMagic);
    console.log(transaction.toJson());

    const result = await config.rpcClient.sendRawTransaction(Neon.u.HexString.fromHex(signedTransaction.serialize(true)));
    console.log(result);      
}

module.exports = {
    invokeSCFunction,
    process
};

//const currentHeight = await n3config.rpcClient.getBlockCount();
//console.log("EXECUTING TRIGGER. CURRENT BLOCK HEIGHT -> ", currentHeight);
// const result = await n3config.rpcClient.invokeFunction(Neon.CONST.NATIVE_CONTRACT_HASH.GasToken, "symbol");
// console.log( Neon.u.base642utf8(result.stack[0]["value"]) );

// coreService.invokeSCFunction(n3config.account, Neon.CONST.NATIVE_CONTRACT_HASH.GasToken, "transfer", [
//     Neon.sc.ContractParam.hash160(n3config.account.address),
//     Neon.sc.ContractParam.hash160("NSAYUcyaWERsN2xQ83Ww8bwbCgG1dCsewT"),
//     10000000,
//     Neon.sc.ContractParam.any(),
// ], n3config)

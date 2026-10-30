import {isIP} from 'node:net';
// Forwarded headers are ignored unless the operator explicitly trusts a fixed
// number of ingress proxies and prevents direct access to the Node port.
export function clientAddress(req,env=process.env){
 const remote=req.socket.remoteAddress||'local',hops=Number(env.AGENTFC_TRUST_PROXY_HOPS??0);
 if(!Number.isInteger(hops)||hops<1||hops>3)return remote;
 const raw=req.headers['x-forwarded-for'];if(typeof raw!=='string'||raw.length>1024)return remote;
 const chain=raw.split(',').map(v=>v.trim());
 if(chain.length<hops||chain.some(value=>!isIP(value)))return remote;
 return chain[chain.length-hops];
}

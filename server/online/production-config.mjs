function infrastructureProblems(env){
 const problems=[];
 if(!env.AGENTFC_DATABASE_URL)problems.push('AGENTFC_DATABASE_URL');
 if(env.AGENTFC_TRUST_PROXY_HOPS!==undefined&&!/^[0-3]$/.test(env.AGENTFC_TRUST_PROXY_HOPS))problems.push('AGENTFC_TRUST_PROXY_HOPS (0 to 3)');
 if(env.AGENTFC_DEPLOY_STAGE!==undefined&&!['staging','production'].includes(env.AGENTFC_DEPLOY_STAGE))problems.push('AGENTFC_DEPLOY_STAGE (staging or production)');
 if(!env.AGENTFC_ALLOWED_ORIGINS?.split(',').includes('capacitor://localhost'))problems.push('AGENTFC_ALLOWED_ORIGINS must include capacitor://localhost');
 return problems;
}
export function productionProblems(env=process.env){
 const problems=infrastructureProblems(env);
 for(const name of ['AGENTFC_APPLE_SIGNIN_TEAM_ID','AGENTFC_APPLE_SIGNIN_KEY_ID','AGENTFC_TOKEN_ENCRYPTION_KEY','AGENTFC_APNS_KEY_ID','AGENTFC_APNS_TEAM_ID'])if(!env[name])problems.push(name);
 if(!env.AGENTFC_APPLE_SIGNIN_KEY_PATH&&!env.AGENTFC_APPLE_SIGNIN_KEY_PEM)problems.push('AGENTFC_APPLE_SIGNIN_KEY_PATH or AGENTFC_APPLE_SIGNIN_KEY_PEM');
 if(!env.AGENTFC_APNS_KEY_PATH&&!env.AGENTFC_APNS_KEY_PEM)problems.push('AGENTFC_APNS_KEY_PATH or AGENTFC_APNS_KEY_PEM');
 if(env.AGENTFC_TOKEN_ENCRYPTION_KEY&&Buffer.from(env.AGENTFC_TOKEN_ENCRYPTION_KEY,'base64').length!==32)problems.push('AGENTFC_TOKEN_ENCRYPTION_KEY (32 bytes in Base64)');
 if(env.AGENTFC_APPLE_ENVIRONMENT!=='Production')problems.push('AGENTFC_APPLE_ENVIRONMENT=Production');
 if(env.AGENTFC_COMMERCE_ENABLED==='false')problems.push('AGENTFC_COMMERCE_ENABLED must not disable production purchases');
 return problems;
}
export function requireProductionConfig(env=process.env){
 const problems=productionProblems(env);if(problems.length)throw new Error('Release configuration incomplete: '+problems.join(', '));
}
export function deploymentProblems(env=process.env){
 if(env.AGENTFC_DEPLOY_STAGE!=='staging')return productionProblems(env);
 const problems=infrastructureProblems(env);
 if(env.AGENTFC_APPLE_ENVIRONMENT!=='Sandbox')problems.push('Staging requires AGENTFC_APPLE_ENVIRONMENT=Sandbox');
 return problems;
}
export function requireDeploymentConfig(env=process.env){
 const problems=deploymentProblems(env);if(problems.length)throw new Error('Deployment configuration incomplete: '+problems.join(', '));
}

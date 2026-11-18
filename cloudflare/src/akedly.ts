import {env} from 'cloudflare:workers';

const settings = env as unknown as Record<string,string>;
const endpoint = () => settings.APP_ENV === 'test' && settings.AKEDLY_TEST_ENDPOINT ? settings.AKEDLY_TEST_ENDPOINT : 'https://api.akedly.io/api/v1.2/transactions';
const credentials = () => ({APIKey: settings.AKEDLY_API_KEY, pipelineID: settings.AKEDLY_PIPELINE_ID});

export async function akedlyChallenge() {
  const credentialsValue = credentials();
  if (!credentialsValue.APIKey || !credentialsValue.pipelineID) throw new Error('Phone verification is unavailable');
  const url = new URL(endpoint() + '/challenge');
  url.searchParams.set('APIKey', credentialsValue.APIKey);
  url.searchParams.set('pipelineID', credentialsValue.pipelineID);
  const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
  const body = await response.json() as {status?:string;data?:Record<string,unknown>};
  if (!response.ok || body.status !== 'success' || !body.data) throw new Error('Phone verification is unavailable');
  const d = body.data;
  return {challengeRequired:d.challengeRequired, challenge:d.challenge, challengeToken:d.challengeToken, difficulty:d.difficulty, expiresAt:d.expiresAt, turnstile:d.turnstile};
}

export async function akedlySend(phone:string, ip:string, powSolution:unknown, turnstileToken:unknown) {
  const response = await fetch(endpoint() + '/send', {method:'POST',headers:{'content-type':'application/json','x-end-user-ip':ip},body:JSON.stringify({...credentials(),verificationAddress:{phoneNumber:phone},digits:6,powSolution,turnstileToken}),signal:AbortSignal.timeout(15000)});
  const result = await response.json() as {status?:string;data?:{transactionReqID?:unknown;expiresAt?:unknown}};
  if (!response.ok || result.status !== 'success' || typeof result.data?.transactionReqID !== 'string') throw new Error('Phone verification is unavailable');
  return result.data.transactionReqID;
}

export async function akedlyVerify(transactionReqID:string, otp:string) {
  const response = await fetch(endpoint() + '/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({transactionReqID,otp}),signal:AbortSignal.timeout(15000)});
  const result = await response.json() as {status?:string;data?:{verified?:boolean};code?:string};
  if (response.ok && result.status === 'success' && result.data?.verified === true) return true;
  if (['INVALID_OTP','MAX_ATTEMPTS_EXCEEDED','TRANSACTION_EXPIRED','ALREADY_VERIFIED'].includes(result.code || '')) return false;
  throw new Error('Phone verification is unavailable');
}

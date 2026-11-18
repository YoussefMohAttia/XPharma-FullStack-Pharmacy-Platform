(()=>{
 const button=document.getElementById('phoneCodeSend');if(!button)return;
 const status=document.getElementById('phoneCodeStatus'),csrf=document.querySelector('input[name="csrf_token"]').value;
 const say=(en,ar)=>{status.textContent=document.documentElement.lang==='ar'?ar:en};
 async function post(path,values={}){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf_token:csrf,...values})});if(!response.ok)throw new Error('request failed');return response.json()}
 async function solve(challenge,difficulty,expires){
  if(!/^[0-9a-f]{64}$/i.test(challenge)||!Number.isInteger(difficulty)||difficulty<0||difficulty>7)throw new Error('invalid challenge');
  const prefix='0'.repeat(difficulty),encoder=new TextEncoder();
  for(let nonce=0;nonce<20000000;nonce++){
   if(expires && Date.now()>Date.parse(expires))throw new Error('expired');
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(challenge+':'+nonce)));
   const hex=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');if(hex.startsWith(prefix))return nonce;
   if(nonce%1000===0)await new Promise(resolve=>setTimeout(resolve,0));
  }throw new Error('challenge failed');
 }
 async function sendCode(){if(button.disabled)return;button.disabled=true;say('Preparing your code...','جارٍ تجهيز الرمز...');try{
  const challenge=await post('/customer/verify/phone/challenge');
  if(challenge.turnstile?.required)throw new Error('turnstile required');
  const values={};if(challenge.challengeRequired){values.challengeToken=challenge.challengeToken;values.nonce=String(await solve(challenge.challenge,challenge.difficulty,challenge.expiresAt));}
  await post('/customer/verify/phone/send',values);say('Code requested. Check your phone.','تم طلب الرمز. يرجى التحقق من هاتفك.');
 }catch{say('Could not send a code. Please try again later or contact XPharma.','تعذر إرسال الرمز. حاول مجدداً لاحقاً أو تواصل مع إكس فارما.');}finally{button.disabled=false;}}
 button.addEventListener('click',sendCode);
 if(button.dataset.autoStart==='true')sendCode();
})();

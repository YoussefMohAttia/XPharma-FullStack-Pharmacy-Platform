import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

test('customers can choose email or phone verification', {timeout:90000}, async()=>{
 const messages=[];let emailCode='',requests=0;const phone='010'+String(Date.now()%100000000).padStart(8,'0'),phone2='011'+String(Date.now()%100000000).padStart(8,'0');
 const provider=createServer((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const url=new URL(req.url,'http://localhost');let output;
  if(url.pathname==='/challenge'){assert.equal(url.searchParams.get('APIKey'),'test-key');output={status:'success',data:{challengeRequired:true,challenge:'a'.repeat(64),difficulty:2,challengeToken:'proof-token',expiresAt:new Date(Date.now()+60000).toISOString(),turnstile:{required:false}}};}
  else if(url.pathname==='/send'){const input=JSON.parse(raw);requests++;assert.match(input.verificationAddress.phoneNumber,/^\+2010\d{8}$/);assert.equal(input.APIKey,'test-key');assert.ok(req.headers['x-end-user-ip']);assert.equal(input.powSolution.challengeToken,'proof-token');assert.ok(createHash('sha256').update('a'.repeat(64)+':'+input.powSolution.nonce).digest('hex').startsWith('00'));output={status:'success',data:{transactionReqID:'test-transaction'}};}
  else if(url.pathname==='/verify'){const input=JSON.parse(raw);assert.equal(input.transactionReqID,'test-transaction');output=input.otp==='123456'?{status:'success',data:{verified:true}}:{status:'error',code:'INVALID_OTP'};}
  else if(url.pathname==='/email'){const input=JSON.parse(raw);emailCode=input.text.match(/\b\d{6}\b/)[0];messages.push(input);output={id:'test'};}
  else {res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(output));});});
 await new Promise(resolve=>provider.listen(8788,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  async function fill(page,email,phone){await page.goto('http://127.0.0.1:8793/customer/register');await page.locator('#fname').fill('Test');await page.locator('#lname').fill('Person');await page.locator('#email').fill(email);await page.locator('#phone').fill(phone);await page.locator('#city').fill('Alexandria');await page.locator('#address').fill('Test Street');await page.locator('#password').fill('Password123!');}
  const page=await browser.newPage();await fill(page,`phone-${Date.now()}@example.test`,phone);await page.locator('#verifyPhone').check();await page.locator('button[type=submit]').click();await page.waitForURL('**/customer/verify');
  assert.equal(await page.locator('#phoneCodeSend').count(),1);await page.getByText('Code requested. Check your phone.').waitFor();assert.equal(requests,1,'registration automatically sends one request');
  await page.reload();await page.waitForTimeout(500);assert.equal(requests,1,'reloading does not resend');await page.locator('#phoneCodeSend').click();await page.getByText('Code requested. Check your phone.').waitFor();assert.equal(requests,2,'resend works when requested');
  await page.locator('#code').fill('000000');await page.locator('button.btn-primary').click();await page.waitForURL('**/customer/verify');assert.match(await page.locator('body').innerText(),/Incorrect or expired/);
  await page.locator('#code').fill('123456');await page.locator('button.btn-primary').click();await page.waitForURL('**/customer/dashboard');assert.match(await page.locator('body').innerText(),/Account verified/);await page.goto('http://127.0.0.1:8793/customer/logout');await page.goto('http://127.0.0.1:8793/customer/login');await page.locator('#email').fill(phone);await page.locator('#password').fill('Password123!');await page.locator('button[type=submit]').click();await page.waitForURL('**/customer/dashboard');
  const emailPage=await browser.newPage();await fill(emailPage,`email-${Date.now()}@example.test`,phone2);await emailPage.locator('button[type=submit]').click();await emailPage.waitForURL('**/customer/verify');assert.equal(await emailPage.locator('#phoneCodeSend').count(),0);assert.ok(emailCode);await emailPage.locator('#code').fill(emailCode);await emailPage.locator('button.btn-primary').click();await emailPage.waitForURL('**/customer/dashboard');assert.match(await emailPage.locator('body').innerText(),/Account verified/);assert.equal(messages.length,1);
 }finally{if(browser)await browser.close();await new Promise(resolve=>provider.close(resolve));}
});

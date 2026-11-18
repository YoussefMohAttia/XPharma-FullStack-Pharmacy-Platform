import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import {createServer} from 'node:http';
import bcrypt from 'bcryptjs';
import {chromium} from 'playwright';

test('P100 applies only to Plantain 50g and is saved correctly', {timeout:90000}, async()=>{
 const dir='.wrangler/phone-test/state/v3/d1/miniflare-D1DatabaseObject';const db=new DatabaseSync(`${dir}/${readdirSync(dir).find(x=>x.endsWith('.sqlite')&&x!=='metadata.sqlite')}`);
 const email=`p100-${Date.now()}@example.test`,password='Password123!';const id=Number(db.prepare('INSERT INTO customers(fname,lname,email,password,phone,city,address,is_verified) VALUES (?,?,?,?,?,?,?,1)').run('Test','Person',email,await bcrypt.hash(password,10),'01999999999','Alexandria','Example').lastInsertRowid);
 const mail=createServer((req,res)=>{req.resume();res.writeHead(200,{'content-type':'application/json'});res.end('{}')});await new Promise(resolve=>mail.listen(8788,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();await page.addInitScript(()=>{window.bootstrap={Modal:class {constructor(element){this.element=element} show(){this.element.classList.add('show')} hide(){this.element.classList.remove('show')}}}});await page.goto('http://127.0.0.1:8793/customer/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.locator('button[type=submit]').click();await page.waitForURL('**/customer/dashboard');
  await page.goto('http://127.0.0.1:8793/customer/reserve/XPH-204');await page.locator('#discount_code').fill('P100');await page.locator('#applyDiscount').click();await page.waitForFunction(()=>document.querySelector('#applied_discount_code').value==='P100');assert.equal(await page.locator('#orderTotalAmount').innerText(),'100.00');await page.locator('#quantity').fill('2');assert.equal(await page.locator('#orderTotalAmount').innerText(),'200.00');
  await page.locator('#instapay').check();assert.equal(await page.locator('#modalTotalAmount').innerText(),'200.00');await page.evaluate(()=>document.querySelector('#instapayModal').classList.remove('show'));await page.locator('#cash').check();const date=await page.locator('#pickup_date').getAttribute('min');await page.locator('#pickup_date').fill(date);await page.locator('form[method=POST] button.btn-primary').click();await page.waitForURL('**/customer/dashboard');const order=db.prepare('SELECT product_id,quantity,price,discount_amount,discount_code FROM reservations WHERE customer_ssn=?').get(id);assert.deepEqual({...order},{product_id:'XPH-204',quantity:2,price:200,discount_amount:40,discount_code:'P100'});
  await page.goto('http://127.0.0.1:8793/customer/reserve/XPH-203');await page.locator('#discount_code').fill('P100');await page.locator('#applyDiscount').click();await page.getByText('This discount code is not valid.').waitFor();
 }finally{if(browser)await browser.close();db.prepare('DELETE FROM reservations WHERE customer_ssn=?').run(id);db.prepare('DELETE FROM customers WHERE SSN=?').run(id);db.close();await new Promise(resolve=>mail.close(resolve));}
});

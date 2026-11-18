'use strict';
const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ids=['month','year','gross','payDays','actualDays','premiumDays','overtime','holiday','night','leave','taxRate','taxCredit','minimum','privateInsurance','disability','premiumRate','overtimeFactor','holidayFactor','nightRate','hoursPerDay','unionFactor','clothing','social','service','otherGross','otherDeduction'];
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n),round=n=>Math.round((n+Number.EPSILON)*100)/100;
$('month').innerHTML=months.map((m,i)=>`<option value="${i}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`).join('');
$('year').value=new Date().getFullYear();
const num=id=>Number($(id).value)||0;
function snapshot(){return Object.fromEntries(ids.map(id=>[id,$(id).value]));}
function restore(data){for(const id of ids)if(data[id]!==undefined)$(id).value=data[id];calculate();}
function calculate(){
 $('result').hidden=false; $('save').disabled=false;
 const gross=num('gross'),days=num('payDays'),hrs=num('hoursPerDay');
 if(days<=0||hrs<=0||gross<0){$('net').textContent='Hatalı giriş';$('status').textContent='Ücret günü ve günlük çalışma saati sıfırdan büyük olmalı';return;}
 const day=gross/days;
 const overtime=round(num('overtime')*day*num('overtimeFactor'));
 const holiday=round(num('holiday')*day*num('holidayFactor'));
 const night=round(num('night')*day/hrs*num('nightRate')/100);
 const premium=round(day*num('premiumDays')*num('premiumRate')/100);
 const mesai=round(overtime+holiday);
 const employeeGross=round(gross+mesai+night+premium+num('clothing')+num('social')+num('service')+num('otherGross'));
 const insurance=round(employeeGross*.09),gss=round(employeeGross*.05),unemployment=round(employeeGross*.01),union=round(day*num('unionFactor'));
 const taxBase=round(employeeGross-insurance-gss-unemployment-union-num('privateInsurance')-num('disability'));
 const incomeTax=Math.max(0,round(taxBase*num('taxRate')/100-num('taxCredit')));
 const stamp=round(Math.max(0,employeeGross-num('minimum'))*.00759);
 const deductions=round(insurance+gss+unemployment+union+incomeTax+stamp+num('otherDeduction'));
 const net=round(employeeGross-deductions);
 $('period').textContent=months[num('month')]+' '+num('year');$('net').textContent=fmt(net);$('status').textContent='Tahmini hesaplama · Kesin bordro değildir';
 const entries=[['Temel brüt ücret',gross],['Normal mesai (brüt)',overtime],['Bayram mesaisi (brüt)',holiday],['Toplam mesai (brüt)',mesai],['Gece çalışma zammı',night],['İş primi',premium],['Giyim yardımı',num('clothing')],['Sosyal yardım',num('social')],['Hizmet zammı',num('service')],['Diğer brüt',num('otherGross')],['Çalışan brüt kazanç',employeeGross],['İşçi sigorta primi',-insurance],['GSS işçi primi',-gss],['İşsizlik sigortası',-unemployment],['Sendika aidatı',-union],['Vergiye esas ücret',taxBase],['Gelir vergisi',-incomeTax],['Damga vergisi',-stamp],['Diğer kesinti',-num('otherDeduction')],['Kesintiler toplamı',-deductions],['TAHMİNİ NET MAAŞ',net]];
 $('rows').innerHTML=entries.map(([name,value],i)=>`<div class="line ${i===entries.length-1?'total':''}"><span>${name}</span><b>${fmt(value)}</b></div>`).join('');
 return net;
}
function storage(){try{return JSON.parse(localStorage.getItem('tse-maas-records')||'{}')}catch{return {}}}
function showSaved(){const data=storage();const keys=Object.keys(data).sort().reverse();$('saved').innerHTML=keys.length?'':'<p class="muted">Henüz kayıt bulunmuyor.</p>';for(const key of keys){const line=document.createElement('div');line.className='saved-item';const name=document.createElement('span');name.textContent=key+' · '+fmt(data[key].net);const load=document.createElement('button');load.textContent='Aç';load.onclick=()=>restore(data[key].values);const del=document.createElement('button');del.textContent='Sil';del.className='del';del.onclick=()=>{if(confirm(key+' kaydı silinsin mi?')){const all=storage();delete all[key];localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved()}};line.append(name,load,del);$('saved').append(line)}}
$('calculate').onclick=calculate;
$('save').onclick=()=>{const net=calculate();if(net===undefined)return;const all=storage(),key=months[num('month')]+' '+num('year');all[key]={net,values:snapshot()};try{localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved();alert(key+' kaydedildi.')}catch{alert('Bu tarayıcıda kayıt yapılamadı.')}};
$('print').onclick=()=>window.print();
for(const id of ids)$(id).addEventListener('change',()=>{ $('net').textContent='—'; $('status').textContent='Değerler değişti. Yeniden hesaplamak için butona basın'; $('result').hidden=true; $('save').disabled=true; $('period').textContent=months[num('month')]+' '+num('year'); });
$('period').textContent=months[num('month')]+' '+num('year');showSaved();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

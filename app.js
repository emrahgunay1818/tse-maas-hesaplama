'use strict';
const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ids=['month','year','gross','payDays','actualDays','premiumDays','overtime','holiday','night','leave','taxRate','taxCredit','minimum','privateInsurance','disability','premiumRate','overtimeFactor','holidayFactor','nightRate','hoursPerDay','unionFactor','clothing','social','serviceYears','serviceUnit','otherGross','otherDeduction','hasMeal','travelMode','fareRate','applyMealSgk','mealSgkPct'];
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n),round=n=>Math.round((n+Number.EPSILON)*100)/100;
$('month').innerHTML=months.map((m,i)=>`<option value="${i}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`).join('');
$('year').value=new Date().getFullYear();
const num=id=>Number($(id).value)||0;
function snapshot(){return Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]));}
function restore(data){if(data.hasTravel && data.travelMode===undefined){data={...data,travelMode:'single',fareRate:String((Number(data.travelRate)||0)/2)};}if(data.service!==undefined && data.serviceYears===undefined){data={...data,serviceYears:String(round(Number(data.service)/26.16)),serviceUnit:'26.16'};}for(const id of ids)if(data[id]!==undefined){if($(id).type==='checkbox')$(id).checked=data[id]===true||data[id]==='true';else $(id).value=data[id];}updateAidPreview();calculate();}
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
 const service=round(num('serviceYears')*num('serviceUnit'));
 const travel=round(num('actualDays')*num('fareRate')*({none:0,single:2,double:4}[$('travelMode').value]||0));
 const meal=round(($('hasMeal').checked?1:0)*num('actualDays')*num('mealRate'));
 const employeeGross=round(gross+mesai+night+premium+num('clothing')+num('social')+service+num('otherGross')+travel+meal);
 const mealSgkExemption=$('applyMealSgk').checked&&$('hasMeal').checked
   ?round(Math.min(meal,Math.max(0,num('minimum')/30)*num('mealSgkPct')/100*num('actualDays'))):0;
 const sgkBase=round(Math.max(0,employeeGross-mealSgkExemption));
 const insurance=round(sgkBase*.09),gss=round(sgkBase*.05),unemployment=round(sgkBase*.01),union=round(day*num('unionFactor'));
 const taxBase=round(employeeGross-insurance-gss-unemployment-union-num('privateInsurance')-num('disability'));
 const incomeTax=Math.max(0,round(taxBase*num('taxRate')/100-num('taxCredit')));
 const stamp=round(Math.max(0,employeeGross-num('minimum'))*.00759);
 const deductions=round(insurance+gss+unemployment+union+incomeTax+stamp+num('otherDeduction'));
 const net=round(employeeGross-deductions);
 $('period').textContent=periodLabel();$('net').textContent=fmt(net);$('status').textContent='Tahmini hesaplama · Kesin bordro değildir';
 const entries=[['Temel brüt ücret',gross],['Normal mesai (brüt)',overtime],['Bayram mesaisi (brüt)',holiday],['Toplam mesai (brüt)',mesai],['Gece çalışma zammı',night],['İş primi',premium],['Giyim yardımı',num('clothing')],['Sosyal yardım',num('social')],['Hizmet zammı ('+num('serviceYears')+' yıl)',service],['Diğer brüt',num('otherGross')],['Yol yardımı (brüt)',travel],['Yemek yardımı (brüt)',meal],['Çalışan brüt kazanç',employeeGross],['Yemek SGK istisnası (deneme)',-mealSgkExemption],['SGK prime esas tahmini kazanç',sgkBase],['İşçi sigorta primi',-insurance],['GSS işçi primi',-gss],['İşsizlik sigortası',-unemployment],['Sendika aidatı',-union],['Vergiye esas ücret',taxBase],['Gelir vergisi',-incomeTax],['Damga vergisi',-stamp],['Diğer kesinti',-num('otherDeduction')],['Kesintiler toplamı',-deductions],['TAHMİNİ NET MAAŞ',net]];
 $('rows').innerHTML=entries.map(([name,value],i)=>`<div class="line ${i===entries.length-1?'total':''}"><span>${name}</span><b>${fmt(value)}</b></div>`).join('');
 return net;
}
function storage(){try{return JSON.parse(localStorage.getItem('tse-maas-records')||'{}')}catch{return {}}}
function showSaved(){const data=storage();const keys=Object.keys(data).sort().reverse();$('saved').innerHTML=keys.length?'':'<p class="muted">Henüz kayıt bulunmuyor.</p>';for(const key of keys){const line=document.createElement('div');line.className='saved-item';const name=document.createElement('span');name.textContent=key+' · '+fmt(data[key].net);const load=document.createElement('button');load.textContent='Aç';load.onclick=()=>restore(data[key].values);const del=document.createElement('button');del.textContent='Sil';del.className='del';del.onclick=()=>{if(confirm(key+' kaydı silinsin mi?')){const all=storage();delete all[key];localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved()}};line.append(name,load,del);$('saved').append(line)}}
function updateAidPreview(){const d=num('actualDays');const fare=num('fareRate');const rides={none:0,single:2,double:4}[$('travelMode').value]||0;$('aidPreview').textContent='Yol: '+fmt(round(d*fare*rides))+' · Yemek: '+fmt(round($('hasMeal').checked?d*num('mealRate'):0));}
function periodLabel(){return months[num('month')]+' '+num('year');}
$('calculate').onclick=calculate;
$('save').onclick=()=>{const net=calculate();if(net===undefined)return;const all=storage(),key=periodLabel();all[key]={net,values:snapshot()};try{localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved();alert(key+' kaydedildi.')}catch{alert('Bu tarayıcıda kayıt yapılamadı.')}};
$('print').onclick=()=>window.print();
for(const id of ids)$(id).addEventListener('change',()=>{updateAidPreview(); $('net').textContent='—'; $('status').textContent='Değerler değişti. Yeniden hesaplamak için butona basın'; $('result').hidden=true; $('save').disabled=true; $('period').textContent=periodLabel(); });
$('period').textContent=periodLabel();updateAidPreview();showSaved();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

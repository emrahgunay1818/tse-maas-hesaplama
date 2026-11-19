'use strict';
const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ids=['month','year','gross','payDays','actualDays','premiumDays','overtime','holiday','night','leave','taxRate','taxCredit','minimum','privateInsurance','disability','premiumRate','overtimeFactor','holidayFactor','nightRate','hoursPerDay','unionFactor','clothing','social','serviceYears','serviceUnit','otherGross','otherDeduction','transportEligible'];
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n),round=n=>Math.round((n+Number.EPSILON)*100)/100;
$('month').innerHTML=months.map((m,i)=>`<option value="${i}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`).join('');
$('year').value=new Date().getFullYear();
const num=id=>Number($(id).value)||0;
function snapshot(){return Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]));}
function restore(data){data={transportEligible:'0',...data};if(data.service!==undefined && data.serviceYears===undefined){data={...data,serviceYears:String(round(Number(data.service)/26.16)),serviceUnit:'26.16'};}for(const id of ids)if(data[id]!==undefined){if($(id).type==='checkbox')$(id).checked=data[id]===true||data[id]==='true';else $(id).value=data[id];}calculate();}
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
 const employeeGross=round(gross+mesai+night+premium+num('clothing')+num('social')+service+num('otherGross'));
 const sgkBase=round(Math.max(0,employeeGross));
 const insurance=round(sgkBase*.09),gss=round(sgkBase*.05),unemployment=round(sgkBase*.01),union=round(day*num('unionFactor'));
 const taxBase=round(employeeGross-insurance-gss-unemployment-union-num('privateInsurance')-num('disability'));
 const incomeTax=Math.max(0,round(taxBase*num('taxRate')/100-num('taxCredit')));
 const stamp=round(Math.max(0,employeeGross-num('minimum'))*.00759);
 const deductions=round(insurance+gss+unemployment+union+incomeTax+stamp+num('otherDeduction'));
 const transportDayRate = 40;
 const transportNet = $('transportEligible').value === '1'
   ? round(Math.max(0, num('actualDays')) * transportDayRate)
   : 0;
 const net = round(employeeGross - deductions + transportNet);
 $('period').textContent=periodLabel();$('net').textContent=fmt(net);$('status').textContent='Tahmini hesaplama · Kesin bordro değildir';
 const entries=[['Temel brüt ücret',gross],['Normal mesai (brüt)',overtime],['Bayram mesaisi (brüt)',holiday],['Toplam mesai (brüt)',mesai],['Gece çalışma zammı',night],['İş primi',premium],['Giyim yardımı',num('clothing')],['Sosyal yardım',num('social')],['Hizmet zammı ('+num('serviceYears')+' yıl)',service],['Diğer brüt',num('otherGross')],['Çalışan brüt kazanç',employeeGross],['SGK prime esas tahmini kazanç',sgkBase],['İşçi sigorta primi',-insurance],['GSS işçi primi',-gss],['İşsizlik sigortası',-unemployment],['Sendika aidatı',-union],['Vergiye esas ücret',taxBase],['Gelir vergisi',-incomeTax],['Damga vergisi',-stamp],['Diğer kesinti',-num('otherDeduction')],['Kesintiler toplamı',-deductions],['Ulaşım yardımı (net)',transportNet],['TAHMİNİ NET MAAŞ',net]];
 $('rows').innerHTML=entries.map(([name,value],i)=>`<div class="line ${i===entries.length-1?'total':''}"><span>${name}</span><b>${fmt(value)}</b></div>`).join('');
 return net;
}
function storage(){try{return JSON.parse(localStorage.getItem('tse-maas-records')||'{}')}catch{return {}}}
function showSaved(){const data=storage();const keys=Object.keys(data).sort().reverse();$('saved').innerHTML=keys.length?'':'<p class="muted">Henüz kayıt bulunmuyor.</p>';for(const key of keys){const line=document.createElement('div');line.className='saved-item';const name=document.createElement('span');name.textContent=key+' · '+fmt(data[key].net);const load=document.createElement('button');load.type='button';load.textContent='Aç';load.onclick=()=>{try{if(!data[key]||!data[key].values)throw new Error('Kayıt bilgisi eksik');restore(data[key].values);$('status').textContent=key+' kaydı açıldı · Tahmini hesaplama';$('result').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){alert('Kayıt açılamadı: '+e.message);}};const del=document.createElement('button');del.textContent='Sil';del.className='del';del.onclick=()=>{if(confirm(key+' kaydı silinsin mi?')){const all=storage();delete all[key];localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved()}};line.append(name,load,del);$('saved').append(line)}}
function periodLabel(){return months[num('month')]+' '+num('year');}
$('calculate').onclick=calculate;
$('save').onclick=()=>{const net=calculate();if(net===undefined)return;const all=storage(),key=periodLabel();all[key]={net,values:snapshot()};try{localStorage.setItem('tse-maas-records',JSON.stringify(all));showSaved();alert(key+' kaydedildi.')}catch{alert('Bu tarayıcıda kayıt yapılamadı.')}};
$('print').onclick=()=>{
  if($('result').hidden){alert('Önce maaşı hesaplayın.');return;}
  // Open a dedicated printable view: iOS Safari supports Share > Print / Save to Files.
  const printable=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TSE Maaş Dökümü - ${periodLabel()}</title><style>body{font:15px -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#222;max-width:780px;margin:24px auto;padding:12px}h1{color:#a51b2c;font-size:24px}h2{font-size:19px}.line{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #ddd;padding:8px 0}.line b{white-space:nowrap}.total{font-size:18px;font-weight:700;color:#a51b2c}button{background:#a51b2c;color:white;border:0;border-radius:8px;padding:12px 16px;font-size:16px;margin:10px 0}@media print{button,.help{display:none!important}body{margin:0;padding:0}.line{break-inside:avoid}}</style></head><body><h1>TSE Maaş Hesaplama</h1><p><b>Dönem:</b> ${periodLabel()}</p><h2>Tahmini net maaş: ${$('net').textContent}</h2><div>${$('rows').innerHTML}</div><p style="font-size:12px;color:#666">Tahmini hesaplama, resmî bordro değildir.</p><button onclick="window.print()">Yazdır / PDF olarak kaydet</button><p class="help">iPhone: Paylaş menüsü → Yazdır → Önizlemeyi büyüt → Paylaş → Dosyalara Kaydet.</p></body></html>`;
  const w=window.open('','_blank');
  if(!w){window.print();return;}
  w.document.open();w.document.write(printable);w.document.close();w.focus();
};
for(const id of ids)$(id).addEventListener('change',()=>{$('net').textContent='—'; $('status').textContent='Değerler değişti. Yeniden hesaplamak için butona basın'; $('result').hidden=true; $('save').disabled=true; $('period').textContent=periodLabel(); });
$('period').textContent=periodLabel();showSaved();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

for (const field of document.querySelectorAll('input[type="number"]')) {
  let clearedZero = false;
  field.addEventListener('focus', () => {
    clearedZero = field.valueAsNumber === 0;
    if (clearedZero) field.value = '';
  });
  field.addEventListener('blur', () => {
    if (clearedZero && field.value === '' && !field.validity.badInput) {
      field.value = '0';
    }
    clearedZero = false;
  });
}
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
installButton.hidden = !(standalone || appleMobile || /Android/i.test(navigator.userAgent));

function showInstalledStatus() {
  installButton.hidden = false;
  installButton.disabled = true;
  installButton.textContent = 'Ana ekrana eklendi';
  installHint.hidden = true;
}

if (standalone) showInstalledStatus();
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  if (installButton.disabled || appleMobile) return;
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  showInstalledStatus();
});
installButton.addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      return;
    } catch { /* Show manual installation steps below. */ }
  }
  installHint.textContent = appleMobile
    ? 'Safari’de Paylaş menüsünü aç, “Ana Ekrana Ekle”yi seç ve “Ekle”ye dokun.'
    : 'Chrome menüsünü (⋮) aç. “Ana ekrana ekle” veya “Uygulamayı yükle”yi seçip onayla.';
  installHint.hidden = false;
});

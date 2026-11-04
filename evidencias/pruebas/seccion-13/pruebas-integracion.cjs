const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const url=process.env.VASTAGO_URL || 'https://vastago-sistema.onrender.com/';
const password=process.env.VASTAGO_DEMO_PASSWORD;
const results=[];
const out=path.join(__dirname,'ejecucion',new Date().toISOString().replace(/[:.]/g,'-'));
(async()=>{
  assert(password,'Falta VASTAGO_DEMO_PASSWORD');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:950},timezoneId:'America/Lima'});
  page.setDefaultTimeout(12000);
  const match=(r,p,m='GET')=>new URL(r.url()).pathname===p && r.request().method()===m;
  const nav=name=>page.locator('ul.nav').getByRole('button',{name,exact:true});
  const snap=id=>page.screenshot({path:path.join(out,id+'.png'),mask:[page.locator('#correo-destino'),page.locator('tbody tr td:nth-child(2)').filter({hasText:/@/})]});
  async function run(id,nombre,check){
    const start=Date.now();
    let estado='Aprobado',detalle;
    try { detalle=await check(); }
    catch(e){estado=e.blocked?'Bloqueado':'Fallido';detalle=String(e.message).replaceAll(password,'[oculto]');}
    await snap(id).catch(()=>{});
    results.push({id,nombre,estado,detalle,ms:Date.now()-start});
    console.log(id,estado,detalle);
  }
  const blocked=message=>{throw Object.assign(new Error(message),{blocked:true});};
  let critical, config, id;
  try {
    await page.goto(url,{timeout:90000});
    await page.locator('#email').fill('admin@vastagoyco.pe');
    await page.locator('#pwd').fill(password);
    const login=page.waitForResponse(r=>match(r,'/api/auth/login','POST'));
    await page.getByRole('button',{name:'Ingresar',exact:true}).click();
    assert.equal((await login).status(),200);
    await run('CI01','Flask y PostgreSQL: lectura de inventario',async()=>{
      const wait=page.waitForResponse(r=>match(r,'/api/inventario'));
      await nav('Inventario').click();
      const response=await wait;
      assert.equal(response.status(),200);
      const rows=await response.json();
      await page.locator('tbody tr').first().waitFor();
      assert.equal(await page.locator('tbody tr').count(),rows.length);
      assert(rows.length>0);
      critical=rows.filter(x=>x.estado==='crit').length;
      return {http:200,insumos:rows.length,criticos:critical};
    });
    await run('CI02','Configuración de Resend en Vástago',async()=>{
      const wait=page.waitForResponse(r=>match(r,'/api/correo'));
      await nav('Correo y alertas').click();
      const response=await wait;
      assert.equal(response.status(),200);
      config=await response.json();
      await page.getByRole('heading',{name:'Historial de envíos'}).waitFor();
      if(!config.proveedor_configurado) blocked('Falta clave en Render');
      const recipient=process.env.VASTAGO_DESTINATARIO;
      if(recipient && config.configuracion.destinatario!==recipient){
        const saved=page.waitForResponse(r=>match(r,'/api/correo/configuracion','PUT'));
        await page.getByLabel('Correo destinatario',{exact:true}).fill(recipient);
        await page.getByRole('button',{name:'Guardar preferencias',exact:true}).click();
        const response=await saved;
        assert.equal(response.status(),200);
        config.configuracion=await response.json();
        assert.equal(config.configuracion.destinatario,recipient);
        console.log('Destinatario actualizado para la prueba');
      }
      if(!config.configuracion.destinatario) blocked('Falta destinatario en Render');
      return {http:200,proveedorConfigurado:true,destinatarioConfigurado:true};
    });
    await run('CI03','Encolado persistente del resumen manual',async()=>{
      if(process.env.VASTAGO_AUTORIZAR_ENVIO!=='1') blocked('El envío requiere autorización');
      if(!config?.proveedor_configurado || !config.configuracion.destinatario || !critical) blocked('Se requiere proveedor, destinatario e insumos críticos');
      const button=page.getByRole('button',{name:'Enviar resumen ahora',exact:true});
      await button.waitFor();
      page.once('dialog',dialog=>dialog.accept());
      const wait=page.waitForResponse(r=>match(r,'/api/correo/enviar','POST'));
      await button.click();
      const response=await wait;
      assert.equal(response.status(),202);
      const data=await response.json();
      assert(data.encolado && Number.isInteger(data.id));
      id=data.id;
      const status=await page.getByRole('status').filter({hasText:'Resumen en cola de envío'}).waitFor();
      return {http:202,id,estadoInicial:data.estado};
    });
    await run('CI04','Respuesta de Resend registrada en PostgreSQL',async()=>{
      if(!id) blocked('Se requiere el ID del envío de CI03');
      let row;
      for(let i=0;i<12;i++){
        const wait=page.waitForResponse(r=>match(r,'/api/correo'));
        await page.getByRole('button',{name:'Actualizar',exact:true}).click();
        const response=await wait;
        assert.equal(response.status(),200);
        row=(await response.json()).historial.find(x=>x.id===id);
        if(row?.estado==='Aceptado' || row?.estado==='Fallido') break;
        await new Promise(resolve=>setTimeout(resolve,4000));
      }
      assert(row,'El envío no figura en el historial');
      assert.equal(row.estado,'Aceptado',row.error || 'El proveedor aún no confirmó el envío');
      assert(row.proveedor_id,'Falta ID de Resend');
      await page.getByText(row.proveedor_id,{exact:true}).waitFor();
      return {id,estado:row.estado,proveedorId:row.proveedor_id,intentos:row.intentos,registrado:row.actualizado_en};
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify({url,fecha:new Date().toISOString(),results},null,2));
    console.log(out);
  }
})().catch(e=>{console.error(String(e.message).replaceAll(password || 'xxx','[oculto]'));process.exitCode=1;});


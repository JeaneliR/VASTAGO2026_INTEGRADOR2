import subprocess, html, json
from PIL import Image
import numpy as np
C700="#4A2C1F"; C900="#2E1B12"
Q_COLS="""select c.table_name, c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale, c.is_nullable, c.ordinal_position
from information_schema.columns c join information_schema.tables t on t.table_name=c.table_name and t.table_schema=c.table_schema
where c.table_schema='public' and t.table_type='BASE TABLE' order by 1,8"""
Q_CON="""select cl.relname, con.contype, con.conname, array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k) as cols,
 (select r.relname from pg_class r where r.oid=con.confrelid) as ref
from pg_constraint con join pg_class cl on cl.oid=con.conrelid join pg_namespace n on n.oid=cl.relnamespace where n.nspname='public' and con.contype in ('p','f','u')"""
def q(sql):
    out=subprocess.check_output(['su','postgres','-c',f'psql -d vastago_apf3 -At -F"\\t" -c "{sql}"'],input=None).decode()
    return [l.split('\t') for l in out.strip().split('\n') if l]
def q2(sql):
    import tempfile,os
    f=tempfile.NamedTemporaryFile('w',suffix='.sql',delete=False); f.write(sql); f.close(); os.chmod(f.name,0o644)
    out=subprocess.check_output(['su','postgres','-c',f'psql -d vastago_apf3 -At -F"|" -f {f.name}']).decode()
    return [l.split('|') for l in out.strip().split('\n') if l]
cols={}
for t,c,dt,ml,np_,ns,nul,pos in q2(Q_COLS):
    ty={'character varying':'VARCHAR','timestamp with time zone':'TIMESTAMPTZ','integer':'INT','bigint':'BIGINT','smallint':'SMALLINT','numeric':'NUMERIC','boolean':'BOOLEAN','text':'TEXT','date':'DATE','jsonb':'JSONB','bytea':'BYTEA','character':'CHAR','double precision':'FLOAT'}.get(dt,dt.upper())
    if ty in('VARCHAR','CHAR') and ml: ty+=f'({ml})'
    if ty=='NUMERIC' and np_: ty+=f'({np_},{ns})'
    cols.setdefault(t,[]).append([c,ty,'' ,nul])
pk={};fk={};uq={};rel=[]
for t,ct,name,cs,ref in q2(Q_CON):
    cs=cs.strip('{}').split(',')
    if ct=='p': pk.setdefault(t,set()).update(cs)
    elif ct=='f':
        fk.setdefault(t,set()).update(cs); rel.append((ref,t))
    elif ct=='u' and len(cs)==1: uq.setdefault(t,set()).update(cs)
json.dump({'cols':cols,'rel':rel},open('model.json','w'))
print(len(cols),'tablas',len(rel),'relaciones')
def flag(t,c):
    f=''
    if c in pk.get(t,()): f+='PK '
    if c in fk.get(t,()): f+='FK'
    return f.strip()
def tabla(t,solo_claves=False,fs=11):
    rows=[]
    n_otros=0
    for c,ty,_,nul in cols[t]:
        f=flag(t,c)
        if solo_claves and not f: n_otros+=1; continue
        ty2=html.escape(ty+(' UQ' if c in uq.get(t,()) else ''))
        mark=('<B>PK </B>' if 'PK' in f else '')+('<I>FK </I>' if 'FK' in f else '')
        rows.append(f'<TR><TD ALIGN="LEFT" PORT="{c}"><FONT POINT-SIZE="{fs}">{mark}{c}</FONT></TD><TD ALIGN="LEFT"><FONT POINT-SIZE="{fs-1}" COLOR="#6B3F2A">{ty2}</FONT></TD></TR>')
    if solo_claves and n_otros: rows.append(f'<TR><TD COLSPAN="2" ALIGN="LEFT"><FONT POINT-SIZE="{fs-1}" COLOR="#8A5636"><I>+ {n_otros} atributos</I></FONT></TD></TR>')
    return f'{t} [shape=plain label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" COLOR="{C700}"><TR><TD COLSPAN="2" BGCOLOR="{C700}"><FONT COLOR="white" POINT-SIZE="{fs+2}"><B>{t}</B></FONT></TD></TR>{"".join(rows)}</TABLE>>];'
MOD={
 'Seguridad, auditoría y correo':['roles','usuarios','sesiones','auditoria','correo_config','correo_envios','app_migraciones','alertas'],
 'Inventario y lotes de insumos':['insumos','lotes_insumo','movimientos_inventario','kardex_insumos','kardex_movimientos'],
 'Producción y producto terminado':['productos','bom','equipos','ruta_etapas','ordenes_produccion','orden_etapas','etapa_consumos','lotes_pt','movimientos_pt'],
 'Analítica y datos históricos':['series_demanda','demanda_historica','pronosticos','produccion_historica'],
}
COLORS={'Seguridad, auditoría y correo':('#EEF3F9','#2B5C8A'),'Inventario y lotes de insumos':('#E8F3EC','#2E7D4F'),'Producción y producto terminado':('#FBF0D6','#8A6410'),'Analítica y datos históricos':('#F3E8EF','#7A3F66')}
def trim(p,pad=20):
    im=Image.open(p).convert('RGB');a=np.array(im)
    r=np.where(np.any(a!=255,axis=(1,2)))[0];c=np.where(np.any(a!=255,axis=(0,2)))[0]
    im.crop((max(c.min()-pad,0),max(r.min()-pad,0),min(c.max()+pad,a.shape[1]),min(r.max()+pad,a.shape[0]))).save(p)
def render(name,src,dpi):
    open(name+'.dot','w').write(src)
    subprocess.run(['dot','-Tpng',f'-Gdpi={dpi}',name+'.dot','-o',name+'.png'],check=True); trim(name+'.png')
    print(name,Image.open(name+'.png').size)
EDGE=f'edge [color="{C700}" arrowhead=crow arrowtail=tee dir=both penwidth=1.3];'

GRP=[
 ('14b. Seguridad y auditoría',['roles','usuarios','sesiones','auditoria'],'Seguridad, auditoría y correo'),
 ('14c. Alertas, correo y control de migraciones',['alertas','correo_config','correo_envios','app_migraciones'],'Seguridad, auditoría y correo'),
 ('14d. Inventario de insumos, lotes y kardex',['insumos','lotes_insumo','movimientos_inventario','kardex_insumos','kardex_movimientos'],'Inventario y lotes de insumos'),
 ('14e. Producción: productos, recetas y rutas',['productos','bom','equipos','ruta_etapas'],'Producción y producto terminado'),
 ('14e2. Producción: órdenes, etapas y consumos',['ordenes_produccion','orden_etapas','etapa_consumos'],'Producción y producto terminado'),
 ('14f. Producto terminado',['lotes_pt','movimientos_pt'],'Producción y producto terminado'),
 ('14g. Analítica y datos históricos de planta',['series_demanda','demanda_historica','pronosticos','produccion_historica'],'Analítica y datos históricos'),
]
res={}
for k,(titulo,ts,m) in enumerate(GRP):
    bg,bd=COLORS[m]
    ext=[]
    rd='TB' if titulo[:3] in ('14c','14g') else 'LR'
    src=f'digraph G {{ rankdir={rd}; nodesep=0.4; ranksep=1.0; bgcolor="white"; {EDGE}\n'
    src+='\n'.join(tabla(t,False,13) for t in ts)+'\n'
    src+='\n'.join(f'{t} [shape=box style="filled,dashed" fillcolor="#F6EFE3" color="{C700}" fontname="Inter" fontsize=13 label="{t}\\n(ver otra figura)"];' for t in ext)+'\n'
    src+='\n'.join(f'{a} -> {b};' for a,b in rel if (a in ts or a in ext) and (b in ts or b in ext) and (a in ts or b in ts) and a!=b)+'}'
    render(f'er_g{k+1}',src,200)
    w,h=Image.open(f'er_g{k+1}.png').size
    res[k+1]=(titulo,w/200,h/200,ext)
    print(titulo,round(w/200,1),'x',round(h/200,1),'in; externas:',ext)
# general solo nombres
src=f'digraph G {{ rankdir=LR; ratio=fill; size="15,8.4!"; nodesep=0.3; ranksep=0.6; bgcolor="white"; {EDGE}\n node [shape=box style="filled" fontname="Inter" fontsize=16 margin="0.18,0.1"];\n'
for i,(m,ts) in enumerate(MOD.items()):
    bg,bd=COLORS[m]
    src+=f'subgraph cluster_{i} {{ label=<<B>{html.escape(m)}</B>>; fontname="Inter"; fontsize=18; style="rounded,filled"; fillcolor="{bg}"; color="{bd}"; penwidth=2;\n'+'\n'.join(f'{t} [fillcolor="white" color="{C700}" label="{t}"];' for t in ts)+'}\n'
src+='\n'.join(f'{a} -> {b};' for a,b in rel if a!=b)+'}'
render('er_general',src,200)
w,h=Image.open('er_general.png').size; print('general',w/200,h/200)

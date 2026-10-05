/* --- LÓGICA DE INTERACTIVIDAD Y CARGA DINÁMICA (VÁSTAGO & CO) --- */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Control de navegación en el menú lateral (Sidebar) y cambio de vistas
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const vistas = document.querySelectorAll('.vista-seccion');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.getAttribute('data-target');

            // Ocultar todas las vistas
            vistas.forEach(v => v.style.display = 'none');

            // Mostrar la vista seleccionada
            const vistaSeleccionada = document.getElementById(targetId);
            if (vistaSeleccionada) {
                vistaSeleccionada.style.display = 'block';
            }
        });
    });

    // 2. Cargar datos guardados previamente o los por defecto de data.js
    cargarDatosPersistentes();

    // Renderizar tablas dinámicamente
    renderInventario();
    renderProduccion();
    renderTablasSecundarias();

    // 3. Botones de acción rápida (Modales)
    const botonesAccion = document.querySelectorAll('.page-header-flex .btn-primary-action');
    
    if (botonesAccion.length > 0) {
        botonesAccion[0].addEventListener('click', () => {
            abrirModalInsumo();
        });
    }

    if (botonesAccion.length > 1) {
        botonesAccion[1].addEventListener('click', () => {
            abrirModalProduccion();
        });
    }

    // 4. Perfil del usuario logueado (HU12)
    const usuarioGuardado = localStorage.getItem('usuarioActivo');
    if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        const spanNombre = document.querySelector('.user-profile .user-name');
        const spanRol = document.querySelector('.user-profile .user-role');

        if (spanNombre) spanNombre.textContent = usuario.nombre;
        if (spanRol) spanRol.textContent = usuario.rol;
    }
});

// --- FUNCIONES DE PERSISTENCIA Y RENDERIZADO ---

function cargarDatosPersistentes() {
    const insumosGuardados = localStorage.getItem('materiasPrimasVastago');
    if (insumosGuardados && typeof mockData !== 'undefined') {
        mockData.materiasPrimas = JSON.parse(insumosGuardados);
    }

    const ordenesGuardadas = localStorage.getItem('ordenesProduccionVastago');
    if (ordenesGuardadas && typeof mockData !== 'undefined') {
        mockData.ordenesProduccion = JSON.parse(ordenesGuardadas);
    }
}

// Renderizar Inventario
function renderInventario() {
    const tbody = document.getElementById('tabla-inventario-body');
    if (!tbody || typeof mockData === 'undefined' || !mockData.materiasPrimas) return;

    tbody.innerHTML = '';

    mockData.materiasPrimas.forEach(item => {
        const badgeClass = item.estado === 'Crítico' ? 'badge-critical' : 'badge-ok';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td><strong>${item.nombre}</strong></td>
            <td>${item.categoria}</td>
            <td>${item.stockActual} ${item.unidad || ''}</td>
            <td>${item.unidad || 'kg'}</td>
            <td>${item.stockMinimo} ${item.unidad || ''}</td>
            <td><span class="badge ${badgeClass}">${item.estado}</span></td>
            <td>${item.ultimoLote}</td>
            <td><a href="#" class="action-link">Ver</a> | <a href="#" class="action-link">Editar</a></td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderizar Órdenes de Producción (Usando ordenesProduccion del data.js)
function renderProduccion() {
    const tbodyProd = document.getElementById('tabla-produccion-body');
    if (!tbodyProd || typeof mockData === 'undefined' || !mockData.ordenesProduccion) return;

    tbodyProd.innerHTML = '';

    mockData.ordenesProduccion.forEach(orden => {
        let badgeClass = 'badge-pending';
        if (orden.estado === 'En proceso') badgeClass = 'badge-in-process';
        if (orden.estado === 'Finalizada') badgeClass = 'badge-ok';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${orden.nroOrden}</strong></td>
            <td>${orden.producto}</td>
            <td>${orden.cantidadPlanificada}</td>
            <td>${orden.fechaProgramada}</td>
            <td>${orden.responsable}</td>
            <td><span class="badge ${badgeClass}">${orden.estado}</span></td>
            <td><a href="#" class="action-link">Ver</a> | <a href="#" class="action-link">Editar</a></td>
        `;
        tbodyProd.appendChild(tr);
    });
}

// Renderizar Movimientos, Alertas y Lotes
function renderTablasSecundarias() {
    // Movimientos
    const tbodyMov = document.getElementById('tabla-movimientos-body');
    if (tbodyMov && mockData.movimientos) {
        tbodyMov.innerHTML = mockData.movimientos.map(m => `
            <tr><td>${m.fecha}</td><td><span class="badge ${m.tipo === 'Salida' ? 'badge-critical' : 'badge-ok'}">${m.tipo}</span></td><td>${m.insumo}</td><td>${m.cantidad}</td><td>${m.referencia}</td><td>${m.responsable}</td></tr>
        `).join('');
    }

    // Alertas
    const tbodyAl = document.getElementById('tabla-alertas-body');
    if (tbodyAl && mockData.alertas) {
        tbodyAl.innerHTML = mockData.alertas.map(a => `
            <tr><td><strong>${a.titulo}</strong></td><td>${a.desc}</td><td><span class="badge ${a.tipo === 'Crítica' ? 'badge-critical' : 'badge-warning'}">${a.tipo}</span></td></tr>
        `).join('');
    }

    // Lotes
    const tbodyLot = document.getElementById('tabla-lotes-body');
    if (tbodyLot && mockData.lotes) {
        tbodyLot.innerHTML = mockData.lotes.map(l => `
            <tr><td><strong>${l.lote}</strong></td><td>${l.orden}</td><td>${l.producto}</td><td>${l.planificado}</td><td>${l.insumos}</td><td><span class="badge ${l.estado === 'En producción' ? 'badge-in-process' : 'badge-ok'}">${l.estado}</span></td></tr>
        `).join('');
    }
}

// --- MODAL: REGISTRAR MATERIA PRIMA (HU01) ---
function abrirModalInsumo() {
    if (document.getElementById('modalInsumo')) return;

    const modalHTML = `
        <div id="modalInsumo" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; padding: 30px; border-radius: 8px; width: 400px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <h3 style="margin-bottom: 15px; color: #3b2314;">Registrar Nueva Materia Prima (HU01)</h3>
                <form id="formNuevoInsumo">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Código:</label>
                        <input type="text" id="nuevoCodigo" placeholder="Ej. INS-CAC-003" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Nombre del Insumo:</label>
                        <input type="text" id="nuevoNombre" placeholder="Ej. Manteca de cacao" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Categoría:</label>
                        <input type="text" id="nuevaCategoria" placeholder="Ej. Derivados" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Stock Actual:</label>
                        <input type="number" id="nuevoStock" placeholder="Ej. 50" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Stock Mínimo:</label>
                        <input type="number" id="nuevoMinimo" placeholder="Ej. 40" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Nro. de Lote:</label>
                        <input type="text" id="nuevoLote" placeholder="Ej. CP-260906-01" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="cerrarModalInsumo" style="padding: 8px 12px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                        <button type="submit" style="padding: 8px 12px; background: #5a3822; color: white; border: none; border-radius: 4px; cursor: pointer;">Guardar Insumo</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cerrarModalInsumo').addEventListener('click', () => {
        document.getElementById('modalInsumo').remove();
    });

    document.getElementById('formNuevoInsumo').addEventListener('submit', (e) => {
        e.preventDefault();

        const stockActual = parseFloat(document.getElementById('nuevoStock').value);
        const stockMinimo = parseFloat(document.getElementById('nuevoMinimo').value);
        const estadoCalculado = stockActual <= stockMinimo ? 'Crítico' : 'Disponible';

        const nuevoInsumo = {
            codigo: document.getElementById('nuevoCodigo').value,
            nombre: document.getElementById('nuevoNombre').value,
            categoria: document.getElementById('nuevaCategoria').value,
            stockActual: stockActual,
            unidad: "kg",
            stockMinimo: stockMinimo,
            estado: estadoCalculado,
            ultimoLote: document.getElementById('nuevoLote').value
        };

        mockData.materiasPrimas.push(nuevoInsumo);
        localStorage.setItem('materiasPrimasVastago', JSON.stringify(mockData.materiasPrimas));

        renderInventario();
        document.getElementById('modalInsumo').remove();
        alert('¡Insumo registrado con éxito!');
    });
}

// --- MODAL: NUEVA ORDEN DE PRODUCCIÓN (HU04, HU05, HU06) ---
function abrirModalProduccion() {
    if (document.getElementById('modalProduccion')) return;

    const modalHTML = `
        <div id="modalProduccion" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; padding: 30px; border-radius: 8px; width: 420px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <h3 style="margin-bottom: 15px; color: #3b2314;">Nueva Orden de Producción (HU04 - HU06)</h3>
                <form id="formNuevaOrden">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Nro. de Orden / Lote:</label>
                        <input type="text" id="nroOrden" value="OP-260906-010" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Producto a Fabricar:</label>
                        <select id="productoOrden" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="Tableta 70 % cacao">Tableta 70 % cacao</option>
                            <option value="Chocolate con leche">Chocolate con leche</option>
                            <option value="Tableta 85 % cacao">Tableta 85 % cacao</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Cantidad Planificada:</label>
                        <input type="text" id="cantidadOrden" placeholder="Ej. 5,000 unidades" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Fecha Programada:</label>
                        <input type="date" id="fechaOrden" value="2026-09-06" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Responsable:</label>
                        <input type="text" id="responsableOrden" value="Javier M." required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Estado Inicial:</label>
                        <select id="estadoOrden" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="Pendiente">Pendiente</option>
                            <option value="En proceso">En proceso</option>
                        </select>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="cerrarModalProd" style="padding: 8px 12px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                        <button type="submit" style="padding: 8px 12px; background: #5a3822; color: white; border: none; border-radius: 4px; cursor: pointer;">Crear Orden (BOM)</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cerrarModalProd').addEventListener('click', () => {
        document.getElementById('modalProduccion').remove();
    });

    document.getElementById('formNuevaOrden').addEventListener('submit', (e) => {
        e.preventDefault();

        const fechaVal = document.getElementById('fechaOrden').value;
        const partesFecha = fechaVal.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

        const nuevaOrden = {
            nroOrden: document.getElementById('nroOrden').value,
            producto: document.getElementById('productoOrden').value,
            cantidadPlanificada: document.getElementById('cantidadOrden').value,
            fechaProgramada: fechaFormateada,
            responsable: document.getElementById('responsableOrden').value,
            estado: document.getElementById('estadoOrden').value
        };

        mockData.ordenesProduccion.unshift(nuevaOrden);
        localStorage.setItem('ordenesProduccionVastago', JSON.stringify(mockData.ordenesProduccion));

        renderProduccion();
        document.getElementById('modalProduccion').remove();
        alert('¡Orden de producción creada con éxito!');
    });
}
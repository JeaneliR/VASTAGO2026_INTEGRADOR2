/* --- DATOS SIMULADOS DEL SISTEMA (VÁSTAGO & CO) --- */

const mockData = {
    // Usuarios del sistema (HU12 - Seguridad y roles)
    usuarios: [
        {
            email: "javier@vastago.com",
            password: "123",
            nombre: "Javier M.",
            rol: "Jefe de Operaciones"
        },
        {
            email: "almacen@vastago.com",
            password: "123",
            nombre: "Carlos Almacén",
            rol: "Encargado de Almacén"
        },
        {
            email: "gerencia@vastago.com",
            password: "123",
            nombre: "María Gerencia",
            rol: "Gerente General"
        }
    ],

    // Materias primas (Módulo de Inventario - Sprint 3)
    materiasPrimas: [
        {
            codigo: "INS-CAC-001",
            nombre: "Cacao orgánico",
            categoria: "Cacao",
            stockActual: 84,
            unidad: "kg",
            stockMinimo: 100,
            estado: "Crítico",
            ultimoLote: "CP-260904-17"
        },
        {
            codigo: "AZ-260903-08",
            nombre: "Azúcar rubia",
            categoria: "Endulzantes",
            stockActual: 310,
            unidad: "kg",
            stockMinimo: 150,
            estado: "Disponible",
            ultimoLote: "AZ-260903-08"
        },
        {
            codigo: "MC-260902-03",
            nombre: "Manteca de cacao",
            categoria: "Grasas",
            stockActual: 120,
            unidad: "kg",
            stockMinimo: 80,
            estado: "Disponible",
            ultimoLote: "MC-260902-03"
        },
        {
            codigo: "LP-260901-11",
            nombre: "Leche en polvo",
            categoria: "Lácteos",
            stockActual: 226,
            unidad: "kg",
            stockMinimo: 120,
            estado: "Disponible",
            ultimoLote: "LP-260901-11"
        },
        {
            codigo: "LS-260905-02",
            nombre: "Lecitina de soya",
            categoria: "Aditivos",
            stockActual: 45,
            unidad: "kg",
            stockMinimo: 25,
            estado: "Disponible",
            ultimoLote: "LS-260905-02"
        }
    ],

    // Órdenes de producción (Módulo de Producción)
    ordenesProduccion: [
        {
            nroOrden: "OP-260906-008",
            producto: "Tableta 70 % cacao",
            cantidadPlanificada: "12,000 unidades",
            fechaProgramada: "06/09/2026",
            responsable: "Javier M.",
            estado: "En proceso"
        },
        {
            nroOrden: "OP-260906-009",
            producto: "Tableta 70 % cacao",
            cantidadPlanificada: "4,000 unidades",
            fechaProgramada: "06/09/2026",
            responsable: "Javier M.",
            estado: "Pendiente"
        },
        {
            nroOrden: "OP-260905-006",
            producto: "Chocolate con leche",
            cantidadPlanificada: "8,000 unidades",
            fechaProgramada: "05/09/2026",
            responsable: "Luis P.",
            estado: "Finalizada"
        }
    ],

    // Movimientos recientes de inventario
    movimientos: [
        { fecha: "06/09/2026", tipo: "Salida", insumo: "Cacao orgánico", cantidad: "-70 kg", referencia: "OP-260906-008", responsable: "Javier M." },
        { fecha: "05/09/2026", tipo: "Entrada", insumo: "Azúcar rubia", cantidad: "+120 kg", referencia: "AZ-260905-19", responsable: "Ana T." },
        { fecha: "05/09/2026", tipo: "Salida", insumo: "Manteca de cacao", cantidad: "-15 kg", referencia: "OP-260905-006", responsable: "Luis P." }
    ],

    // Alertas operativas
    alertas: [
        { titulo: "Cacao orgánico por debajo del mínimo", desc: "Stock 84 kg · mínimo 100 kg · cobertura ~4 días", tipo: "Crítica" },
        { titulo: "Sal marina próxima al punto de reposición", desc: "Revisar disponibilidad antes de próximas órdenes.", tipo: "En riesgo" },
        { titulo: "Pronóstico de demanda actualizado", desc: "Tableta 70 % cacao · incremento esperado.", tipo: "Información" }
    ],

    // Lotes productivos
    lotes: [
        { lote: "LOT-260906-018", orden: "OP-260906-008", producto: "Tableta 70 % cacao", planificado: "12,000 u.", insumos: "5 insumos — Ver detalle", estado: "En producción" },
        { lote: "LOT-260905-013", orden: "OP-260905-006", producto: "Chocolate con leche", planificado: "8,000 u.", insumos: "5 insumos — Ver detalle", estado: "Finalizado" },
        { lote: "LOT-260905-014", orden: "OP-260905-010", producto: "Bombón surtido", planificado: "3,500 u.", insumos: "6 insumos — Ver detalle", estado: "Detenido" }
    ]
};
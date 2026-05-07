# Amitabha Luz Infinita - App de gestión para velas

MVP estático listo para GitHub y Vercel. Funciona sin instalación usando localStorage y puede sincronizar con Firebase Spark Plan si se configura `firebase-config.js`.

## Abrir local

Abre `index.html` en el navegador o súbelo a Vercel/GitHub Pages.

## Firebase gratuito

1. Crea un proyecto Firebase.
2. Activa Authentication > Email/Password.
3. Crea Firestore Database en modo production.
4. Copia `firebase-config.example.js` como `firebase-config.js` y pega la configuración Web App.
5. Publica las reglas de `firestore.rules`.

## Módulos incluidos

- Dashboard con ventas, utilidad, stock bajo, lotes en curado y margen.
- Insumos, proveedores y compras con costo promedio ponderado móvil.
- Productos y recetas con cálculo de cera, fragancia, costo unitario, precio mínimo y precio sugerido.
- Producción por lote con descuento de inventario y fecha lista para vender.
- Ventas con utilidad y margen.
- Clientes, gastos, reportes y alertas inteligentes.
- Exportación/importación JSON de respaldo.

## Fórmulas base

- gramos_cera = peso_final / (1 + porcentaje_fragancia)
- gramos_fragancia = gramos_cera * porcentaje_fragancia
- costo_promedio = ((stock_actual * costo_actual) + (cantidad_compra * costo_aterrizado)) / (stock_actual + cantidad_compra)
- precio_minimo = costo_total / (1 - fee)
- precio_sugerido = costo_total / (1 - fee - margen_objetivo)

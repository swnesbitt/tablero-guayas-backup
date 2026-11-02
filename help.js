/* Plain-language help behind each "?" button, Spanish and English. */
const HELP = {
  g10: {
    es: 'Lluvia diaria de los próximos 10 días en las 25 cabeceras cantonales, de cinco ensambles globales: IFS ENS y AIFS ENS (ECMWF), GEFS y AIGEFS (NOAA) e ICON-EPS (DWD), unos 200 miembros en total. Cada día va de 07:00 a 07:00, hora de Ecuador. Para los primeros tres días, el ensamble WRF de 3 km de arriba es mejor guía: los modelos globales usan celdas de unos 25 km y suavizan la cordillera.',
    en: 'Daily rain for the next 10 days at the 25 canton seats, from five global ensembles: IFS ENS and AIFS ENS (ECMWF), GEFS and AIGEFS (NOAA) and ICON-EPS (DWD), about 200 members in all. Each day runs 07:00 to 07:00 Ecuador time. For the first three days the 3 km WRF ensemble above is the better guide: the global models use cells of about 25 km and smooth out the Andes.' },
  g10pill: {
    es: 'Cada píldora tiene dos mitades. La izquierda es la mediana: la mitad de los miembros da más lluvia y la mitad menos. La derecha es el P90: solo 1 de cada 10 miembros da más. Amarillo, naranja y rojo marcan 25, 50 y 100 mm en el día. Pase el cursor para ver qué parte de los miembros llega a 25 mm.',
    en: 'Each pill has two halves. The left is the median: half the members give more rain and half give less. The right is the P90: only 1 in 10 members gives more. Yellow, orange and red mark 25, 50 and 100 mm in the day. Hover to see the share of members reaching 25 mm.' },
  g10late: {
    es: 'Más allá del día 5 los modelos aciertan menos dónde y cuándo llueve. Use estos días para ver si viene un periodo más húmedo o más seco, no para el valor exacto en un cantón.',
    en: 'Beyond day 5 the models place rain less accurately in space and time. Use these days to see whether a wetter or drier spell is coming, not for the exact value in a canton.' },
  summary: {
    es: 'Texto escrito automáticamente por un modelo de lenguaje (glm-5.3, NCSA Lumen) a partir de los números de este ciclo. Describe la provincia por regiones (norte, centro, oeste, este, suroeste y sur) y debe mencionar toda región donde algún cantón tenga 50 % o más de probabilidad de 50 mm. Antes de publicarlo, un programa verifica que cada número del texto aparezca en los datos; si no coincide, no se publica. Léalo como una guía rápida y confirme con los paneles de abajo.',
    en: 'Text written automatically by a language model (glm-5.3, NCSA Lumen) from this cycle\'s numbers. It describes the province by region (north, center, west, east, southwest and south) and must mention every region where a canton has a 50% or higher chance of 50 mm. Before it is published, a program checks that every number in it appears in the data; if one does not, nothing is published. Read it as a quick guide and confirm with the panels below.' },
  period: {
    es: 'Elija qué período mostrar en la lista de cantones, el mapa y los ríos. Arriba están los días de 24 horas, que van de 05:00 a 05:00 (corrida de 00Z) o de 17:00 a 17:00 (corrida de 12Z), y el total; abajo, los períodos de 12 horas (05–17 y 17–05). Todas las horas son de Ecuador (UTC−5). Si un período queda más corto porque el pronóstico termina, su duración aparece en el botón. Pase el cursor sobre un botón para ver las fechas completas.',
    en: 'Choose which period the canton list, the map and the rivers show. On top are the 24-hour days, running 05:00 to 05:00 (00Z run) or 17:00 to 17:00 (12Z run), and the total; below are the 12-hour periods (05–17 and 17–05). All times are Ecuador time (UTC−5). If a period is cut short because the forecast ends, its length is shown on the button. Hover over a button to see the full dates.' },
  canton: {
    es: 'Los 25 cantones de la provincia del Guayas, ordenados del más al menos lluvioso según el P90 del período elegido. Haga clic en un cantón para resaltarlo en el mapa. El botón PNG descarga la tabla completa como imagen.',
    en: 'The 25 cantons of Guayas Province, sorted from wettest to driest by the P90 of the chosen period. Click a canton to outline it on the map. The PNG button downloads the full table as an image.' },
  median: {
    es: 'La lluvia "típica" esperada, promediada sobre todo el cantón. El pronóstico se corre 10 veces con condiciones algo distintas; la mitad de esas corridas da más lluvia que este valor y la mitad da menos.',
    en: 'The "typical" rain expected, averaged over the whole canton. The forecast is run 10 times with slightly different conditions; half of those runs give more rain than this value and half give less.' },
  p90: {
    es: 'Un escenario húmedo razonable: solo 1 de cada 10 corridas da más lluvia que este valor. Úselo para planificar ante lo peor que es plausible, no como lo más probable.',
    en: 'A reasonable wet scenario: only 1 in 10 runs gives more rain than this value. Use it to plan for the worst that is plausible, not as the most likely outcome.' },
  p50: {
    es: 'Mapa de la lluvia mediana del período: en cada punto, la mitad de las 10 corridas da más y la mitad da menos. Azul es lluvia ligera a moderada; amarillo, naranja y rojo marcan 25, 50 y 100 mm. Fuera de la provincia los colores se atenúan. Haga clic para ver la serie horaria del punto.',
    en: 'Map of the period\'s median rain: at each point, half of the 10 runs give more and half give less. Blue is light to moderate rain; yellow, orange and red mark 25, 50 and 100 mm. Colors fade outside the province. Click for that point\'s hourly series.' },
  p90map: {
    es: 'Mapa del escenario húmedo (P90): solo 1 de cada 10 corridas supera este valor en cada punto. Muestra dónde podría llover mucho aunque no sea lo más probable. Amarillo, naranja y rojo marcan 25, 50 y 100 mm.',
    en: 'Map of the wet scenario (P90): at each point, only 1 in 10 runs exceeds this value. It shows where heavy rain could happen even if it is not the most likely outcome. Yellow, orange and red mark 25, 50 and 100 mm.' },
  prob: {
    es: 'Probabilidad de que la lluvia del período alcance el umbral elegido: el porcentaje de las 10 corridas que lo alcanzan en cada punto. Cada corrida vale 10 %. Haga clic para ver los tres umbrales en los tres días.',
    en: 'Chance that the period\'s rain reaches the chosen amount: the share of the 10 runs that reach it at each point. Each run counts as 10%. Click to see all three amounts on all three days.' },
  wind: {
    es: 'Viento más fuerte a 10 m sobre el suelo durante el período, valor mediano de las 10 corridas. Es la velocidad máxima del modelo en cada hora, no una ráfaga medida por una estación; las ráfagas reales pueden ser mayores. 10 m/s son 36 km/h.',
    en: 'Strongest wind 10 m above the ground during the period, median of the 10 runs. It is the model\'s peak speed in each hour, not a gust measured at a station; real gusts can be stronger. 10 m/s is 36 km/h.' },
  flow: {
    es: 'Caudal más alto previsto por GEOGLOWS, un modelo hidrológico global, en m³/s: el mayor promedio diario del período (promedio de 12 horas en los períodos de 12 h), según la mediana de sus 51 miembros. El modelo sobrestima mucho el caudal en esta cuenca, así que use este mapa para comparar ríos entre sí, no como valor real. Solo se muestran ríos de la cuenca del Guayas. Haga clic en un río para ver su hidrograma.',
    en: 'Highest flow forecast by GEOGLOWS, a global hydrological model, in m³/s: the largest daily mean in the period (the 12-hour mean for 12-hour periods), from the median of its 51 members. The model greatly overestimates flow in this basin, so use this map to compare rivers with each other, not as a real value. Only rivers in the Guayas basin are shown. Click a river for its hydrograph.' },
  pct: {
    es: 'Qué tan alto viene cada río comparado con todos los días de su propia historia (1940 a hoy, todas las estaciones del año). Percentil 90 significa que el caudal previsto supera al 90 % de todos los días del registro. Verde: por debajo del percentil 75; amarillo: 75 a 90; naranja: 90 a 99; rojo: 99 o más.',
    en: 'How high each river is running compared with every day of its own history (1940 to today, all seasons). The 90th percentile means the forecast flow is above 90% of all days in the record. Green: below the 75th percentile; yellow: 75 to 90; orange: 90 to 99; red: 99 or above.' },
  rp: {
    es: 'Período de retorno: cada cuántos años, en promedio, el río alcanza un caudal así. "2 años" es una crecida común; "25 años" o más es una crecida grande. Se calcula con los máximos anuales del propio registro del modelo (1940 a hoy). Verde: menos de 2 años; amarillo: 2 a 5; naranja: 5 a 10; rojo: 10 años o más.',
    en: 'Return period: how many years, on average, between flows this large. "2 years" is a common high flow; "25 years" or more is a major flood. It comes from the annual peaks in the model\'s own record (1940 to today). Green: under 2 years; yellow: 2 to 5; orange: 5 to 10; red: 10 years or more.' },
  hourly: {
    es: 'Lluvia en cada hora en el punto elegido. La línea es la mediana de las 10 corridas; la franja va del 10 % al 90 %, es decir, el rango donde caen 8 de cada 10 corridas. Una franja ancha significa más incertidumbre en la hora de la lluvia.',
    en: 'Rain in each hour at the chosen point. The line is the median of the 10 runs; the band runs from 10% to 90%, the range where 8 in 10 runs fall. A wide band means more uncertainty about when the rain falls.' },
  accum: {
    es: 'Lluvia sumada desde el inicio del pronóstico. Las líneas horizontales marcan 25, 50 y 100 mm. Si la franja cruza una línea, algunas corridas alcanzan ese total y otras no.',
    en: 'Rain added up from the start of the forecast. The horizontal lines mark 25, 50 and 100 mm. If the band crosses a line, some runs reach that total and others do not.' },
  windts: {
    es: 'Viento máximo de cada hora a 10 m en el punto elegido. La línea es la mediana de las 10 corridas y la franja el rango donde caen 8 de cada 10. Pase el cursor para leer los valores.',
    en: 'Peak wind in each hour, 10 m above the ground, at the chosen point. The line is the median of the 10 runs and the band is the range where 8 in 10 fall. Hover to read the values.' },
  probbars: {
    es: 'Para cada día, qué porcentaje de las 10 corridas da al menos 25 mm (amarillo), 50 mm (naranja) y 100 mm (rojo) en el punto elegido. 60 % significa que 6 de las 10 corridas lo alcanzan.',
    en: 'For each day, the share of the 10 runs that give at least 25 mm (yellow), 50 mm (orange) and 100 mm (red) at the chosen point. 60% means 6 of the 10 runs reach it.' },
  hydro: {
    es: 'Caudal previsto del tramo durante el pronóstico. La línea oscura es la mediana de los 51 miembros de GEOGLOWS, la franja es el rango donde cae el 80 % de ellos y la línea punteada gris, cuando está disponible, es la corrida determinística. Las líneas amarilla, naranja y roja marcan los caudales de 2, 5 y 10 años o más. Fíjese más en si la curva se acerca a esas líneas que en los m³/s.',
    en: 'Forecast flow for this reach over the forecast period. The dark line is the median of GEOGLOWS\'s 51 members, the band is the range holding 80% of them, and the dashed gray line, when available, is the deterministic run. The yellow, orange and red lines mark the 2-, 5- and 10-year-or-larger flows. Watch whether the curve approaches those lines more than the m³/s.' },
  badges: {
    es: 'Resumen por día: el percentil del caudal frente a todos los días del registro (P98 = más alto que el 98 % de los días desde 1940) y el período de retorno alcanzado.',
    en: 'Summary by day: the flow percentile against the month\'s history (P98 = higher than 98% of that month\'s days) and the return period reached.' },
  goes: {
    es: 'Imágenes reales del satélite GOES-Este de las últimas horas (48 imágenes, una cada 10 minutos). IR muestra la temperatura de las nubes con la misma escala de colores que las nubes simuladas: los colores intensos son topes muy fríos y altos, típicos de tormentas. VIS es la luz visible y solo funciona de día. Use ▶ para animar y el botón de descarga para guardar un video. Los tres mapas de esta fila se mueven juntos al arrastrar o hacer zoom.',
    en: 'Real GOES-East satellite images from the last few hours (48 images, one every 10 minutes). IR shows cloud-top temperature on the same color scale as the simulated clouds: intense colors are very cold, high tops typical of storms. VIS is visible light and only works in daytime. Press ▶ to animate and use the download button to save a video. The three maps in this row move together when you drag or zoom.' },
  wrfloop: {
    es: 'Las nubes que el modelo WRF-GFS (corrida determinística de 3 km) espera ver desde el satélite, hora por hora durante el pronóstico, con los mismos colores que el panel de satélite observado: más frío y colorido significa nubes más altas y tormentas. Avanza junto con el panel de lluvia de la derecha. Compárelo con el satélite observado para ver si el modelo va bien encaminado.',
    en: 'The clouds the WRF-GFS model (3 km deterministic run) expects a satellite to see, hour by hour through the forecast, in the same colors as the observed satellite panel: colder and more colorful means higher clouds and storms. It steps together with the rain panel on the right. Compare it with the observed satellite to see whether the model is on track.' },
  rainpanel: {
    es: 'Lluvia de cada hora del mismo pronóstico WRF-GFS, en la misma hora que el panel de nubes. Amarillo, naranja y rojo marcan 25, 50 y 100 mm en la hora. Los tres mapas se mueven juntos al arrastrar o hacer zoom.',
    en: 'Each hour\'s rain from the same WRF-GFS forecast, at the same hour as the clouds panel. Yellow, orange and red mark 25, 50 and 100 mm in the hour. The three maps move together when you drag or zoom.' },
};

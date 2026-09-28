# Mesa Austral · manual de uso

Tres pantallas, tres personas: **el cliente** reserva, **la sala** atiende la noche en la tablet de la
entrada y **el dueño** mira los números y fija las reglas.

## En qué pantallas funciona
Teléfono, tablet y computadora, de 320 px de ancho en adelante:
- **Teléfono:** todo en una columna; el plano del salón se desliza de costado para que cada mesa se pueda
  tocar con el dedo; en la sala se elige «Lista» o «Plano».
- **Tablet horizontal:** la sala muestra la lista y el plano lado a lado (es el uso pensado para la entrada).
  En vertical, como en el teléfono.
- **Computadora:** dos columnas donde conviene (reserva, sala, panel del dueño); en pantallas muy grandes el
  contenido se centra para no estirarse.
- En pantallas táctiles, todo lo que se toca mide al menos 44 px. El editor del salón anda en todos, pero se
  usa mejor en tablet o computadora.

## El cliente (app/index.html)
1. Entra por el enlace del restaurante (Instagram, Google Maps o el QR de la puerta). Ve la portada del
   restaurante con el estilo que eligió el dueño; puede cambiar el estilo y el idioma (español, inglés, portugués).
2. **¿Qué día? ¿Cuántos van? ¿A qué hora?** Las horas sin lugar para ese grupo aparecen tachadas.
3. **Elegí tu mesa:** el plano del salón en vivo.
   - Libres, con el color del restaurante.
   - Ocupadas, en gris, con la hora en que quedan listas (el tiempo que llevan + la limpieza).
     Tocando una ocupada, la pide **para esa hora**; si se libera antes, le avisan por WhatsApp.
   - O «Que la elija el restaurante».
4. **Tus datos:** nombre y WhatsApp (obligatorios), correo, ocasión y alergias (opcionales; las alergias
   piden un permiso aparte y se borran a los 7 días). Ve la política en dos líneas y la acepta.
5. **Listo:** código, ticket y confirmación por WhatsApp. Grupos grandes: pagan la seña para confirmar.
6. Si no hay lugar: **lista de espera** con una franja horaria.

## Mi reserva (app/mi.html, desde el enlace del mensaje)
- Ver la reserva, **llegamos un poco tarde** (guarda la mesa 15 minutos más), **cambiar** día, hora o
  personas (si hay lugar), **cancelar**.
- Cancelar a tiempo: sin cargo. Sobre la hora: primero le ofrece alternativas y, si igual cancela,
  queda un incidente con un compromiso de pago.
- Pagar el compromiso o la seña (Mercado Pago). El compromiso pagado vuelve como **crédito**.
- **Borrar mis datos:** la reserva queda a nombre de «Anónimo».

## La sala (app/sala.html)
- **Entrar:** cada uno con su PIN, en la tablet que habilitó el dueño.
- Arriba: reservas, sin confirmar, gente en el salón y lista de espera. Día anterior y siguiente.
- **Lista** (todas, por llegar, en la mesa, terminadas) y **plano en vivo**. Tocando una reserva o una mesa:
  - **Llegaron** · **Pidieron la cuenta** (libera la mesa y avisa a quien la pidió y a la lista de espera)
  - **Se quedan 15 minutos más** (avisa al que viene después) · **Mover de mesa**
  - **No vinieron: plantón** · **Cancelar** (lo decide el restaurante: avisa al cliente y devuelve la seña)
  - **Condonar el compromiso** (encargado o dueño; queda registrado quién lo hizo)
- **+ Reserva** (por teléfono), **+ Sin reserva** (gente en la puerta) y **+ Lista de espera**.
- Si WhatsApp está en modo **a mano**: «Mensajes para mandar a mano» → Enviar por WhatsApp → Marcar enviado.
- La **cocina** solo mira la noche y las alergias.

### Lo que la app hace sola
| Cuándo | Qué hace |
|---|---|
| Al reservar | Confirma por WhatsApp y bloquea la mesa (nunca dos reservas en la misma mesa) |
| Mediodía del día | Recordatorio con «Confirmo / Cambiar / Cancelar» |
| 2 horas antes, si no contestó | Segundo aviso; en la sala queda en amarillo |
| A mitad de la tolerancia | «¿Vienen?» con «Llegamos en 10 / No vamos a poder» |
| Al terminar la tolerancia | Plantón, incidente, compromiso y la mesa se ofrece a la lista de espera |
| Mesa liberada | Se ofrece al primero de la espera; tiene 10 minutos para aceptar |
| Seña sin pagar en 30 minutos | La reserva se cae |
| 03:00 | Cierre del día: números del día, alergias viejas borradas, datos vencidos |

## El dueño (app/dueno.html)
- **Esta noche:** números, la «marea» (personas a cada hora) con un deslizador para ver el salón a cualquier
  hora, qué mirar, alerta del SMN (con alerta, los plantones no cobran) y **Cerrar hoy por temporal**
  (avisa a todas las reservas).
- **El mes:** personas, ocupación, plantones y plata recuperada, día por día y por día de la semana.
- **Reglas:** nombre, WhatsApp de contacto, cómo salen los WhatsApp, **tu página web** (estilo Canal, Bistró,
  Palermo o Galería; lema; platos de la marquesina), plantones y cancelaciones, limpieza entre mesas, señas,
  y el enlace de reservas con su QR.
- **Salón:** el editor del lugar en 2D. Mesas redondas, cuadradas y largas; paredes, ventanas, puertas,
  entrada, barra, hogar, columnas, plantas y zonas. Arrastrar para mover, el punto naranja estira, «Girar»,
  «Duplicar», «Quitar», flechas del teclado y «Deshacer». Cada mesa: nombre, lugares, mínimo de personas,
  zona y «se junta con» (las mesas con la misma letra se unen para grupos grandes). No deja quitar una mesa
  con reservas próximas.
- **Horarios:** turnos por día, cada cuánto se reserva, tope de personas por franja y días cerrados.
- **Equipo:** encargados, sala y cocina con su PIN; dar de baja; habilitar la tablet.
- **Clientes:** incidentes (condonar) y clientes (visitas, crédito, si la próxima reserva pide seña).
- **Prueba** (solo en modo prueba): reloj de prueba y volver a empezar.

## Protección de datos
Ver `app/privacidad.html` (modelo, a revisar por un abogado matriculado).

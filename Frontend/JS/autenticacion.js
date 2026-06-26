/*──────────────────────────────────────────────────────────────────────────────
  MÓDULO DE AUTENTICACIÓN, REGISTRO Y GESTIÓN DE ACCESO (FRONTEND)
 ──────────────────────────────────────────────────────────────────────────────*/
 //Este script controla la lógica interactiva de las pantallas de Login, Registro
 // y Términos/Condiciones. Gestiona validaciones en tiempo real, manipulación 
//del DOM, persistencia de sesión local y consumo de la API de usuarios.


/* ─────────────────────────────────────────────────────────────────────────────
   VALIDACIONES INTERACTIVAS DE FORMULARIO
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────
Alterna la visibilidad de un campo de 
contraseña entre texto plano y enmascarado.
───────────────────────────────── */
function togglePass(inputId, iconId) {
      const input = document.getElementById(inputId);
      const icon  = document.getElementById(iconId);

      // Conmutación de atributos de tipo de entrada y clases estéticas del icono
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye'; // Muestra el ojo abierto
      } else {
        input.type = 'password';
        icon.className = 'bi bi-eye-slash'; // Muestra el ojo cerrado
      }
    }

    /* ──────────────────────────────────────────
    Realiza una validación cruzada en tiempo real 
    para verificar si ambas contraseñas coinciden.
    ────────────────────────────────────────────── */
    function checkPasswords() {
      const p1  = document.getElementById('pass1').value;
      const p2  = document.getElementById('pass2').value;
      const err = document.getElementById('passError');
      
      // Solo evalúa si el usuario ya ha comenzado a escribir en el campo de confirmación
      if (p2.length > 0 && p1 !== p2) {
        err.style.display = 'block'; // Muestra el contenedor de error (CSS alert)
      } else {
        err.style.display = 'none'; // Oculta el error si coinciden o está vacío
      }
    }

    /* ───────────────────────────────────────────────────
    Habilita o deshabilita el botón de registro 
    basándose en el estado del checkbox.
    ─────────────────────────────────────────────────── */
    function toggleBtn() {
      const checked = document.getElementById('terminos').checked;
      // El botón se desbloquea únicamente cuando el booleano 'checked' es true
      document.getElementById('btnRegistrar').disabled = !checked;
    }

/* ─────────────────────────────────────────────────────────────────────────────
   ENRUTAMIENTO DINÁMICO (RETORNO DE LOGO)
───────────────────────────────────────────────────────────────────────────── */

    // Diccionario que mapea los tokens de procedencia con sus archivos físicos correspondientes
    const NAVIGATION_ROUTES = {
      registro: 'registro.html',
      catalogo: 'catalogo.html',
      login: 'login.html',
      perfil: 'perfil.html',
      default: 'catalogo.html' // Redirección segura de respaldo
    };

    // Resuelve la cadena de destino evaluando la clave provista.
    const getReturnTarget = (paramKey) => {                       
      const key = String(paramKey || '').trim();                    // {string} paramKey - Valor del parámetro extraído de la URL
      return NAVIGATION_ROUTES[key] || NAVIGATION_ROUTES.default;
    };

    // Examina los parámetros de búsqueda de la URL actual para inyectar dinámicamente
    //el enlace de retorno en el logo principal.
    const applyLogoReturnLink = () => {
      const params = new URLSearchParams(window.location.search);  // Parsea los query strings
      const target = getReturnTarget(params.get('from'));         // Captura el valor de 'from'
      const logo = document.getElementById('logoReturn');
      
      if (logo) logo.href = target;                               // Actualiza el enlace
    };

    // Vincula la ejecución del ruteo tan pronto como el árbol DOM esté completamente construido
    document.addEventListener('DOMContentLoaded', applyLogoReturnLink);


/* ─────────────────────────────────────────────────────────────────────────────
   INTERSECTION OBSERVER (REPOSITORIO DE TÉRMINOS Y CONDICIONES)
───────────────────────────────────────────────────────────────────────────── */
    
    // Captura los contenedores de las secciones y los enlaces del índice lateral (TOC)
    const sections = document.querySelectorAll('.term-section[id]');
    const tocLinks  = document.querySelectorAll('.toc-list a');

    //Inicializa la API nativa IntersectionObserver para rastrear la posición del scroll.
   //Cambia dinámicamente la clase activa en el índice lateral según la sección leída.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        // Se ejecuta si el elemento entra en la zona delimitada por el rootMargin
        if (entry.isIntersecting) {
          // Limpia la clase 'active' de todos los enlaces para evitar duplicidad visual
          tocLinks.forEach(a => a.classList.remove('active'));
          
          // Busca y añade la clase 'active' al enlace que apunta al ID de la sección visible
          const active = document.querySelector(`.toc-list a[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, {

      // Configura un área de detección horizontal cruzada (focaliza el cuadrante central superior de la pantalla)
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0   // Se activa apenas el primer píxel del contenedor cruza el umbral
    });

// Registra individualmente cada sección dentro del objeto observador
sections.forEach(s => observer.observe(s));


/* ─────────────────────────────────────────────────────────────────────────────
   CARGA DINÁMICA DE COMPONENTES DE INTERFAZ (Carreras)
───────────────────────────────────────────────────────────────────────────── */
const selectCarrera = document.getElementById('carrera');
// Evalúa la existencia del elemento select en la vista 
if (selectCarrera) {
  // Usa el endpoint de la API usando una ruta relativa para soporte de red local
  fetch('/api/carreras')
  .then(res => res.json())  // Transforma la respuesta binaria de red a objetos JSON
  .then(carreras => {
    // Itera sobre el arreglo de carreras recuperadas de la Base de Datos
    carreras.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_carrera;        // Asigna el identificador numérico interno
      opt.textContent = c.nombre;      // Asigna el texto visible
      selectCarrera.appendChild(opt);  // Inserta la opción dentro del nodo select
    });
  })
  .catch(error => console.error('Error cargando carreras:', error));
}


/* ─────────────────────────────────────────────────────────────────────────────
   PROCESAMIENTO DE ENVÍO: FORMULARIO DE INICIO DE SESIÓN 
───────────────────────────────────────────────────────────────────────────── */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();  // Cancela la recarga nativa de la página impuesta por el evento submit

  // Extracción de los valores limpios digitados por el estudiante
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // // Despacha la petición de autenticación al servidor backend de Express
  try {
    const res = await fetch('/api/usuarios/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Declara la carga útil como JSON estructurado
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
  
    // Manejo de errores devueltos por el backend (HTTP 400, 401, etc.)
    if (!res.ok) {
      // Mostrar el error debajo del formulario sin recargar la pagina
      document.getElementById('loginError').textContent = data.error;
      document.getElementById('loginError').style.display = 'block';
      return;  // Frena el flujo de inicio de sesión
    }

    // Si va todo bien, guardar los datos del usuario en sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
    window.location.href = 'catalogo.html'; // Redirigir al catalogo

  } catch (error) {
    console.error('Error al iniciar sesion:', error);
  }
 });
}

/* ─────────────────────────────────────────────────────────────────────────────
   REGISTRO DE NUEVO USUARIO
───────────────────────────────────────────────────────────────────────────── */
const registroForm = document.getElementById('registroForm');
if (registroForm) {
  registroForm.addEventListener('submit', async function(e) {
    e.preventDefault();  // Previene el comportamiento síncrono por defecto

    // Validar que las contraseñas coincidan antes de enviar
    const pass1 = document.getElementById('pass1').value;
    const pass2 = document.getElementById('pass2').value;
    if (pass1 !== pass2) {
      document.getElementById('passError').style.display = 'block';
      return;
    }

    // Construcción del Payload siguiendo el esquema requerido por la API
    const body = {
      nombre_completo: document.getElementById('nombre').value.trim(),  // Remueve espacios
      email: document.getElementById('email').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      password: pass1,
      id_carrera: document.getElementById('carrera').value,
      acepto_terminos: document.getElementById('terminos').checked
    };

    // Envía la petición asíncrona de creación de cuenta hacia el backend
    try {
      const res = await fetch('/api/usuarios/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      // Si el backend rechaza el registro (ej. Correo duplicado detectado por la DB)
      if (!res.ok) {
        document.getElementById('registroError').textContent = data.error;
        document.getElementById('registroError').style.display = 'block';
        return;
      }

      // Registro exitoso, redirigir al login
      window.location.href = 'login.html';

    } catch (error) {
      console.error('Error al registrarse:', error);
    }
  });
}
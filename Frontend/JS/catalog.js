/* ─────────────────────────────────────────────────────────
  MÓDULO DEL CATÁLOGO DE LIBROS
───────────────────────────────────────────────────────────*/
// Diseñado para la carga asíncrona de datos desde la API, renderizado 
// de tarjetas, algoritmos de busqueda y el control multipart/form-data
// para la publicacion de anuncios

/* ─────────────────────────────────
   Verificar sesión
───────────────────────────────── */
// Recupera el objeto contextual del usuario activo desde el almacenamiento local persistente
const usuarioActivo = obtenerUsuario();

/* ─────────────────────────────────
  Estado de la aplicacion
───────────────────────────────── */
// Cache local en memoria 
// almacena el conjunto total de libros en 'allBooks' evita realizar peticiones recurrentes
// al servidor Express cada vez que el estudiante tipea una letra en el buscador.

let allBooks = [];        // fuente para los datos del catalogo en la sesion actual
let visibleBooks = [];    // Arreglo sobre el cual se aplican los filtros 

/* ─────────────────────────────────
  Cargar anuncios
───────────────────────────────── */
// Recupera el listado completo de anuncios publicos disponibles
async function cargarAnuncios() {
  try {
    const res = await fetch('/api/anuncios');
    allBooks = await res.json();

    // Clonacion del arreglo para inicializar la vista
    visibleBooks = [...allBooks];

    // Aplica los diferentes filtros y hace el renderizado
    sortBooks();
  } catch (error) {
    console.error('Error al cargar anuncios:', error)
  }
}

/* ─────────────────────────────────
    Cargar materias dinamicamente desde la BD
    tanto para el filtro lateral como para el modal
───────────────────────────────── */
//Consulta las asignaturas en la DB y las mapea simultáneamente en múltiples elementos 
// select del DOM (el panel lateral de filtros y el formulario del modal de publicación).

async function cargarMaterias() {
  try {
    const res = await fetch('/api/materias');
    const materias = await res.json();

    // los dos nodos del DOM que necesitan las materias
    const selects = [
      document.getElementById('filterMateria'),  // Filtro del catalogo
      document.getElementById('aMateria')        // Formulario publicación
    ];

    // iteracion anidada para insertar las materias en los selects en un solo ciclo
    selects.forEach(select => {
      if (!select) return; // evita bucles en caso de que el nodo no exista
      materias.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id_materia;                // asigna el identificador interno
        opt.textContent = m.nombre;              // asigna el texto visible
        select.appendChild(opt);
      });
    });

  } catch (error) {
    console.error('Error al cargar las materias:', error);
  }
}

/* ─────────────────────────────────
   Renderizar tarjetas
───────────────────────────────── */
// transforma el arreglo de objetos de libros en elementos html
// e inyecta el {array} books - que es el arreglo de libros filtrado

function renderBooks(books) {
  const grid     = document.getElementById('booksGrid');
  const noResult = document.getElementById('noResults');

  // Control de estado vacío: Si no hay coincidencias, limpia la rejilla y activa el aviso CSS
  if (books.length === 0) {
    grid.innerHTML = '';
    noResult.classList.remove('d-none'); // Muestra la alerta de "No se encontraron libros"
    return;
  }
  noResult.classList.add('d-none');  // Oculta la alerta si existen registros válidos

  // Inyeccion del DOM con los datos de los libros
  grid.innerHTML = books.map(b => `
    <div class="book-card">
      <div class="book-img-wrapper">
        <img src="${b.foto_url}" alt="${b.titulo}" onerror="this.src='../IMG/books.png'"/>
        <span class="badge-estado badge-${b.condicion === 1 ? 'nuevo' : 'usado'}">${b.condicion === 1 ? 'Nuevo' : 'Usado'}</span>
      </div>
      
      <div class="book-body">
        <div class="book-title">${b.titulo}</div>
        <div class="book-author">${b.autor}</div>
        <div class="book-edicion">${b.edicion || ''}</div>
        <div class="book-materia">${b.materia}</div>
        
        <a href="https://wa.me/58${b.telefono.replace(/\D/g, '').replace(/^0/,'')}?text=${encodeURIComponent('Hola, vi tu anuncio de "' + b.titulo + '" en U-Books y me interesa.')}"
           class="btn-contacto" target="_blank" rel="noopener">
          Ver contacto <i class="bi bi-whatsapp wa-icon"></i>
        </a>
      </div>
    </div>
  `).join('');  // Convierte el arreglo resultante en una cadena de caracteres
}

/* ─────────────────────────────────
   Filtrar/Normalizar texto
───────────────────────────────── */
// Algoritmo para normalizar el texto de búsqueda
// Convierte las candenas de texto en minúsculas y elimina los acentos
function limpiarTexto(texto) {
  return texto
    // 1. Separa las letras de sus acentos (ej: "á" se vuelve "a" + "´")
    .normalize("NFD") 
    // 2. Elimina los símbolos de los acentos usando una expresión regular
    .replace(/[\u0300-\u036f]/g, "") 
    // 3. Pasa todo a minúsculas para que "C" y "c" sean iguales
    .toLowerCase(); 
}

/* ─────────────────────────────────
  Filtrar (solo un checkbox activo a la vez)
─────────────────────────────────*/
// Simula el comportamiento logico de un raioButton utilizando un checkbox

// Si el checkbox con ID 'chkNuevo' es activo, el otro se desactiva
function toggleCheckbox(elementoClickeado) {
  if (elementoClickeado.id === 'chkNuevo' && elementoClickeado.checked) {
    document.getElementById('chkUsado').checked = false;
  } 
  else if (elementoClickeado.id === 'chkUsado' && elementoClickeado.checked) {
    document.getElementById('chkNuevo').checked = false;
  }
}

/*─────────────────────────────────
  Filtrar (libros)
─────────────────────────────────*/
// Agarra los controles de filtrado y procesa los datos para filtrar los libros

function filterBooks() {
  const query   = limpiarTexto(document.getElementById('searchInput').value);
  const materia = document.getElementById('filterMateria').value;
  const nuevo   = document.getElementById('chkNuevo').checked;
  const usado   = document.getElementById('chkUsado').checked;

  // Filtrado en cascada de la condición de cada uno de los campos
  visibleBooks = allBooks.filter(b => {
    // Evalua la coincidencia por texto
    const matchSearch  = !query || limpiarTexto(b.titulo).includes(query) || limpiarTexto(b.autor).includes(query);
    
    // Evalua la coincidencia por clave foranea de asignatura (id_materia)
    const matchMateria = !materia || b.id_materia === parseInt(materia);
    
    // evalua la condición de estado (nuevo=1, usado=0)
    const matchEstado  = (!nuevo && !usado) || (nuevo && b.condicion === 1) || (usado && b.condicion === 0);
    
    // El registro se incluye si se cumplen todas las condiciones
    return matchSearch && matchMateria && matchEstado;
  });

  // ejecuta el nuevo filtro
  sortBooks();
}

/* ─────────────────────────────────
   Ordenar
───────────────────────────────── */
// Evalua el valor de la opción de ordenación y manipula la posicion del arreglo
// usando funciones de comparacion

function sortBooks() {
  const sort = document.getElementById('sortSelect').value;
  const copy = [...visibleBooks];                            // Copia el arreglo

  if (sort === 'az') {
    // Ordena por título en orden alfabético
    copy.sort((a,b) => a.titulo.localeCompare(b.titulo));
  } else if (sort === 'za') {
    // Ordena por título en orden alfabético inverso
    copy.sort((a,b) => b.titulo.localeCompare(a.titulo));
  } else { 
    // Ordena por fecha de publicación por defecto
    copy.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  }
  
  renderBooks(copy);  // Actualiza la vista
}

/* ─────────────────────────────────
   Limpiar filtros
───────────────────────────────── */
// Restablece los filtros a sus valores iniciales

function clearFilters() {
  document.getElementById('searchInput').value    = '';
  document.getElementById('filterMateria').value  = '';
  document.getElementById('chkNuevo').checked     = false;
  document.getElementById('chkUsado').checked     = false;
  
  visibleBooks = [...allBooks];     // Restaura el arreglo original
  sortBooks();
}

/* ─────────────────────────────────
   Dropdown Mi Perfil
───────────────────────────────── */
function toggleDropdown() {
  document.getElementById('profileDropdown').classList.toggle('open');
}

// Escucha el evento click en el cual cierra el menu del perfil al hacer clic fuera
document.addEventListener('click', function(e) {
  const wrapper = document.querySelector('.profile-wrapper');

  // si el click ocurre fuera, remueve la clase 'open' del menu
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('profileDropdown').classList.remove('open');
  }
});



/* ─────────────────────────────────
   Modal Crear Anuncio - preview image
───────────────────────────────── */
// Getiona el bloque del boton de envio segun la validacion del checkbox

function togglePublish() {
  const checked = document.getElementById('terminosAnuncio').checked;
  document.getElementById('btnPublicar').disabled = !checked;
}

// Lee el File system en el cliente para la preview de la imagen
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño (10 MB = 10 * 1024 * 1024)
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen supera el límite de 10 MB.');
    event.target.value = '';                        // Limpia el input para validar el archivo
    return;
  }

  // Inicia el proceso de carga de la imagen con el API FileReader
  const reader = new FileReader();
  reader.onload = function(e) {
    const box = document.getElementById('previewBox');
    // Eliminar contenido previo excepto el input
    const input = box.querySelector('input[type=file]');
    
    box.innerHTML = '';                                  // Limpia el contenido de placeholder
    const img = document.createElement('img');           // Crea el elemento img
    img.src = e.target.result;                           // Asigna la URL de la imagen
    
    box.appendChild(img);                                // Inserta la preview en el previewBox
    box.appendChild(input);                              // re-inserta el input de tipo archivo para retener el archivo binario
  };
  reader.readAsDataURL(file);                            // Realiza la conversion del archivo a URL
}

/* ─────────────────────────────────
   Publicar anuncio, POST /api/anuncios
───────────────────────────────── */
// Recoge los inputs de la publicacion, la encapsula en multipart/form-data,
// envia la petición al backend y refresca la vista

async function publicarAnuncio(e) {
  e.preventDefault();                                    // Evita recargar la pagina

  const titulo  = document.getElementById('aTitulo').value.trim();
  const autor   = document.getElementById('aAutor').value.trim();
  const id_materia = document.getElementById('aMateria').value;
  const edicion = document.getElementById('aEdicion').value.trim();
  const condicion = document.getElementById('aEstado').value;
  const foto  = document.getElementById('fotoInput').files[0];

  // Valida que todos los campos sean completados
  if (!titulo || !autor || !id_materia || !condicion || !foto) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  // Construir el formData: Al enviarse archivos binarios junto al texto,
  // es necesario estructurar un FormData.
  const formData = new FormData();
  formData.append('id_usuario', usuarioActivo.id_usuario);
  formData.append('titulo', titulo);
  formData.append('autor', autor);
  formData.append('id_materia', id_materia);
  formData.append('edicion', edicion);
  formData.append('condicion', condicion);
  formData.append('foto', foto);                          // El archivo binario gestionado por multer

  // Enviar anuncio
  try {
    const res = await fetch('/api/anuncios', {
      method: 'POST',
      body: formData //sin Content-type, el fetch calcula los limites correctos
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al publicar el anuncio.');
      return;
    }

    // Cerrar modal, limpiar y recargar anuncios 
    bootstrap.Modal.getInstance(document.getElementById('modalAnuncio')).hide();
   
    resetModal();           // Limpia el modal
    await cargarAnuncios(); //recarga los datos actualizados

    // Mostrar toast
    const toast = new bootstrap.Toast(document.getElementById('toastPublicado')).show();
  
  } catch (error) {
    console.error('Error al publicar el anuncio:', error);
  }
}

/* ─────────────────────────────────
   Limpiar modal al cerrarlo
───────────────────────────────── */
// Vacia los campos del modal y limpia el previewBox
function resetModal() {
  document.getElementById('aTitulo').value  = '';
  document.getElementById('aAutor').value   = '';
  document.getElementById('aEdicion').value = '';
  document.getElementById('aMateria').value = '';
  document.getElementById('aEstado').value  = '';
  document.getElementById('terminosAnuncio').checked = false;
  document.getElementById('btnPublicar').disabled = true;

  // Limpiar previewBox
  const box   = document.getElementById('previewBox');
  const input = box.querySelector('input[type=file]');
  
  // Re-inserta el estado inicial
  box.innerHTML = `
    <i class="bi bi-cloud-arrow-up" style="font-size:1.8rem;"></i>
    <span>Haz clic para subir una imagen (máx. 10 MB)</span>
  `;
  box.appendChild(input);                                  // Mantiene el nodo de carga funcional
  input.value = '';                                        // Limpia el input
}

// Vincula el reseteo de los campos al evento de cerrado del modal
document.getElementById('modalAnuncio').addEventListener('hidden.bs.modal', resetModal);

/* ─────────────────────────────────
   Carga inicial
───────────────────────────────── */
// dispara los procesos asincronos en paralelo al cargar la vista
cargarMaterias();
cargarAnuncios();

// escuchador de envio para publicar anuncios
document.getElementById('anuncioForm').addEventListener('submit', publicarAnuncio);
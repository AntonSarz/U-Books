/* ─────────────────────────────────────────────────────────
  MÓDULO DE PERFIL DE USUARIO
───────────────────────────────────────────────────────────*/
// Diseñado para administrar el perfil del usuario activo. 
// gestionar la edicion de datos personales y vizualizar los anuncios publicados,
// controlar su disponibilidad y su borrado.

/* ─────────────────────────────────
   Verificar sesión
───────────────────────────────── */
// Recupera el objeto del usuario logueado
const usuarioActivo = obtenerUsuario();

/* ─────────────────────────────────
   Estado de la aplicación 
───────────────────────────────── */
let ads = [];                         //Cache local que almacena todos los anuncios del usuario
let activeTab     = 'todos';          // rastrea la pestaña de filtrado actual  
let pendingDelete = null;             // almacena el ID del anuncio que se quiere borrar


/* ─────────────────────────────────
   Carga inicial - perfil, anuncios,
   carreras y materias
───────────────────────────────── */
// Ejecuta multiples peticiones HTTP en paralelo para cargar los datos de la aplicación
//  El promise.all asegura que la vista no se inicializa hasta que todas las peticiones
//  han terminado de cargarse.

async function inicializar() {
  await Promise.all([
    cargarPerfil(),
    cargarAnuncios(),
    cargarCarreras(),
    cargarMaterias()
  ]);
}

/* ─────────────────────────────────
   Carga inicial - datos del perfil
───────────────────────────────── */
// Obtiene los datos actualizados del usuario desde la base de datos
async function cargarPerfil() {
  try {
    const res = await fetch(`/api/usuarios/${usuarioActivo.id_usuario}`);
    const data = await res.json();

    // inyecta el texto de manera segura con textContent
    document.getElementById('displayNombre').textContent = data.nombre_completo;
    document.getElementById('displayEmail').textContent = data.email;
    document.getElementById('displayTelefono').textContent = data.telefono;
    document.getElementById('displayCarrera').textContent = data.carrera;

    //Guardar en memoria para el modal de editar
    usuarioActivo.nombre_completo = data.nombre_completo;
    usuarioActivo.email = data.email;
    usuarioActivo.telefono = data.telefono;
    usuarioActivo.id_carrera = data.id_carrera;

  }catch (error) {
    console.error('Error al cargar el perfil:', error);
  }
}

/* ─────────────────────────────────
   Carga inicial - anuncios del usuario
───────────────────────────────── */
// Descarga el listado completo de anuncios publicados por el usuario
async function cargarAnuncios() {
  try {
  const res = await fetch(`/api/anuncios/usuario/${usuarioActivo.id_usuario}`);
  ads = await res.json();
  renderAds();            // Actualiza la vista
    } catch (error) {
      console.error('Error al cargar anuncios:', error);
    }
}

/*─────────────────────────────────
  Carga inicial - carreras para el 
  modal de editar perfil
─────────────────────────────────*/
// LLena el select de carreras para la edición del perfil
async function cargarCarreras() {
  try {
    const res = await fetch('/api/carreras');
    const carreras = await res.json();
    const select = document.getElementById('editCarrera')

    carreras.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_carrera;
      opt.textContent= c.nombre;
      select.appendChild(opt);
    });

  } catch (error){
    console.error('Error al cargar carreras:', error);
  }
} 

/*─────────────────────────────────
  Carga inicial - materias para el 
  modal de editar anuncios
─────────────────────────────────*/
// LLena el select de materias para la edición de libros
async function cargarMaterias() {
  try {
    const res = await fetch('/api/materias');
    const materias = await res.json();
    const select = document.getElementById('editAdMateria');

    materias.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id_materia;
      opt.textContent = m.nombre;
      select.appendChild(opt);
    });

  } catch (error) {
    console.error('Error al cargar materias:', error);
  }
}

/* ─────────────────────────────────
   Renderizar anuncios
───────────────────────────────── */
// evalua el estado de la pestaña actual, filtra los anuncios y construye el html
function renderAds() {
  const list = document.getElementById('adsList');
  const noAds = document.getElementById('noAds');

  // filtrado condicional en memoria (evita tener que buscar en la base de datos cada vez)
  let filtered = ads;
  if (activeTab === 'disponible') filtered = ads.filter(a => a.disponible === 1);
  if (activeTab === 'vendido')    filtered = ads.filter(a => a.disponible === 0);

  // Actualizar contadores de los contadores numéricos en la interfaz de pestañas
  document.getElementById('cntTodos').textContent     = `(${ads.length})`;
  document.getElementById('cntDisponible').textContent = `(${ads.filter(a => a.disponible === 1).length})`;
  document.getElementById('cntVendido').textContent    = `(${ads.filter(a => a.disponible === 0).length})`;

  // Control de estado vacio
  if (filtered.length === 0) {
    list.innerHTML = '';
    noAds.classList.remove('d-none');
    return;
  }
  noAds.classList.add('d-none');

  // Renderizado optimizado usando map() y join()
  list.innerHTML = filtered.map(ad => `
    <div class="ad-row ${ad.disponible === 1 ? '' : 'sold'}" id="adRow-${ad.id_anuncio}">

      <!-- Imagen -->
      <img class="ad-img"
           src="${ad.foto_url}"
           alt="${ad.titulo}"
           onerror="this.src='../IMG/books.png'"/>

      <!-- Info -->
      <div class="ad-info">
        <div class="ad-title">${ad.titulo}</div>
        <div class="ad-meta">
        Autor: ${ad.autor} &bull; Edición: ${ad.edicion || 'N/A'} &bull; Materia: ${ad.materia}
        </div>
        <div class="ad-bottom">
          <span class="badge-${ad.condicion === 1 ? 'nuevo' : 'usado'}">
          ${ad.condicion === 1 ? 'Nuevo' : 'Usado'}
          </span>
          <span class="ad-date">
          Publicado el ${new Date(ad.fecha).toLocaleDateString('es-VE')}
          </span>
        </div>
      </div>

      <!-- Acciones -->
      <div class="ad-actions">
        <!-- Chip de estado -->
        <div class="status-chip ${ad.disponible === 1 ? 'disponible' : 'vendido'}">
          <span class="chip-dot"></span>
          ${ad.disponible === 1 ? 'Disponible' : 'Vendido'}
        </div>

        <!-- Toggle -->
        <label class="toggle-switch" 
            title="${ad.disponible === 1 ? 'Marcar como vendido' : 'Marcar como disponible'}">
          <input type="checkbox" 
              ${ad.disponible === 1 ? 'checked' : ''} 
              onchange="toggleEstado(${ad.id_anuncio}, this.checked)"/>
          <span class="toggle-track"></span>
        </label>

        <!-- Editar -->
        <button class="btn-ad btn-ad-edit" onclick="abrirEditarAnuncio(${ad.id_anuncio})">
          <i class="bi bi-pencil"></i> Editar
        </button>

        <!-- Eliminar -->
        <button class="btn-ad btn-ad-delete" onclick="pedirEliminar(${ad.id_anuncio})">
          <i class="bi bi-trash"></i> Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────
   Interacciones de UI (Pestañas)
───────────────────────────────── */
// Cambia el enfoque de la vista activa y actualiza la vista
function filterTab(tab, el) {
  activeTab = tab;
  // limpia el estado activo de todos los botones y se lo asigna al seleccionado
  document.querySelectorAll('.ads-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAds();
}

/* ─────────────────────────────────
   Toggle disponible / vendido, PATCH /api/anuncios/:id/disponibilidad
───────────────────────────────── */
// Envia una peticion de actualizacion parcial para alterar de venta del anuncio
// id: identificador interno del anuncio, checked: booleano que indica si es vendido o no
async function toggleEstado(id, checked) {
  try {
    const res = await fetch(`/api/anuncios/${id}/disponibilidad`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: checked })
    });

    if (!res.ok) {
      alert('Error al actualizar la disponibilidad.');
      return;
    }

    //Actualizar el caché local para reflejar cambios local para no recargar todo
    const ad = ads.find(a => a.id_anuncio === id);
    if (ad) ad.disponible = checked ? 1 : 0;

    renderAds(); // Actualiza la vista
    showToast(`Anuncio marcado como ${checked ? 'Disponible' : 'Vendido'}.`);

} catch (error){
  console.error('Error al actualizar disponibilidad', error);
  }
}

/* ─────────────────────────────────
   Editar perfil, PUT /api/usuarios/:id
───────────────────────────────── */
// LLena los campos del formulario de edición del perfil extrayendo los datos en memoria
function abrirEditarPerfil() {
  document.getElementById('editNombre').value      = usuarioActivo.nombre_completo;
  document.getElementById('editEmailLocked').textContent = usuarioActivo.email;
  document.getElementById('editTelefono').value    = usuarioActivo.telefono;
  
  //Seleccionar la carrera actual
  const sel = document.getElementById('editCarrera');
  sel.value = usuarioActivo.id_carrera;

  new bootstrap.Modal(document.getElementById('modalEditPerfil')).show();
}

// escucha el envio del formulario de edición, actualiza el backend y recarga la vista
 document.getElementById('editPerfilForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const nombre = document.getElementById('editNombre').value.trim();
  const telefono = document.getElementById('editTelefono').value.trim();
  const id_carrera = document.getElementById('editCarrera').value;

  try {
    const res = await fetch(`/api/usuarios/${usuarioActivo.id_usuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_completo: nombre, telefono, id_carrera})
    });

    const data = await res.json();

    if(!res.ok) {
      alert(data.error || 'Error al actualizar el perfil.');
      return;
    }

    // Actualizar el sessionStorage con los nuevos datos
    usuarioActivo.nombre_completo = nombre;
    usuarioActivo.telefono = telefono;
    usuarioActivo.id_carrera = id_carrera;
    sessionStorage.setItem('usuario', JSON.stringify(usuarioActivo));

    //recargar el perfil para mostrar el nombre de carrera actual
    await cargarPerfil();

    bootstrap.Modal.getInstance(document.getElementById('modalEditPerfil')).hide();
    showToast('Perfil actualizado correctamente.');
  
  } catch (error) {
    console.error('Error al guardar perfil:', error);
  }
}); 


/* ─────────────────────────────────
   Editar anuncio, PUT /api/anuncios/:id
───────────────────────────────── */
// Rellena el formulario multipart evaluando los datos locales del libro
function abrirEditarAnuncio(id) {
  const ad = ads.find(a => a.id_anuncio === id);
  if (!ad) return;

  // Inyecta los datos en el formulario
  document.getElementById('editAdId').value       = id;
  document.getElementById('editAdTitulo').value   = ad.titulo;
  document.getElementById('editAdAutor').value    = ad.autor;
  document.getElementById('editAdEdicion').value  = ad.edicion || '';
  document.getElementById('editAdEstado').value = ad.condicion === 1 ? 'Nuevo' : 'Usado';
  document.getElementById('editAdMateria').value   = ad.id_materia;

  // Construcción de la previsualización de la imagen actual alojada en el servidor
  const box   = document.getElementById('editPreviewBox');
  const input = box.querySelector('input[type=file]');
  
  box.innerHTML = '';
  const img = document.createElement('img');
  img.src = `${ad.foto_url}`;                              // URL de la imagen local
  img.onerror = () => { img.src = '../IMG/books.png'; };   // Si la imagen no existe, muestra el placeholder
  box.appendChild(img);
  box.appendChild(input);

  new bootstrap.Modal(document.getElementById('modalEditAd')).show();
}

// Procesa en cliente la imagen nueva subida y genera la previsualización
function previewEditImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen supera el límite de 10 MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const box   = document.getElementById('editPreviewBox');
    const input = box.querySelector('input[type=file]');
    box.innerHTML = '';
    const img = document.createElement('img');
    img.src = e.target.result;
    box.appendChild(img);
    box.appendChild(input);
  };
  reader.readAsDataURL(file);
}

// Escucha el envio del formulario de edición
// Empaqueta los datos en un FormData para compatibilidad con Multer
document.getElementById('editAnForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id     = document.getElementById('editAdId').value;
  const titulo = document.getElementById('editAdTitulo').value.trim();
  const autor  = document.getElementById('editAdAutor').value.trim();
  const id_materia = document.getElementById('editAdMateria').value;
  const condicion = document.getElementById('editAdEstado').value;
  const edicion = document.getElementById('editAdEdicion').value.trim();
  const foto = document.getElementById('editFotoInput').files[0];

  if (!titulo || !autor || !id_materia || !condicion) { 
    alert('Completa todos los campos obligatorios.'); 
    return; }

  // Estructura de datos (Texto e Imagen)
  const formData = new FormData();
  formData.append('titulo', titulo);
  formData.append('autor', autor);
  formData.append('id_materia', id_materia);
  formData.append('edicion', edicion);
  formData.append('condicion', condicion);
  
  // Condicional: Solo anexa el campo si el usuario selecciona una imagen nueva
  if (foto) formData.append('foto', foto);

  try {
    const res = await fetch(`/api/anuncios/${id}`, {
      method: 'PUT',
      body: formData                                   // API Fetch asume automaticamen los headers boundary multipart
    });
    
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al actualizar el anuncio.');
      return;
    }
  
    bootstrap.Modal.getInstance(document.getElementById('modalEditAd')).hide();
    await cargarAnuncios(); //recargar desde el servidor
    showToast('Anuncio actualizado correctamente.');
  
  } catch (error) {
    console.error('Error al editar anuncio:', error);
  }
});

/* ─────────────────────────────────
   Eliminar anuncio, DELETE /api/anuncios/:id
───────────────────────────────── */
// Pedir al usuario que confirme la eliminación del anuncio
function pedirEliminar(id) {
  const ad = ads.find(a => a.id_anuncio === id);
  if (!ad) return;
  
  pendingDelete = id;  // Guarda el ID del anuncio para confirmar la eliminación
  document.getElementById('deleteAdName').textContent = `"${ad.titulo}"`;
  new bootstrap.Modal(document.getElementById('modalDelete')).show();
}

// Ejecuta la llamada a la API para efectuar el borrado logico
async function confirmarEliminar() {
  try {
    const res = await fetch(`/api/anuncios/${pendingDelete}`, {
      method: 'DELETE'  // Notifica al backend que se quiere borrar el anuncio
    });

    if (!res.ok){
      alert('Error al eliminar el anuncio.');
      return;
    }

    pendingDelete = null;  // Limpia el ID del anuncio para que no se confirme otra vez
    bootstrap.Modal.getInstance(document.getElementById('modalDelete')).hide();
    
    await cargarAnuncios();  // Recarga la vista
    new bootstrap.Toast(document.getElementById('toastEliminado')).show();

  } catch (error) {
    console.error('Error al eliminar anuncio', error);
  }
}

/* ─────────────────────────────────
   Toast general
───────────────────────────────── */
// Dispara el componente toast con el mensaje
function showToast(msg) {
  document.getElementById('toastMsg').textContent = msg;
  new bootstrap.Toast(document.getElementById('toastGuardado')).show();
}

/* ─────────────────────────────────
   Dropdown Mi Perfil
───────────────────────────────── */
function toggleDropdown() {
  document.getElementById('profileDropdown').classList.toggle('open');
}

// Cierra el menú desplegable al hacer clic fuera
document.addEventListener('click', function(e) {
  const wrapper = document.querySelector('.profile-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('profileDropdown').classList.remove('open');
  }
});

/* ─────────────────────────────────
   Arrancar
───────────────────────────────── */
inicializar();
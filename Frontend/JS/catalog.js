/* ─────────────────────────────────
   Verificar sesión
───────────────────────────────── */
const usuarioActivo = obtenerUsuario();

/* ─────────────────────────────────
  Estado de la aplicacion
───────────────────────────────── */
let allBooks = [];
let visibleBooks = [];

/* ─────────────────────────────────
  Cargar anuncios
───────────────────────────────── */
async function cargarAnuncios() {
  try {
    const res = await fetch('http://localhost:3000/api/anuncios');
    allBooks = await res.json();
    visibleBooks = [...allBooks];
    sortBooks();
  } catch (error) {
    console.error('Error al cargar anuncios:',)
  }
}

/* ─────────────────────────────────
    Cargar materias dinamicamente desde la BD
    tanto para el filtro lateral como para el modal
───────────────────────────────── */
async function cargarMaterias() {
  try {
    const res = await fetch('http://localhost:3000/api/materias');
    const materias = await res.json();

    // los dos selects que necesitan las materias
    const selects = [
      document.getElementById('filterMateria'),
      document.getElementById('aMateria')
    ];

    selects.forEach(select => {
      materias.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id_materia;
        opt.textContent = m.nombre;
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
function renderBooks(books) {
  const grid     = document.getElementById('booksGrid');
  const noResult = document.getElementById('noResults');

  if (books.length === 0) {
    grid.innerHTML = '';
    noResult.classList.remove('d-none');
    return;
  }
  noResult.classList.add('d-none');

  grid.innerHTML = books.map(b => `
    <div class="book-card">
      <div class="book-img-wrapper">
        <img src="http://localhost:3000/api/${b.foto_url}" alt="${b.titulo}" onerror="this.src='IMG/books.png'"/>
        <span class="badge-estado badge-${b.condicion === 1 ? 'nuevo' : 'usado'}">${b.condicion === 1 ? 'Nuevo' : 'Usado'}</span>
      </div>
      <div class="book-body">
        <div class="book-title">${b.titulo}</div>
        <div class="book-author">${b.autor}</div>
        <div class="book-edicion">${b.edicion || ''}</div>
        <div class="book-materia">${b.materia}</div>
        <a href="https://wa.me/58${b.telefono.replace(/^0/,'')}?text=${encodeURIComponent('Hola, vi tu anuncio de "' + b.titulo + '" en U-Books y me interesa.')}"
           class="btn-contacto" target="_blank" rel="noopener">
          Ver contacto <i class="bi bi-whatsapp wa-icon"></i>
        </a>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────
   Filtrar/Normalizar texto
───────────────────────────────── */
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
function filterBooks() {
  const query   = limpiarTexto(document.getElementById('searchInput').value);
  const materia = document.getElementById('filterMateria').value;
  const nuevo   = document.getElementById('chkNuevo').checked;
  const usado   = document.getElementById('chkUsado').checked;

  visibleBooks = allBooks.filter(b => {
    const matchSearch  = !query || limpiarTexto(b.titulo).includes(query) || limpiarTexto(b.autor).includes(query);
    const matchMateria = !materia || b.materia === parseInt(materia);
    const matchEstado  = (!nuevo && !usado) || (nuevo && b.condicion === 1) || (usado && b.condicion === 0);
    return matchSearch && matchMateria && matchEstado;
  });

  sortBooks();
}

/* ─────────────────────────────────
   Ordenar
───────────────────────────────── */
function sortBooks() {
  const sort = document.getElementById('sortSelect').value;
  const copy = [...visibleBooks];

  if (sort === 'az') copy.sort((a,b) => a.titulo.localeCompare(b.titulo));
  else if (sort === 'za') copy.sort((a,b) => b.titulo.localeCompare(a.titulo));
  else copy.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  renderBooks(copy);
}

/* ─────────────────────────────────
   Limpiar filtros
───────────────────────────────── */
function clearFilters() {
  document.getElementById('searchInput').value    = '';
  document.getElementById('filterMateria').value  = '';
  document.getElementById('chkNuevo').checked     = false;
  document.getElementById('chkUsado').checked     = false;
  visibleBooks = [...allBooks];
  sortBooks();
}

/* ─────────────────────────────────
   Dropdown Mi Perfil
───────────────────────────────── */
function toggleDropdown() {
  document.getElementById('profileDropdown').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const wrapper = document.querySelector('.profile-wrapper');
  if (wrapper &&!wrapper.contains(e.target)) {
    document.getElementById('profileDropdown').classList.remove('open');
  }
});



/* ─────────────────────────────────
   Modal Crear Anuncio - preview image
───────────────────────────────── */
function togglePublish() {
  const checked = document.getElementById('terminosAnuncio').checked;
  document.getElementById('btnPublicar').disabled = !checked;
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño (10 MB = 10 * 1024 * 1024)
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen supera el límite de 10 MB.');
    event.target.value = '';
    return;
  }

  // Cargar imagen
  const reader = new FileReader();
  reader.onload = function(e) {
    const box = document.getElementById('previewBox');
    // Eliminar contenido previo excepto el input
    const input = box.querySelector('input[type=file]');
    box.innerHTML = '';
    const img = document.createElement('img');
    img.src = e.target.result;
    box.appendChild(img);
    box.appendChild(input);
  };
  reader.readAsDataURL(file);
}

/* ─────────────────────────────────
   Publicar anuncio, POST /api/anuncios
───────────────────────────────── */
function publicarAnuncio() {
  const titulo  = document.getElementById('aTitulo').value.trim();
  const autor   = document.getElementById('aAutor').value.trim();
  const id_materia = document.getElementById('aMateria').value;
  const edicion = document.getElementById('aEdicion').value.trim();
  const condicion = document.getElementById('aEstado').value;
  const foto  = document.getElementById('fotoInput').files[0];

  if (!titulo || !autor || !id_materia || !condicion || !foto) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  // Construir el formData (necesario para enviar la imagen)
  const formData = new FormData();
  formData.append('id_usuario', usuarioActivo.id_usuario);
  formData.append('titulo', titulo);
  formData.append('autor', autor);
  formData.append('id_materia', id_materia);
  formData.append('edicion', edicion);
  formData.append('condicion', condicion);
  formData.append('foto', foto);

  // Enviar anuncio
  try {
    const res = await fetch('http://localhost:3000/api/anuncios', {
      method: 'POST',
      body: formData //sin Content-type, el navegador lo arma solo para formdata
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al publicar el anuncio.');
      return;
    }

    // Cerrar modal, limpiar y recargar anuncios 
    bootstrap.Modal.getInstance(document.getElementById('modalAnuncio')).hide();
    resetModal();
    await cargarAnuncios(); //recarga los datos actualizados

    // Mostrar toast
    const toast = new bootstrap.toast(document.getElementById('toastPublicado'));
    toast.show();
  
  } catch (error) {
    console.error('Error al publicar el anuncio:', error);
  }
}

/* ─────────────────────────────────
   Limpiar modal al cerrarlo
───────────────────────────────── */
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
  box.innerHTML = `
    <i class="bi bi-cloud-arrow-up" style="font-size:1.8rem;"></i>
    <span>Haz clic para subir una imagen (máx. 10 MB)</span>
  `;
  box.appendChild(input);
  input.value = '';
}

document.getElementById('modalAnuncio').addEventListener('hidden.bs.modal', resetModal);

/* ─────────────────────────────────
   Carga inicial
───────────────────────────────── */
cargarMaterias();
CargarAnuncios();

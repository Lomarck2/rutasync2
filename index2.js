//Variables Globales
let map, directionsService, directionsRenderer;
let puntoOrigen, puntoDestino;
var paradaDestino, paradaOrigen;
var busStations;
var ubicacionLatLng;
var origenLatLng, destinoLatLng;
var lstParadasRutasO=[], lstParadasRutasD=[];
var listaParadasEnRuta = [];
var rutaSeleccionada;
var wps, listaMarcadores = [];

//Inicializacion del mapa
function initMap(lat = 20.986550, lng = -101.285437) {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat, lng },
    zoom: 14
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
}
//Ubicacion del usuario
function mostrarUbicacionUsuario() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const latlng = new google.maps.LatLng(lat, lng);
      ubicacionLatLng = {lat:lat, lng:lng};
      origenLatLng = {lat:lat, lng:lng};
      initMap(lat, lng);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          document.getElementById('origen').value = results[0].formatted_address;
          puntoOrigen = latlng;
          new google.maps.Marker({
            position: latlng,
            map: map,
            title: "Tu ubicación"
          });
        }
      });
    }, () => {
      alert("No se pudo obtener tu ubicación");
      initMap();
    });
  } else {
    alert("Geolocalización no es compatible con este navegador.");
    initMap();
  }
}

function abrirChat() {
  const mensaje = prompt("Escribe tu mensaje para soporte:");
  if (mensaje) alert("Mensaje enviado: " + mensaje);
}

    function mostrarRecorridos() {
      const guardados = JSON.parse(localStorage.getItem("recorridos") || "[]");
      if (guardados.length === 0) {
        alert("No hay recorridos guardados.");
        return;
      }
      alert("Recorridos guardados:\n" + guardados.map((r, i) => `${i + 1}. ${r}`).join("\n"));
    }

    function actualizarReloj() {
      const ahora = new Date();
      const tiempo = ahora.toLocaleTimeString();
      document.getElementById("time").textContent = tiempo;
    }
//Menu 
function toggleMenu() {
  const section = document.getElementById('card-section');
  section.style.display = section.style.display === 'flex' ? 'none' : 'flex';
}
function togglePanel() {
  const panel = document.getElementById('panel');
  panel.classList.toggle('hidden');
}

//-----------------REVISAR CODIGO
    function trazarRuta() {
      if (!puntoOrigen || !puntoDestino) {
        alert("Selecciona origen y destino correctamente.");
        return;
      }

const request = {
  origin: puntoOrigen,
  destination: puntoDestino,
  travelMode: 'DRIVING'
};

      directionsService.route(request, function(result, status) {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);

          const resumen = `${document.getElementById('origen').value} -> ${document.getElementById('destino').value}`;
          const anteriores = JSON.parse(localStorage.getItem("recorridos") || "[]");
          anteriores.push(resumen);
          localStorage.setItem("recorridos", JSON.stringify(anteriores));

        } else {
          alert("No se pudo trazar la ruta: " + status);
        }
      });
    }
//-----------------FIN REVISAR CODIGO

//document.getElementById('btn-ubicacion').addEventListener('click', mostrarUbicacionUsuario);
//setInterval(actualizarReloj, 1000);

//Inicializacion de Auto Complete
function initApp() {
  mostrarUbicacionUsuario();
  const inputOrigen = document.getElementById("origen");
  const inputDestino = document.getElementById("destino");
  const autocompleteOrigen = new google.maps.places.Autocomplete(inputOrigen);
  autocompleteOrigen.setFields(["geometry", "name"]);
  autocompleteOrigen.addListener("place_changed", () => {
    const place = autocompleteOrigen.getPlace();
    if (!place.geometry) return;
    puntoOrigen = place.geometry.location;
  });
  const autocompleteDestino = new google.maps.places.Autocomplete(inputDestino);
  autocompleteDestino.setFields(["geometry", "name"]);
  autocompleteDestino.addListener("place_changed", () => {
    const place = autocompleteDestino.getPlace();
    if (!place.geometry) return;
    puntoDestino = place.geometry.location; 
    destinoLatLng = str2Position(puntoDestino.toString());
    paradaDestino = str2Position(puntoDestino.toString());
  });
}

function initApp2() {
  mostrarUbicacionUsuario();
  const inputOrigen = document.getElementById("origen");  
  const inputDestino = document.getElementById("destino");
  const autocompleteOrigen = new google.maps.places.PlaceAutocompleteElement({
    inputElement: inputOrigen,
  });
  
//   autocompleteOrigen.addEventListener('gmp-select', async ({ placePrediction }) => {
//     const place = placePrediction.toPlace();
//     await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
//     console.log(place);
//   });
}
//-------------Convertir de location a lista (string)
function str2Position(cad){
    let vals = cad.toString().split(",");
    let lat2 = Number(vals[0].substring(1).trim()); 
    let dos = vals[1].trim();
    let lng2 = Number(dos.substring(0,dos.length-1));
    return {lat:lat2, lng:lng2};
}
//---------Funcion para calcular la parada mas cercana a la posicion en la ruta
function paradaDestinoMasCercana(pos,rut){
  let lstParadaCercanas = [];    
  var i, j, tam = busStations.length, dist;
  let paradaCercana1 = null;
  let menorDistancia = Infinity;
  var paradas = busStations[rut]["Estaciones"];
  for (const parada of paradas) {                       
    var busStation = new google.maps.LatLng({lat: parada.lat, lng: parada.lng});
    const distancia = google.maps.geometry.spherical.computeDistanceBetween(pos, busStation);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      paradaCercana1 = parada;
      dist = distancia;
    }
  } 
  return paradaCercana1;
}
//Funcion principal que busca las rutas mas cercanas de la ubicacion origen a la ubicacion 
//destino, obteniendo las paradas mas cercanas al origen, y las paradas mas cercanas al destino
//en cada ruta en el sentido correcto
function buscarRutas(){  
  var pmcOrigen  = paradasMasCercanas(origenLatLng,0);
  var pmcDestino = paradasMasCercanas(destinoLatLng,1);
  var i, tam = pmcOrigen.length;
  var paradas;
  for(i=0; i<tam; i++){
    paradas = busStations[i]['Estaciones'];
    const i1 = paradas.findIndex((p) => p["nombre"] == pmcOrigen[i]["nombre"]);
    const i2 = paradas.findIndex((p) => p["nombre"] == pmcDestino[i]["nombre"]);

    if(i1 <= i2){ //Si esta en el sentido
        var elemento = {
            "origenLat" : origenLatLng['lat'] ,"origenLng" : origenLatLng['lng'],
            "destinoLat": destinoLatLng['lat'],"destinoLng": destinoLatLng['lng'],
            "i1" : i1, "i2" : i2,
            "pmcOrigenLat"  : pmcOrigen[i]['lat'] ,"pmcOrigenLng"  : pmcOrigen[i]['lng'] ,
            "pmcDestinoLat" : pmcDestino[i]['lat'],"pmcDestinoLng" : pmcDestino[i]['lng'],
            "ruta" : i
        };
        listaParadasEnRuta.push(elemento);
    }
  }
  cargarComboRutas(listaParadasEnRuta);
  //Se dibujan las paradas cercadas al origen 
  dibuMapa()
}
//Funcion que obtine una lista de paradas mas cercanas en TODAS las rutas
function paradasMasCercanas(pos){
  let lstParadaCercanas = [];    
  var i, j, tam = busStations.length, dist;
  for(i=0; i<tam; i++){
    let paradaCercana1 = null;
    let menorDistancia = Infinity;
    var paradas = busStations[i]["Estaciones"];   
    j=0;
    for (const parada of paradas) {                       
      var busStation = new google.maps.LatLng({lat: parada.lat, lng: parada.lng});
      const distancia = google.maps.geometry.spherical.computeDistanceBetween(pos, busStation);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        paradaCercana1 = parada;
        ++j;
        dist = distancia;
      }
    }
    if(paradaCercana1 != null){
      lstParadaCercanas.push(paradaCercana1);
    }
  }    
  return lstParadaCercanas;
}
//Se carga el select html de rutas.
function cargarComboRutas(listaParadas){
    var i, tam = listaParadas.length;
    var rut;
    var combo = document.getElementById('cmbRutas');
    $('#cmbRutas').children().remove().end();
    for(i=0; i<tam; i++){
        rut = listaParadas[i]['ruta'];
        var opt = document.createElement("option");
        opt.value= i;
        opt.innerHTML = busStations[rut]['Ruta']; 
        combo.appendChild(opt);
    } 
}
//Se dibuja el mapa con los marcadores de paradas origen y ubicacion destino
function dibuMapa(){
    var tam = listaParadasEnRuta.length;
    var mapProp = {
        center : new google.maps.LatLng(ubicacionLatLng.lat, ubicacionLatLng.lng),
        zoom : 15,
        mapId : "miMapa",
    };
    map = new google.maps.Map(document.getElementById("map"),mapProp);
    marker = makeMarker2( origenLatLng,0,[],-1,'Posicion Actual' );
    for(i=0; i<tam; i++){
        var newLatLng = {lat:listaParadasEnRuta[i]['pmcOrigenLat'],lng:listaParadasEnRuta[i]['pmcOrigenLng']};        
        //marker = makeMarker2( newLatLng,2,listaParadasEnRuta[i],i,"Origen");
        marker = makeMarkerIcono(newLatLng,0,"",listaParadasEnRuta[i],i);

        var newLatLng2 = {lat:listaParadasEnRuta[i]['pmcDestinoLat'],lng:listaParadasEnRuta[i]['pmcDestinoLng']};   
        marker = makeMarker2( newLatLng2,2,listaParadasEnRuta[i],i,'Destino');
    }
}
//Funcion que crea un marcador personalizado con iconos y texto de titulo
function makeMarkerIcono(posicion,tipo,texto,paradaER,indice) {
    const Img = document.createElement("img");
    switch(tipo){
      case 0: 
        //Img.src = "Imagenes/bus3.svg";
        Img.src = "Imagenes/bus-stop-location-icon.png";
        Img.style.width = "45px";
        Img.style.height = "45px";
        break;
      case 1:
        //Img.src = "Imagenes/bus_station.png";
        Img.src = "Imagenes/camionsitooo.png";
        Img.style.width = "35px";
        Img.style.height = "35px";
        break;
      case 2:
        //Img.src = "Imagenes/bus_station.png";
        Img.src = "Imagenes/bus-location.png";
        Img.style.width = "35px";
        Img.style.height = "35px";
        break;      
    }
    var marcador = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: posicion,
      title: texto,
      content: Img,      
    });
    if(tipo == 0 ){ //si es tipo 2 se habilita el click sobre el mismo
        marcador.addListener("click", () => {
            clickMarcador2(paradaER,indice);
        });
    }
    return marcador;
}
//Funcion que crea un marcador personalizado de colores distintos
//Tipo 0 Ubicacion origen
//Tipo 1 Paradas intermedias
//Tipo 2 Parada de origen
//Tipo 3 Parada destino
function makeMarker2( posicion,tipo,paradaER,indice,texto ) {
    let pos = posicion;
    let pinBackground;

    switch(tipo){
      case 0:
        pinBackground = new google.maps.marker.PinElement({
          background: "#FF0000",
        });
        break;
      case 1:
        pinBackground = new google.maps.marker.PinElement({
          background: "#FBBC04",
        });
        break;
      case 2:
        pinBackground = new google.maps.marker.PinElement({
          background: "#1500ffff",
        });        
        break;
      case 3:
        pinBackground = new google.maps.marker.PinElement({
          background: "#00ff0dff",
        });        
        break;   
    }        
    var marcador = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: pos,
      title: texto,
      content: pinBackground.element,
    });
    if(tipo == 2 ){ //si es tipo 2 se habilita el click sobre el mismo
        marcador.addListener("click", () => {
            clickMarcador2(paradaER,indice);
        });
    }
    return marcador
}
//Click del marcador de parada origen, que calcula la ruta entre paradas 
//destino y origen
function clickMarcador2(paradaER,indice){  
    let ruta = paradaER['ruta'];
    let paradas = busStations[ruta]['Estaciones'];
    let i1 = paradaER['i1'];
    let i2 = paradaER['i2'];    
    const subRuta = paradas.slice(i1, i2 + 1);
    var paraO = {lat:paradaER['pmcOrigenLat'] ,lng:paradaER['pmcOrigenLng']};        
    var paraD = {lat:paradaER['pmcDestinoLat'],lng:paradaER['pmcDestinoLng']};
    var combo = document.getElementById('cmbRutas');
    combo.options[indice].selected=true;
    borrarMarkers();
    mostrarParadaEnRuta(subRuta,paraO,paraD);
    rutaSeleccionada = ruta;
}
//Funcion que muestra en el mapa las paradas intermedias entre paradas origen y destino
function mostrarParadaEnRuta(paradas,paraO,paraD){    
  var rendererOptions = { 
    map : map,
    suppressMarkers: true
  };
  let directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
  var request;
  wps = paradas2WPS(paradas);
  var org = { lat: paraO["lat"], lng: paraO["lng"] };
  var dest = { lat: paraD["lat"], lng: paraD["lng"] };
  request = {
    origin: org,
    destination: dest,
    waypoints: wps,
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  };
  directionsService = new google.maps.DirectionsService();
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK){
      directionsDisplay.setDirections(response);
      var Legs = response.routes[0].legs;        
      //makeMarkerIcono(Legs[0].start_location,0);      
      if(Legs.length>2){      
        for(var i=1; i < Legs.length; i++){
          //console.log(Legs[i].start_location);
          //console.log(Legs[i].end_location);
          //console.log(Legs[i]);
          makeMarker2(Legs[i].start_location,1,[],-1,Legs[i].start_address);
        }
      }
      //makeMarkerIcono(Legs[Legs.length-1].end_location,1,"");
    }
    else
      alert ('failed to get directions');
    }
  );
}
//Convertir paradas(lat,lng) a WayPointS
function paradas2WPS(paradas){
    let tam = paradas.length, i;
    let wps = [];
    for(i=0; i<tam; i++){
      var p = new google.maps.LatLng(paradas[i]["lat"],paradas[i]["lng"]);
      var ele = {location: p};
      wps.push(ele);
    }
    return wps;
}
//onchange de cmbRutas
function rutasDestino(value){ 
  var indice = value;
  rutaSeleccionada = indice;
  clickMarcador2(listaParadasEnRuta[indice],indice);
}
//Borrar marcadores
function borrarMarkers(){
    dibuMapa();
}

function actualizarUbicacion(){
  var lat, lng;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      lat = position.coords.latitude;
      lng = position.coords.longitude;      
      ubicacionLatLng = {lat:lat, lng:lng};
      //origenLatLng = {lat:lat, lng:lng};  
    },() => {
      alert("No se pudo obtener tu ubicación");
      //initMap();
    });
    dibuMapa();

  } else {
    alert("Geolocalización no es compatible con este navegador.");
    //initMap();
  }
}
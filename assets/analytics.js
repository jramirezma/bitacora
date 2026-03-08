// cargar libreria de Google Analytics
var script = document.createElement("script");
script.async = true;
script.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX";
document.head.appendChild(script);

// configuracion
window.dataLayer = window.dataLayer || [];

function gtag(){
  dataLayer.push(arguments);
}

gtag("js", new Date());
gtag("config", "G-ZXFBB4KDTD");

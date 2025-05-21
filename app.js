const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const multer = require("multer");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use('/music', express.static('music'));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "slog",
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos: " + err.stack);
    return;
  }
  console.log("Conexión exitosa a la base de datos.");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Configuración de multer para archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public", "music"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'audio' && ext === ".mp3") {
    cb(null, true);
  } else if (file.fieldname === 'letra' && ext === ".txt") {
    cb(null, true);
  } else {
    cb(new Error("Extensión de archivo no permitida. Audio debe ser .mp3 y Letra debe ser .txt"));
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Rutas

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    (err, result) => {
      if (err) {
        console.error(err);
        res.send("Error al registrar el usuario");
        return;
      }
      res.redirect("/login");
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login", { user: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error(err);
        res.send("Error al verificar el usuario");
        return;
      }

      if (results.length > 0) {
        req.session.user = results[0];
        res.redirect("/");
      } else {
        res.send("Usuario o contraseña incorrectos");
      }
    }
  );
});

app.get("/", (req, res) => {
  if (req.session.user) {
    const user = req.session.user;

    db.query("SELECT * FROM canciones", (err, canciones) => {
      if (err) {
        console.error("Error:", err);
        res.send("Error cargando las canciones");
        return;
      }
      if (user.rol === "admin") {
        res.render("index", { user, canciones });
      } else {
        res.render("usuario", { user, canciones });
      }
    });
  } else {
    res.render("home");
  }
});

app.get('/agregar', (req, res) => {
  res.render('agregar');
});

app.post("/agregar", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "letra", maxCount: 1 }
]), (req, res) => {
  const { nombre, artista, genero } = req.body;

  if (!req.files || !req.files["audio"] || !req.files["letra"]) {
    return res.send("Debes subir un archivo de audio y un archivo de letra.");
  }

  const audioFile = "music/" + req.files["audio"][0].filename;
  const letraFile = "music/" + req.files["letra"][0].filename;

  db.query(
    "INSERT INTO canciones (nombre, artista, genero, archivo, archivo_letra) VALUES (?, ?, ?, ?, ?)",
    [nombre, artista, genero, audioFile, letraFile],
    (err, result) => {
      if (err) {
        console.error("Error al guardar la canción:", err);
        return res.send("Ocurrió un error al guardar la canción: " + err.message);
      }
      res.redirect("/");
    }
  );
});

app.get('/editar/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM canciones WHERE id = ?';

db.query(query, [id], (error, resultados) => {
    if (error) {
      return res.status(500).send('Error al obtener la canción');
    }
    if (resultados.length === 0) {
      return res.status(404).send('Canción no encontrada');
    }

    res.render('editar', { cancion: resultados[0] });
  });
});



app.post('/editar/:id', upload.fields([{ name: 'audio' }, { name: 'letra' }]), (req, res) => {
  const id = req.params.id;
  const { nombre, artista, genero } = req.body;

  let query = 'UPDATE canciones SET nombre = ?, artista = ?, genero = ?';
  const valores = [nombre, artista, genero];

  // Verificar si se subió un nuevo archivo de audio
  if (req.files && req.files.audio && req.files.audio.length > 0) {
    query += ', archivo = ?';
    valores.push(req.files.audio[0].filename); // o .originalname si prefieres
  }

  // Verificar si se subió un nuevo archivo de letra
  if (req.files && req.files.letra && req.files.letra.length > 0) {
    query += ', archivo_letra = ?';
    valores.push(req.files.letra[0].filename);
  }

  query += ' WHERE id = ?';
  valores.push(id);

db.query(query, valores, (error, resultado) => {
    if (error) {
      console.error('Error al actualizar:', error);
      return res.status(500).send('Error al actualizar la canción');
    }
    res.redirect('/');
  });
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("No se pudo cerrar sesión");
    }
    res.redirect("/login");
  });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

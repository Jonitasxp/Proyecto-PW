const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
const PORT = 3000;
app.use(express.static(path.join(__dirname, "public")));

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

    if (user.rol === "admin") {
      db.query("SELECT * FROM canciones", (err, canciones) => {
        if (err) {
          console.error("Error:", err);
          res.send("Error cargando las canciones");
          return;
        }
        res.render("index", { user, canciones }); // vista del admin
      });

    } else {
      db.query("SELECT * FROM canciones", (err, canciones) => {
        if (err) {
          console.error("Error:", err);
          res.send("Error cargando las canciones");
          return;
        }
        res.render("usuario", { user, canciones }); // vista del usuario
      });
    }

  } else {
    res.render("home"); // no ha iniciado sesión
  }
});


app.get("/agregar", (req, res) => {
  if (req.session.user) {
    res.render("agregar");  
  } else {
    res.redirect("/login");  
  }
});



app.post("/agregar", (req, res) => {
  const { nombre, artista, genero } = req.body;

  db.query(
    "INSERT INTO canciones (nombre, artista, genero) VALUES (?, ?, ?)",
    [nombre, artista, genero],
    (err, result) => {
      if (err) {
        console.error("Error al guardar la canción:", err);
        res.send("Ocurrió un error al guardar la canción.");
        return;
      }
      res.redirect("/");  
    }
  );
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

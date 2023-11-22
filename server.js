const express = require("express");
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");
const qrcode = require("qrcode");
const { authenticator } = require("otplib");

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Manchester83!',
  database: 'AuthUsers',
});

// Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

const app = express();
app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json())

app.get("/login", async (req, res) => {
  try {
    const { id, password, code } = req.query;

    // Execute an SQL query to fetch user data
    const sql = 'SELECT id, password, two_factor_enabled, two_factor_secret FROM users WHERE username = ?';
    connection.query(sql, [id], (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        return res.status(500).send({ error: "Database error" });
      }

      const user = results[0];

      if (!user) {
        return res.status(500).send({ error: "User not found" });
      }

      const secretKey = 'Activity21';
      // Create an AES decipher
      const decipher = crypto.createDecipher('aes-256-cbc', secretKey);

      // Decrypt the stored password
      let decryptedPassword = decipher.update(user.password, 'hex', 'utf8');
      decryptedPassword += decipher.final('utf8');

      if (decryptedPassword !== password) {
        return res.status(500).send({ error: "Invalid credentials" });
      }

      if (user.two_factor_enabled) {
        if (!code) {
          return res.send({ codeRequested: true });
        }

        const verified = authenticator.check(code, user.two_factor_secret);
        if (!verified) {
          return res.status(500).send({ error: "Invalid 2FA code" });
        }
      }

      return res.cookie("id", id).send({ success: true });
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server error" });
  }
});

const crypto = require('crypto'); // Import the crypto module

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate the incoming data
    if (!username || !password) {
      return res.status(400).send({ error: "Username and password are required" });
    }

    // Secret key for encryption (keep this secure)
    const secretKey = 'Activity21';

    // Create an AES cipher
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);

    // Encrypt the password
    let encryptedPassword = cipher.update(password, 'utf8', 'hex');
    encryptedPassword += cipher.final('hex');

    const insertSql = 'INSERT INTO users (username, password, two_factor_enabled) VALUES (?, ?, 0)';
    connection.query(insertSql, [username, encryptedPassword], (error, results) => {
      if (error) {
        console.log('Error executing query:', error);
        return res.status(500).send({ error: "Database error" });
      }

      return res.status(201).send({ success: "User registered successfully" });
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server error" });
  }
});




// generater QR Image
app.get("/qrImage", async (req, res) => {
  try {
    const { id } = req.cookies;

    // Execute an SQL query to fetch user data, including the 2FA-related information
    const sql = 'SELECT id, two_factor_secret, two_factor_temp_secret FROM users WHERE username = ?';
    connection.query(sql, [id], async (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        return res.status(500).send({ success: false });
      }

      const user = results[0];

      if (!user) {
        return res.status(500).send({ success: false });
      }

      // Generate a QR image based on the user's data
      const secret = user.two_factor_temp_secret || authenticator.generateSecret();
      const uri = authenticator.keyuri(id, "Activity 21 2FA Users", secret);
      const image = await qrcode.toDataURL(uri);

      // Update the temporary secret in the database
      if (!user.two_factor_temp_secret) {
        const updateSql = 'UPDATE users SET two_factor_temp_secret = ? WHERE id = ?';
        connection.query(updateSql, [secret, user.id], (updateError) => {
          if (updateError) {
            console.error('Error updating temp secret:', updateError);
          }
        });
      }

      return res.send({
        success: true,
        image,
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ success: false });
  }
});


// set the 2 FA
app.get("/set2FA", async (req, res) => {
  try {
    const { id } = req.cookies;
    const { code } = req.query;

    // Execute an SQL query to fetch user data, including the two-factor related information
    const sql = 'SELECT id, two_factor_temp_secret FROM users WHERE username = ?';
    connection.query(sql, [id], (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        return res.status(500).send({ success: false });
      }

      const user = results[0];

      if (!user) {
        return res.status(500).send({ success: false });
      }

      const tempSecret = user.two_factor_temp_secret;

      const verified = authenticator.check(code, tempSecret);
      if (!verified) {
        return res.status(500).send({ success: false });
      }

      // Update the user's two-factor authentication status and secret in the database
      const updateSql = 'UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?';
      connection.query(updateSql, [tempSecret, user.id], (updateError) => {
        if (updateError) {
          console.error('Error updating 2FA status and secret:', updateError);
          return res.status(500).send({ success: false });
        }

        return res.send({
          success: true,
        });
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ success: false });
  }
});


// Check current session
app.get("/check", (req, res) => {
  const { id } = req.cookies;

  // Perform an SQL query to check if the user exists in the database
  const sql = 'SELECT username FROM users WHERE username = ?';
  connection.query(sql, [id], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return res.status(500).send({ success: false });
    }

    if (results.length > 0) {
      return res.send({
        success: true,
        id,
      });
    } else {
      return res.status(500).send({
        success: false,
      });
    }
  });
});

// Logout user
app.get("/logout", (req, res) => {
  res.clearCookie("id");
  res.send({
    success: true,
  });
});

app.listen(3000, () => {
  console.log("App is listening on port: 3000");
});

// connection.end((err) => {
//   if (err) {
//     console.error('Error closing MySQL connection:', err);
//   }
//   console.log('MySQL connection closed');
// });

